const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const auth = require('../middleware/auth');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const FIRPDFGenerator = require('../utils/pdfGenerator');

const { sendMail, complaintSubmittedEmail, caseAssignedEmail, complaintUpdateEmail, emergencyCaseAssignedEmail } = require('../utils/mailer');
const { getGFS } = require('../utils/gridfs');

class GridFSStorage {
  constructor(options) {
    this.bucketName = options.bucketName || 'uploads';
  }

  _handleFile(req, file, cb) {
    const conn = mongoose.connection;
    if (!conn.db) {
      return cb(new Error('Database not connected'));
    }
    const bucket = new GridFSBucket(conn.db, { bucketName: this.bucketName });
    const uploadStream = bucket.openUploadStream(`${Date.now()}-${file.originalname}`, {
      contentType: file.mimetype
    });
    file.stream.pipe(uploadStream);
    uploadStream.on('finish', () => {
      file.id = uploadStream.id;
      file.filename = uploadStream.filename;
      file.size = uploadStream.length;
      file.mimetype = file.mimetype;
      cb(null, file);
    });
    uploadStream.on('error', cb);
  }

  _removeFile(req, file, cb) {
    cb();
  }
}

const storage = new GridFSStorage({ bucketName: 'uploads' });
const upload = multer({ storage });

router.post('/file', upload.array('evidence',5), async (req,res)=>{
  try{
    const { type,date,time,location,nearestLandmark,description,relationToVictim,accusedDetails,victimDetails, anonymous } = req.body;

    // Handle authentication conditionally
    let user = null;
    if (anonymous !== 'true') {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) return res.status(401).json({msg:'Authentication required for non-anonymous reports'});
      try {
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret');
        user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({msg:'Invalid token'});
      } catch (err) {
        return res.status(401).json({msg:'Invalid token'});
      }
    }

    const evidence = (req.files||[]).map(f=>({
      fileId: f.id,
      filename: f.filename,
      size: f.size,
      mimetype: f.mimetype
    }));
    const complaint = new Complaint({
      reporter: anonymous === 'true' ? null : user?.id,
      anonymous: anonymous === 'true',
      type, date, time, location, nearestLandmark, description, relationToVictim,
      accusedDetails: accusedDetails ? JSON.parse(accusedDetails) : [],
      victimDetails: victimDetails ? JSON.parse(victimDetails) : [],
      evidence
    });
    const officer = await User.findOne({ role:'officer', postingSite: location });
    if(officer){
      complaint.assignedOfficer = officer._id;
    }
    await complaint.save();
    // Email notifications
    if(!complaint.anonymous && user && user.email){
      await sendMail(user.email, 'Complaint Submitted Successfully', complaintSubmittedEmail(complaint._id));
    }
    if(officer && officer.email){
      await sendMail(officer.email, 'New Case Assigned - Action Required', caseAssignedEmail(complaint));
    }
    return res.json({ok:true, complaint});
  }catch(err){ console.error(err); return res.status(500).json({msg:'err'}); }
});

router.get('/', auth, async (req,res)=>{
  const role = req.user.role;
  const { type, sort = 'recent', status } = req.query;

  let query = {};
  if(role === 'user'){
    query.reporter = req.user.id;
  }else if(role === 'officer'){
    query.assignedOfficer = req.user.id;
  }

  if(type && type !== 'all'){
    query.type = type;
  }

  if(status && status !== 'all'){
    query.status = status;
  }

  const sortOrder = sort === 'oldest' ? 1 : -1;

  let list;
  if(role === 'user'){
    list = await Complaint.find(query).populate('assignedOfficer','fullName email postingSite').sort({ createdAt: sortOrder });
  }else if(role === 'officer'){
    list = await Complaint.find(query).populate('reporter','fullName email').sort({ createdAt: sortOrder });
  }else{
    list = await Complaint.find(query).populate('reporter','fullName email').populate('assignedOfficer','fullName email postingSite').sort({ createdAt: sortOrder });
  }

  // For users, include anonymous complaints in their reports if they are the reporter (but since anonymous have null reporter, this won't affect)
  // Anonymous complaints are not shown to users in their reports, which is correct.

  return res.json(list);
});

router.post('/:id/update', auth, upload.array('evidence',3), async (req,res)=>{
  try{
    const comp = await Complaint.findById(req.params.id).populate('reporter','email fullName');
    if(!comp) return res.status(404).json({msg:'not found'});
    if(req.user.role !== 'admin' && req.user.role !== 'officer') return res.status(403).json({msg:'no'});
    const { note, status } = req.body;
    const newEvidence = [];
    if(req.files && req.files.length){
      const newFiles = req.files.map(f=>({
        fileId: f.id,
        filename: f.filename,
        size: f.size,
        mimetype: f.mimetype
      }));
      comp.evidence = comp.evidence.concat(newFiles);
      newEvidence.push(...newFiles);
    }
    comp.updates.push({ by: req.user.id, type: req.user.role === 'admin' ? 'admin' : 'officer', note, evidence: newEvidence });
    if(status) comp.status = status;
    await comp.save();
    // Status update notification
    if(comp.reporter && comp.reporter.email && !comp.anonymous){
      await sendMail(comp.reporter.email, 'Update on Your Complaint', complaintUpdateEmail(comp._id, note));
    }
    return res.json({ok:true, comp});
  }catch(err){ console.error(err); return res.status(500).json({msg:'err'}); }
});

router.put('/:id/edit', auth, upload.array('evidence',5), async (req,res)=>{
  try{
    const comp = await Complaint.findById(req.params.id);
    if(!comp) return res.status(404).json({msg:'not found'});
    if(comp.reporter.toString() !== req.user.id.toString()) return res.status(403).json({msg:'not yours'});
    if(comp.status !== 'Submitted') return res.status(400).json({msg:'cannot edit after submitted'});
    const { type,date,time,location,nearestLandmark,description,relationToVictim,accusedDetails,victimDetails } = req.body;
    if(type) comp.type = type;
    if(date) comp.date = date;
    if(time) comp.time = time;
    if(location) comp.location = location;
    if(nearestLandmark !== undefined) comp.nearestLandmark = nearestLandmark;
    if(description) comp.description = description;
    if(relationToVictim !== undefined) comp.relationToVictim = relationToVictim;
    if(accusedDetails) comp.accusedDetails = accusedDetails;
    if(victimDetails) comp.victimDetails = victimDetails;
    if(req.files && req.files.length){
      const newFiles = req.files.map(f=>({
        fileId: f.id,
        filename: f.filename,
        size: f.size,
        mimetype: f.mimetype
      }));
      comp.evidence = comp.evidence.concat(newFiles);
    }
    // Re-assign officer if location changed
    if(location && location !== comp.location){
      const officer = await User.findOne({ role:'officer', postingSite: location });
      if(officer){
        comp.assignedOfficer = officer._id;
      } else {
        comp.assignedOfficer = null;
      }
    }
    await comp.save();
    return res.json({ok:true, comp});
  }catch(err){ console.error(err); return res.status(500).json({msg:'err'}); }
});

router.post('/:id/withdraw', auth, async (req,res)=>{
  try{
    const comp = await Complaint.findById(req.params.id);
    if(!comp) return res.status(404).json({msg:'not found'});
    if(comp.reporter.toString() !== req.user.id.toString()) return res.status(403).json({msg:'not yours'});
    if(comp.status !== 'Submitted') return res.status(400).json({msg:'cannot withdraw after submitted'});
    comp.status = 'Withdrawn';
    await comp.save();
    return res.json({ok:true, comp});
  }catch(err){ console.error(err); return res.status(500).json({msg:'err'}); }
});

router.post('/emergency', auth, upload.array('evidence',5), async (req,res)=>{
  try{
    const { type,location,description } = req.body;
    const evidence = (req.files||[]).map(f=>({
      fileId: f.id,
      filename: f.filename,
      size: f.size,
      mimetype: f.mimetype
    }));
    const complaint = new Complaint({
      reporter: req.user.id,
      type, location, description, evidence,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0]
    });
    const officer = await User.findOne({ role:'officer', postingSite: location });
    if(officer){
      complaint.assignedOfficer = officer._id;
    }
    await complaint.save();
    // Email notifications
    if(req.user.email){
      await sendMail(req.user.email, 'Emergency Complaint Submitted Successfully', complaintSubmittedEmail(complaint._id));
    }
    if(officer && officer.email){
      await sendMail(officer.email, '🚨 EMERGENCY CASE ASSIGNED - IMMEDIATE ACTION REQUIRED', emergencyCaseAssignedEmail(complaint));
    }
    return res.json({ok:true, complaint});
  }catch(err){ console.error(err); return res.status(500).json({msg:'err'}); }
});

router.get('/profile', auth, async (req,res)=>{
  try{
    const user = await User.findById(req.user.id).select('-passwordHash');
    if(!user) return res.status(404).json({msg:'User not found'});
    return res.json(user);
  }catch(err){ console.error(err); return res.status(500).json({msg:'err'}); }
});

router.put('/profile', auth, async (req,res)=>{
  try{
    const { fullName, phone, aadhar, address, gender, dob } = req.body;
    const user = await User.findById(req.user.id);
    if(!user) return res.status(404).json({msg:'User not found'});
    if(fullName) user.fullName = fullName;
    if(phone) user.phone = phone;
    if(aadhar) user.aadhar = aadhar;
    if(address) user.address = address;
    if(gender) user.gender = gender;
    if(dob) user.dob = dob;
    await user.save();
    return res.json({ok:true, user: user.toObject({versionKey:false, transform: (doc, ret) => { delete ret.passwordHash; return ret; }})});
  }catch(err){ console.error(err); return res.status(500).json({msg:'err'}); }
});

router.delete('/profile', auth, async (req,res)=>{
  try{
    const user = await User.findById(req.user.id);
    if(!user) return res.status(404).json({msg:'User not found'});
    // Delete all complaints associated with the user
    await Complaint.deleteMany({ reporter: req.user.id });
    // Delete the user
    await User.findByIdAndDelete(req.user.id);
    return res.json({ok:true, msg:'Account deleted successfully'});
  }catch(err){ console.error(err); return res.status(500).json({msg:'err'}); }
});

// Route to serve files from GridFS
router.get('/files/:id', auth, async (req, res) => {
  try {
    const gfs = getGFS();
    if (!gfs) {
      console.error('GridFS not initialized');
      return res.status(500).json({ msg: 'GridFS not initialized' });
    }
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    console.log('Retrieving file with ID:', fileId);
    const file = await gfs.find({ _id: fileId }).toArray();
    if (!file || file.length === 0) {
      console.log('File not found for ID:', fileId);
      return res.status(404).json({ msg: 'File not found' });
    }
    const fileDoc = file[0];
    console.log('File found:', fileDoc.filename, 'ContentType:', fileDoc.contentType);
    res.set({
      'Content-Type': fileDoc.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${fileDoc.filename}"`
    });
    const readStream = gfs.openDownloadStream(fileId);
    readStream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ msg: 'Error streaming file' });
      }
    });
    readStream.pipe(res);
  } catch (err) {
    console.error('Error in /files/:id:', err);
    if (!res.headersSent) {
      res.status(500).json({ msg: 'Error retrieving file' });
    }
  }
});

// Route to generate and download FIR PDF
router.get('/:id/fir-pdf', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('reporter', 'fullName email')
      .populate('assignedOfficer', 'fullName email postingSite badgeNumber');

    if (!complaint) {
      return res.status(404).json({ msg: 'Complaint not found' });
    }

    // Check if user has permission to view this FIR
    if (req.user.role === 'user' && complaint.reporter?._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    if (req.user.role === 'officer' && complaint.assignedOfficer?._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    // Get admin notes/updates
    const adminUpdates = complaint.updates.filter(update => update.type === 'admin');

    const pdfGenerator = new FIRPDFGenerator();
    pdfGenerator.generateFIR(complaint, complaint.assignedOfficer, adminUpdates);

    const arrayBuffer = pdfGenerator.getBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="FIR_${complaint._id.toString().slice(-8).toUpperCase()}.pdf"`
    });

    res.send(buffer);
  } catch (err) {
    console.error('Error generating FIR PDF:', err);
    res.status(500).json({ msg: 'Error generating FIR PDF' });
  }
});

module.exports = router;
