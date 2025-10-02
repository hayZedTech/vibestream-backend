const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ directly assign the decoded payload
    req.user = decoded; // { id: "..." }

    // console.log("Decoded JWT:", decoded);

    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
