// test-cloudinary.js
const cloudinary = require('./config/cloudinary');

cloudinary.api.ping()
  .then(res => console.log('Cloudinary OK:', res))
  .catch(err => console.error('Cloudinary error:', err));
