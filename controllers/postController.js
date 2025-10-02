const Post = require("../models/Post");
const User = require("../models/User");

// -------------------------
// GET all posts (latest first, with user info) + PAGINATION
// -------------------------
exports.getPosts = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const total = await Post.countDocuments();
    const posts = await Post.find()
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    res.json({ total, page, totalPages, hasMore, posts });
  } catch (err) {
    console.error("❌ Error in getPosts:", err.message);
    res.status(500).json({ msg: err.message || "Server error" });
  }
};

// -------------------------
// CREATE a new post
// -------------------------
exports.createPost = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ msg: "No user found in token" });
    }

    const newPost = new Post({
      user: req.user.id,
      text: req.body.text || "",
      image: req.file?.path || "",
    });

    const post = await newPost.save();
    await post.populate("user", "username avatar");

    res.json(post);
  } catch (err) {
    console.error("❌ Error in createPost:", err);
    res.status(500).json({ msg: "Server error", error: err.message || String(err) });
  }
};

// -------------------------
// LIKE / UNLIKE a post
// -------------------------
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar");

    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (post.likes.includes(req.user.id)) {
      post.likes.pull(req.user.id); // Unlike
    } else {
      post.likes.push(req.user.id); // Like
    }

    await post.save();
    await post.populate("comments.user", "username avatar");

    res.json(post);
  } catch (err) {
    console.error("❌ Error in likePost:", err.message);
    res.status(500).json({ msg: err.message || "Server error" });
  }
};

// -------------------------
// ADD COMMENT
// -------------------------
exports.addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar");

    if (!post) return res.status(404).json({ msg: "Post not found" });
    if (!req.body.text) return res.status(400).json({ msg: "Comment text is required" });

    post.comments.push({ user: req.user.id, text: req.body.text });
    await post.save();
    await post.populate("comments.user", "username avatar");

    res.json(post);
  } catch (err) {
    console.error("❌ Error in addComment:", err.message);
    res.status(500).json({ msg: err.message || "Server error" });
  }
};

// -------------------------
// GET posts by user (profile page) + PAGINATION
// -------------------------
exports.getUserPosts = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const total = await Post.countDocuments({ user: req.params.id });
    const posts = await Post.find({ user: req.params.id })
      .populate("user", "username avatar")
      .populate("comments.user", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    res.json({ total, page, totalPages, hasMore, posts });
  } catch (err) {
    console.error("❌ Error in getUserPosts:", err.message);
    res.status(500).json({ msg: err.message || "Server error" });
  }
};

// -------------------------
// DELETE a post
// -------------------------
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    await post.deleteOne();
    res.json({ msg: "Post removed" });
  } catch (err) {
    console.error("❌ Error in deletePost:", err.message);
    res.status(500).json({ msg: err.message || "Server error" });
  }
};
