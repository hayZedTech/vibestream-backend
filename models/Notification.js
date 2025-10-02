// backend/models/Notification.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Notification schema
 * - user: recipient (can be ObjectId referencing User OR a username string)
 * - fromUser: sender (can be ObjectId or username string)
 *
 * We use Schema.Types.Mixed for flexibility (ObjectId or string).
 * If you later want stricter typing, switch these back to ObjectId and resolve usernames -> IDs before saving.
 */
const notificationSchema = new Schema({
  user: { type: Schema.Types.Mixed, required: true },      // recipient (ObjectId or username string)
  type: { type: String, required: true },                 // e.g. 'like', 'comment', 'follow', 'message'
  fromUser: { type: Schema.Types.Mixed, required: false },// sender (ObjectId or username string)
  message: { type: String, required: false },             // optional short text (for messages/comments)
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: false }, // optional
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for quick retrieval
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
