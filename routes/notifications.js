const router = require("express").Router();
const Notification = require("../models/Notification");

// Get notifications for user
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;
    const notifs = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("fromUser", "username avatar")
      .populate("post", "text image");
    res.status(200).json(notifs);
  } catch (err) { res.status(500).json(err); }
});

// Mark as read
router.put("/:id/read", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.status(200).json({ message: "Marked as read" });
  } catch (err) { res.status(500).json(err); }
});

module.exports = router;
