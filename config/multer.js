// config/multer.js
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const cloudinary = require('./cloudinary'); // already configured

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'socialapp',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      public_id: file.originalname.split('.')[0] + '-' + Date.now() // unique name
    };
  },
});

// File type filter
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

// Final multer parser
const parser = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter,
});

module.exports = parser;
