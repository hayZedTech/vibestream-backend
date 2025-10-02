const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getConversation,
  getRecentConversations
} = require('../controllers/messageController');

// POST /api/messages
router.post('/', sendMessage);

// GET /api/messages/:userA/:userB
router.get('/:userA/:userB', getConversation);

// GET /api/messages/recent/:username
router.get('/recent/:username', getRecentConversations);

module.exports = router;
