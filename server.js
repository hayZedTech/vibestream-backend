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

// === Read allowed origins from env ===
// Provide either CLIENT_URL (single) or CLIENT_URLS (comma-separated)
const rawOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL || '';
const allowedOrigins = rawOrigins
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Helpful default during local development if nothing provided
if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173');
}

console.log('🔒 Allowed CORS origins:', allowedOrigins.length ? allowedOrigins : ['*']);

// === CORS options for Express ===
const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (mobile clients, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Not allowed by CORS
    const msg = `CORS policy violation: origin "${origin}" is not allowed.`;
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Apply cors middleware and ensure preflight is handled
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // enable pre-flight across-the-board

app.use(express.json());

// === Socket.io setup with same origins ===
const socketCorsOrigin = allowedOrigins.length ? allowedOrigins : '*';
const io = new Server(server, {
  cors: {
    origin: socketCorsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Track online users by username
const onlineUsers = {}; // { username: socket.id }

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 UNHANDLED ERROR:', err && err.message ? err.message : err);
  // If this was a CORS error, respond with 403 so client sees reason
  if (err && /CORS/i.test(err.message || '')) {
    return res.status(403).json({ msg: err.message || 'CORS error' });
  }
  res.status(err.status || 500).json({
    msg: err.message || 'Internal Server Error',
    error: err.message || String(err),
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
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
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
});
