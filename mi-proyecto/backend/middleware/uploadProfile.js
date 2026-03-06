// backend/middleware/uploadProfile.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const profileDir = path.join(__dirname, '..', 'uploads', 'profile');
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + unique + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  if (allowed.test(ext) && allowed.test(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Solo imágenes'), false);
  }
};

const uploadProfile = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter
});

module.exports = uploadProfile;