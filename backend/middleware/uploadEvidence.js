const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads/evidence directory exists
const uploadDir = path.join(__dirname, '../uploads/evidence');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Allowed file types
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|mp4|mov|avi|pdf|mp3|wav/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) cb(null, true);
  else cb(new Error('Unsupported file type!'));
};

const uploadEvidence = multer({ storage, fileFilter });

module.exports = uploadEvidence;
