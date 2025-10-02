const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ✅ Search users
exports.searchUsers = async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);

    const users = await User.find({
      username: { $regex: q, $options: 'i' },
    }).select('username avatar');

    res.json(users);
  } catch (err) {
    console.error("❌ Error in searchUsers:", err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ✅ Get user by ID
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error("❌ Error in getUser:", err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ✅ Upload avatar
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No avatar uploaded' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: req.file.path }, // Cloudinary URL
      { new: true }
    );

    res.json({ avatar: user.avatar });
  } catch (err) {
    console.error("❌ Error in uploadAvatar:", err.message);
    res.status(500).json({ msg: 'Failed to update avatar' });
  }
};

// ✅ Update bio
exports.updateBio = async (req, res) => {
  try {
    if (!req.body.bio) {
      return res.status(400).json({ msg: 'Bio is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { bio: req.body.bio },
      { new: true }
    );

    res.json({ bio: user.bio });
  } catch (err) {
    console.error("❌ Error in updateBio:", err.message);
    res.status(500).json({ msg: 'Failed to update bio' });
  }
};

// ✅ Update password
exports.updatePassword = async (req, res) => {
  try {
    if (!req.body.password) {
      return res.status(400).json({ msg: 'Password is required' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    await User.findByIdAndUpdate(req.user.id, { password: hashedPassword });

    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error("❌ Error in updatePassword:", err.message);
    res.status(500).json({ msg: 'Failed to update password' });
  }
};

// ✅ Follow/unfollow user
exports.followUser = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (targetUser.followers.includes(req.user.id)) {
      // Unfollow
      targetUser.followers = targetUser.followers.filter(
        (f) => f.toString() !== req.user.id
      );
      currentUser.following = currentUser.following.filter(
        (f) => f.toString() !== req.params.id
      );
    } else {
      // Follow
      targetUser.followers.push(req.user.id);
      currentUser.following.push(req.params.id);
    }

    await targetUser.save();
    await currentUser.save();

    res.json({ followers: targetUser.followers });
  } catch (err) {
    console.error("❌ Error in followUser:", err.message);
    res.status(500).json({ msg: 'Failed to follow/unfollow' });
  }
};
