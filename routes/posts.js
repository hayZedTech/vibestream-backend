// routes/post.js
const express = require('express');
const router = express.Router();
const util = require('util');

const auth = require('../middleware/auth');
const parser = require('../config/multer'); // Multer + Cloudinary
const {
  getPosts,
  createPost,
  likePost,
  addComment,
  getUserPosts, // ✅ for profile feed
  deletePost    // ✅ delete controller
} = require('../controllers/postController');

// -------------------------
// debug middleware BEFORE multer
// -------------------------
function logIncoming(req, res, next) {
  console.log('--- Incoming request headers ---');
  console.log('content-type:', req.headers['content-type']);
  console.log('is multipart:', req.is('multipart/form-data'));
  next();
}

// -------------------------
// wrapper to call multer and catch upload errors
// -------------------------
function multerUploadMiddleware(req, res, next) {
  parser.single('image')(req, res, (err) => {
    if (err) {
      console.error('🔥 Multer/Upload error:', util.inspect(err, { depth: 4 }));
      return res.status(400).json({
        msg: 'Upload error',
        error: err.message || String(err),
      });
    }
    next();
  });
}

// -------------------------
// debug middleware AFTER multer
// -------------------------
function logAfterMulter(req, res, next) {
  console.log('--- after multer middleware ---');
  console.log('req.body:', util.inspect(req.body, { depth: 2 }));
  console.log('req.file:', util.inspect(req.file, { depth: 4 }));
  next();
}

// -------------------------
// Routes
// -------------------------

// ✅ Get all posts (with pagination)
// Example: GET /api/posts?page=1&limit=5
router.get('/', auth, getPosts);

// ✅ Get all posts by a specific user (with pagination)
// Example: GET /api/posts/user/:id?page=1&limit=5
router.get('/user/:id', auth, getUserPosts);

// Create post (text + optional image)
router.post(
  '/',
  auth,
  logIncoming,
  multerUploadMiddleware,
  logAfterMulter,
  createPost
);

// Like/unlike post
router.put('/:id/like', auth, likePost);

// Add comment
router.post('/:id/comment', auth, addComment);

// ✅ Delete post
router.delete('/:id', auth, deletePost);

module.exports = router;
