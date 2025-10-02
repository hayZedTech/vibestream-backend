const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUser } = require('../controllers/authController');
const auth = require('../middleware/auth');

// Register new user
router.post('/register', registerUser);

// Login user
router.post('/login', loginUser);

// Get logged-in user (protected route)
router.get('/me', auth, getUser);

module.exports = router;
