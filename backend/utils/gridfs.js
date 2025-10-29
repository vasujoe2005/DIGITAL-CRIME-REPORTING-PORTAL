const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let gfs;

const connectGridFS = () => {
  const conn = mongoose.connection;
  gfs = new GridFSBucket(conn.db, {
    bucketName: 'uploads'
  });
  console.log('GridFS connected');
};

const getGFS = () => {
  if (!gfs) {
    throw new Error('GridFS not initialized');
  }
  return gfs;
};

module.exports = { connectGridFS, getGFS };
