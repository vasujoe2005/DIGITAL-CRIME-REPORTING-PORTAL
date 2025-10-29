require('dotenv').config({ path: './backend/.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const complaintRoutes = require('./routes/complaints');
const userRoutes = require('./routes/users');
const { connectGridFS } = require('./utils/gridfs');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
const multer = require('multer');
const path = require('path');

// Define storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/evidence'); // store in uploads/evidence folder
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

// File filter (optional - restrict file types)
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

async function start(){
  try{
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log('✅ Connected to MongoDB');
    connectGridFS();
    app.listen(PORT, ()=>console.log('🚀 Backend running on', PORT));
  }catch(err){
    console.error('Startup error', err);
    process.exit(1);
  }
}
start();
