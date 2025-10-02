require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');

async function inspectDB() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Fetch all users
    const users = await User.find({});
    console.log('Users:');
    console.log(users);

    // Fetch all posts
    const posts = await Post.find({});
    console.log('Posts:');
    console.log(posts);

    // Disconnect
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (err) {
    console.error(err);
  }
}

inspectDB();
