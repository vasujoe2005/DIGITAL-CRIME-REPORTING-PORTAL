// Load environment variables
require('dotenv').config({ path: './backend/.env' });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

// Route imports
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const complaintRoutes = require('./routes/complaints');
const userRoutes = require('./routes/users');

// GridFS import (optional if using file storage)
const { connectGridFS } = require('./utils/gridfs');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// Test route (✅ visible in browser)
app.get('/', (req, res) => {
  res.send('✅ Digital Crime Reporting Backend is running successfully!');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);

// Multer setup (file upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/evidence');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpg|jpeg|png|mp4|pdf|mp3|wav/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) cb(null, true);
  else cb(new Error('Only image, video, audio, or PDF files allowed!'));
};

const upload = multer({ storage, fileFilter });
module.exports.upload = upload;

// MongoDB connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    connectGridFS();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
}
connectDB();

// ✅ Do not use app.listen() on Vercel
// Export Express app for serverless environment
module.exports = app;
