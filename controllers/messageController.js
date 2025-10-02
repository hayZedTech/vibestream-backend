const Message = require('../models/Message');

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { fromUsername, toUsername, text } = req.body;

    if (!fromUsername || !toUsername || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const message = await Message.create({ fromUsername, toUsername, text });
    res.status(201).json(message);
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get conversation between two users
exports.getConversation = async (req, res) => {
  try {
    const { userA, userB } = req.params;
    const messages = await Message.getConversation(userA, userB, { limit: 100, sort: 'asc' });
    res.json(messages);
  } catch (err) {
    console.error('getConversation error:', err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
};

// Get recent chats (for notifications dropdown)
exports.getRecentConversations = async (req, res) => {
  try {
    const { username } = req.params;
    const conversations = await Message.getRecentConversations(username, { limit: 20 });
    res.json(conversations);
  } catch (err) {
    console.error('getRecentConversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};
