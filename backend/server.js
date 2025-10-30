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

// GridFS import (optional if using for large files)
const { connectGridFS } = require('./utils/gridfs');

const app = express();

// ✅ Middleware
if (process.env.NODE_ENV === 'production') {
  // Production: Allow only the Vercel frontend
  app.use(cors({
    origin: 'https://digital-crime-reporting-portal.vercel.app',
    credentials: true
  }));
  app.options('*', cors({
    origin: 'https://digital-crime-reporting-portal.vercel.app',
    credentials: true
  }));
} else {
  // Local development: Allow all origins
  app.use(cors());
  app.options('*', cors());
}
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Root test route (check in browser)
app.get('/', (req, res) => {
  res.send(`
    <h2>✅ Digital Crime Reporting Backend is Running Successfully!</h2>
    <p>Available API Routes:</p>
    <ul>
      <li><a href="/api/auth">/api/auth</a></li>
      <li><a href="/api/admin">/api/admin</a></li>
      <li><a href="/api/complaints">/api/complaints</a></li>
      <li><a href="/api/users">/api/users</a></li>
    </ul>
  `);
});

// ✅ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);

// ✅ Multer setup (for file uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads/evidence'));
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
  else cb(new Error('Only image, video, audio, or PDF files are allowed!'));
};

const upload = multer({ storage, fileFilter });
module.exports.upload = upload;

// ✅ MongoDB connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    connectGridFS();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
}
connectDB();

// ✅ Export Express app for Vercel (No app.listen here)
module.exports = app;

// ✅ Optional: Local development mode
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running locally on port ${PORT}`));
}
