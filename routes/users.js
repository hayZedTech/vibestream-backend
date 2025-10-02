const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const parser = require('../config/multer');
const {
  uploadAvatar,
  getUser,
  followUser,
  searchUsers,
  updateBio,
  updatePassword,
} = require('../controllers/userController');

// Search users
router.get('/search', authMiddleware, searchUsers);



// Upload / update avatar
router.put('/avatar', authMiddleware, parser.single('avatar'), uploadAvatar);

// Update bio
router.put('/bio', authMiddleware, updateBio);

// Update password
router.put('/password', authMiddleware, updatePassword);

// Follow / unfollow a user
router.put('/:id/follow', authMiddleware, followUser);

// Get user profile by ID
router.get('/:id', authMiddleware, getUser);



module.exports = router;
