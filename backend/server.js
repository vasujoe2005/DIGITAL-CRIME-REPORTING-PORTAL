// ✅ Load environment variables
require('dotenv').config({ path: './backend/.env' });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

// ✅ Import your route files
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const complaintRoutes = require('./routes/complaints');
const userRoutes = require('./routes/users');
const { connectGridFS } = require('./utils/gridfs');

const app = express();

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ Static file serving (optional for uploads)
app.use('/uploads', express.static('uploads'));

// ✅ Register routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);

// ✅ Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/evidence');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpg|jpeg|png|mp4|pdf|mp3|wav/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image, video, audio, or PDF files allowed!'));
  }
};

const upload = multer({ storage, fileFilter });
module.exports = upload;

// ✅ MongoDB Connection (run once on cold start)
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    connectGridFS();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

// ✅ Root route for testing
app.get('/', (req, res) => {
  res.send('🚀 Crime Reporting Backend Running on Vercel');
});

// ✅ Export the app instead of listening (required by Vercel)
module.exports = app;
