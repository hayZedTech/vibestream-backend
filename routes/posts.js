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
  getUserPosts, 
  deletePost,   
  updatePost,   
  deleteComment, // ✅ already here
  updateComment // ✅ newly added
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
router.get('/', auth, getPosts);

// ✅ Get all posts by a specific user (with pagination)
router.get('/user/:id', auth, getUserPosts);

// ✅ Create post (text + optional image)
router.post(
  '/',
  auth,
  logIncoming,
  multerUploadMiddleware,
  logAfterMulter,
  createPost
);

// ✅ Like/unlike post
router.put('/:id/like', auth, likePost);

// ✅ Add comment
router.post('/:id/comment', auth, addComment);

// ✅ Delete post
router.delete('/:id', auth, deletePost);

// -------------------------
// Edit / Update post (multipart-safe)
// -------------------------
router.put(
  '/:id',
  auth,
  logIncoming,
  multerUploadMiddleware,
  logAfterMulter,
  updatePost
);

router.post(
  '/:id',
  auth,
  logIncoming,
  multerUploadMiddleware,
  logAfterMulter,
  updatePost
);

router.post(
  '/:id/edit',
  auth,
  logIncoming,
  multerUploadMiddleware,
  logAfterMulter,
  updatePost
);

router.put(
  '/:id/edit',
  auth,
  logIncoming,
  multerUploadMiddleware,
  logAfterMulter,
  updatePost
);

router.post(
  '/edit/:id',
  auth,
  logIncoming,
  multerUploadMiddleware,
  logAfterMulter,
  updatePost
);

// ✅ Delete a comment from a post
router.delete('/:postId/comments/:commentId', auth, deleteComment);

// ✅ Update a comment
router.put('/:postId/comments/:commentId', auth, updateComment);

module.exports = router;
