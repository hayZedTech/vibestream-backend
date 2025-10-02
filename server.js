// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const notificationRoutes = require('./routes/notifications');
const messageRoutes = require('./routes/messages');

// Import models
const Notification = require('./models/Notification');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Track online users by username
const onlineUsers = {}; // { username: socket.id }

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 UNHANDLED ERROR:', err);
  res.status(err.status || 500).json({
    msg: err.message || 'Internal Server Error',
    error: err.message || String(err),
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Helper: broadcast online users
function broadcastOnlineUsers() {
  io.emit('onlineUsers', Object.keys(onlineUsers));
}

// Socket.io events
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Join with username
  socket.on('join', (username) => {
    if (!username || typeof username !== 'string') return;
    onlineUsers[username] = socket.id;
    console.log(`👤 User joined: ${username} (${socket.id})`);
    broadcastOnlineUsers();
  });

  // New post
  socket.on('newPost', (post) => {
    socket.broadcast.emit('newPost', post);
  });

  // Like event
  socket.on('newLike', async ({ postId, fromUsername, toUsername }) => {
    const notif = { type: 'like', toUsername, fromUsername, postId, createdAt: new Date() };
    try {
      await Notification.create({ user: toUsername, type: 'like', fromUser: fromUsername, post: postId });
    } catch (e) {
      console.warn('Notification.create (like) failed:', e.message);
    }
    if (onlineUsers[toUsername]) io.to(onlineUsers[toUsername]).emit('notification', notif);
    socket.broadcast.emit('newLike', { postId, fromUsername });
  });

  // Comment event
  socket.on('newComment', async ({ postId, fromUsername, toUsername, text }) => {
    const notif = { type: 'comment', toUsername, fromUsername, postId, message: text, createdAt: new Date() };
    try {
      await Notification.create({ user: toUsername, type: 'comment', fromUser: fromUsername, post: postId, message: text });
    } catch (e) {
      console.warn('Notification.create (comment) failed:', e.message);
    }
    if (onlineUsers[toUsername]) io.to(onlineUsers[toUsername]).emit('notification', notif);
    socket.broadcast.emit('newComment', { postId, fromUsername, text });
  });

  // Follow event
  socket.on('follow', async ({ fromUsername, toUsername }) => {
    const notif = { type: 'follow', toUsername, fromUsername, createdAt: new Date() };
    try {
      await Notification.create({ user: toUsername, type: 'follow', fromUser: fromUsername });
    } catch (e) {
      console.warn('Notification.create (follow) failed:', e.message);
    }
    if (onlineUsers[toUsername]) io.to(onlineUsers[toUsername]).emit('notification', notif);
  });

  // Direct chat messages
  socket.on('chatMessage', async ({ fromUsername, toUsername, text }) => {
    if (!fromUsername || !toUsername || !text) return;

    let savedMsg = { fromUsername, toUsername, text, createdAt: new Date() };
    try {
      savedMsg = await Message.create({ fromUsername, toUsername, text });
    } catch (e) {
      console.warn('Message.create failed, fallback to in-memory:', e.message);
    }

    // Deliver to recipient
    if (onlineUsers[toUsername]) io.to(onlineUsers[toUsername]).emit('chatMessage', savedMsg);

    // Echo back to sender
    socket.emit('chatMessage', savedMsg);

    // Also notify recipient
    const notif = { type: 'message', toUsername, fromUsername, message: text, createdAt: new Date() };
    try {
      await Notification.create({ user: toUsername, type: 'message', fromUser: fromUsername, message: text });
    } catch (e) {
      console.warn('Notification.create (message) failed:', e.message);
    }
    if (onlineUsers[toUsername]) io.to(onlineUsers[toUsername]).emit('notification', notif);
  });

  // Disconnect
  socket.on('disconnect', () => {
    for (const [username, id] of Object.entries(onlineUsers)) {
      if (id === socket.id) {
        console.log('❌ User disconnected:', username);
        delete onlineUsers[username];
      }
    }
    broadcastOnlineUsers();
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
