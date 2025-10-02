const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// -------------------------
// REGISTER
// -------------------------
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username,
      email,
      password: hashedPassword,
      avatar
    });

    await user.save();

    // ✅ token contains { id: user.id }
    const payload = { id: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error("Error in registerUser:", err.message);
    res.status(500).json({ msg: err.message || "Server error" });
  }
};

// -------------------------
// LOGIN
// -------------------------
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    // ✅ token contains { id: user.id }
    const payload = { id: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error("Error in loginUser:", err.message);
    res.status(500).json({ msg: err.message || "Server error" });
  }
};

// -------------------------
// GET LOGGED-IN USER
// -------------------------
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error("Error in getUser:", err.message);
    res.status(500).json({ msg: err.message || "Server error" });
  }
};
