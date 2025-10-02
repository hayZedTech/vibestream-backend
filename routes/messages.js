// backend/routes/messages.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

/**
 * Helper: normalize payload (trim + enforce length)
 */
function normalizeMessagePayload(payload = {}) {
  const fromUsername = typeof payload.fromUsername === 'string' ? payload.fromUsername.trim() : '';
  const toUsername = typeof payload.toUsername === 'string' ? payload.toUsername.trim() : '';
  let text = typeof payload.text === 'string' ? payload.text.trim() : '';

  const MAX_TEXT = 2000;
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);

  return { fromUsername, toUsername, text };
}

/**
 * POST /api/messages
 * Body: { fromUsername, toUsername, text }
 */
router.post('/', async (req, res) => {
  try {
    const { fromUsername, toUsername, text } = normalizeMessagePayload(req.body);
    if (!fromUsername || !toUsername || !text) {
      return res.status(400).json({ msg: 'Missing required fields: fromUsername, toUsername, text' });
    }

    const msg = await Message.create({ fromUsername, toUsername, text });
    return res.status(201).json(msg);
  } catch (err) {
    console.error('POST /api/messages error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * GET /api/messages/conversation?userA=alice&userB=bob
 */
router.get('/conversation', async (req, res) => {
  try {
    const { userA, userB } = req.query;
    if (!userA || !userB) return res.status(400).json({ msg: 'Missing userA or userB query parameter' });

    const messages = await Message.find({
      $or: [
        { fromUsername: userA, toUsername: userB },
        { fromUsername: userB, toUsername: userA }
      ]
    }).sort({ createdAt: 1 }); // ascending by time

    return res.json(messages);
  } catch (err) {
    console.error('GET /api/messages/conversation error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * DELETE /api/messages/conversation?userA=alice&userB=bob
 * or DELETE /api/messages/conversation  with body { userA, userB }
 *
 * Removes all messages between the two users.
 */
router.delete('/conversation', async (req, res) => {
  try {
    const userA = (req.query.userA || req.body.userA || '').trim();
    const userB = (req.query.userB || req.body.userB || '').trim();
    if (!userA || !userB) return res.status(400).json({ msg: 'Missing userA or userB' });

    const result = await Message.deleteMany({
      $or: [
        { fromUsername: userA, toUsername: userB },
        { fromUsername: userB, toUsername: userA }
      ]
    });

    return res.json({ ok: true, deletedCount: result.deletedCount ?? 0 });
  } catch (err) {
    console.error('DELETE /api/messages/conversation error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * POST /api/messages/conversation/delete
 * Body: { userA, userB }
 *
 * Some clients may prefer POST for destructive actions — provide a fallback route.
 */
router.post('/conversation/delete', async (req, res) => {
  try {
    const userA = (req.body.userA || '').trim();
    const userB = (req.body.userB || '').trim();
    if (!userA || !userB) return res.status(400).json({ msg: 'Missing userA or userB in body' });

    const result = await Message.deleteMany({
      $or: [
        { fromUsername: userA, toUsername: userB },
        { fromUsername: userB, toUsername: userA }
      ]
    });

    return res.json({ ok: true, deletedCount: result.deletedCount ?? 0 });
  } catch (err) {
    console.error('POST /api/messages/conversation/delete error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * PUT /api/messages/conversation/mark-read
 * Body: { username, peer }
 */
router.put('/conversation/mark-read', async (req, res) => {
  try {
    const username = req.body.username?.trim();
    const peer = req.body.peer?.trim();
    if (!username || !peer) return res.status(400).json({ msg: 'Missing username or peer in request body' });

    const result = await Message.updateMany(
      { fromUsername: peer, toUsername: username, read: false },
      { $set: { read: true } }
    );

    return res.json({ msg: 'Marked as read', modifiedCount: result.modifiedCount ?? result.nModified ?? 0 });
  } catch (err) {
    console.error('PUT /api/messages/conversation/mark-read error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * GET /api/messages/recent?user=alice
 * Returns latest message per peer (simple version).
 */
router.get('/recent', async (req, res) => {
  try {
    const username = req.query.user?.trim();
    if (!username) return res.status(400).json({ msg: 'Missing user query param' });

    // fetch last 50 messages where user is involved
    const msgs = await Message.find({
      $or: [{ fromUsername: username }, { toUsername: username }]
    })
      .sort({ createdAt: -1 })
      .limit(50);

    // reduce to latest message per peer
    const seen = new Set();
    const convos = [];
    for (const msg of msgs) {
      const peer = msg.fromUsername === username ? msg.toUsername : msg.fromUsername;
      if (!seen.has(peer)) {
        seen.add(peer);
        convos.push(msg);
      }
    }

    return res.json(convos);
  } catch (err) {
    console.error('GET /api/messages/recent error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * GET /api/messages/unread-count?user=alice
 */
router.get('/unread-count', async (req, res) => {
  try {
    const username = req.query.user?.trim();
    if (!username) return res.status(400).json({ msg: 'Missing user query param' });

    const count = await Message.countDocuments({ toUsername: username, read: false });
    return res.json({ unread: count });
  } catch (err) {
    console.error('GET /api/messages/unread-count error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * GET /api/messages?user=username
 * Returns inbox + sent
 */
router.get('/', async (req, res) => {
  try {
    const username = req.query.user?.trim();
    if (!username) return res.status(400).json({ msg: 'Missing user' });

    const msgs = await Message.find({
      $or: [{ fromUsername: username }, { toUsername: username }]
    }).sort({ createdAt: -1 });

    return res.json(msgs);
  } catch (err) {
    console.error('GET /api/messages error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
