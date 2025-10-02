// backend/models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // store usernames as strings to avoid ObjectId casting issues
    fromUsername: { type: String, required: true, trim: true, index: true },
    toUsername: { type: String, required: true, trim: true, index: true },

    // message text
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000 // reasonable safety cap
    },

    // whether recipient has read the message
    read: { type: Boolean, default: false }
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true, transform: docToJson },
    toObject: { virtuals: true }
  }
);

// Compound index to accelerate conversation queries and ordering by time
messageSchema.index({ fromUsername: 1, toUsername: 1, createdAt: 1 });
messageSchema.index({ toUsername: 1, fromUsername: 1, createdAt: 1 });

// helper transform to produce a cleaner JSON payload for clients
function docToJson(doc, ret) {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;
  // keep createdAt/updatedAt (added by timestamps)
  return ret;
}

/**
 * Static - fetch conversation between two usernames, sorted ascending by createdAt by default
 * @param {String} userA
 * @param {String} userB
 * @param {Object} options - { limit = 100, skip = 0, sort = 'asc' }
 * @returns {Promise<Array>}
 */
messageSchema.statics.getConversation = async function (userA, userB, options = {}) {
  const { limit = 100, skip = 0, sort = 'asc' } = options;
  const order = sort === 'asc' ? 1 : -1;

  return this.find({
    $or: [
      { fromUsername: userA, toUsername: userB },
      { fromUsername: userB, toUsername: userA }
    ]
  })
    .sort({ createdAt: order })
    .skip(Number(skip) || 0)
    .limit(Number(limit) || 100)
    .lean();
};

/**
 * Static - get recent conversations involving a username (one message per peer)
 * This is a lightweight helper (returns latest message per other user).
 * @param {String} username
 * @param {Object} options - { limit = 50 }
 */
messageSchema.statics.getRecentConversations = async function (username, options = {}) {
  const { limit = 50 } = options;

  // aggregation to get last message per peer (either from or to)
  const pipeline = [
    {
      $match: {
        $or: [{ fromUsername: username }, { toUsername: username }]
      }
    },
    {
      $project: {
        otherUser: {
          $cond: [{ $eq: ['$fromUsername', username] }, '$toUsername', '$fromUsername']
        },
        text: 1,
        read: 1,
        createdAt: 1,
        fromUsername: 1,
        toUsername: 1
      }
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$otherUser',
        lastMessage: { $first: '$$ROOT' }
      }
    },
    { $replaceRoot: { newRoot: '$lastMessage' } },
    { $sort: { createdAt: -1 } },
    { $limit: Number(limit) || 50 }
  ];

  return this.aggregate(pipeline);
};

/**
 * Static - mark messages from peer -> username as read
 * @param {String} username - the user marking messages as read (recipient)
 * @param {String} peer - the other participant (sender)
 */
messageSchema.statics.markAsRead = async function (username, peer) {
  return this.updateMany(
    { fromUsername: peer, toUsername: username, read: false },
    { $set: { read: true } }
  );
};

/**
 * Instance helper: mark this message read and save
 */
messageSchema.methods.markRead = async function () {
  this.read = true;
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema);
