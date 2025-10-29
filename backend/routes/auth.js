const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/User');
const { setOtp, verifyOtp } = require('../utils/otpStore');
const { sendMail, otpEmail } = require('../utils/mailer');

router.post('/send-otp', async (req,res)=>{
  try{
    const { email } = req.body;
    if(!email || !validator.isEmail(email)) return res.status(400).json({msg:'Invalid email'});
    const otp = Math.floor(100000 + Math.random()*900000);
    setOtp(email, otp, 600);
    await sendMail(email, 'Your Portal OTP', otpEmail(otp));
    return res.json({ok:true, msg:'OTP sent'});
  }catch(err){ console.error(err); return res.status(500).json({msg:'error'}); }
});

router.post('/verify-otp', async (req,res)=>{
  const { email, otp } = req.body;
  if(!email || !otp) return res.status(400).json({msg:'missing'});
  const ok = verifyOtp(email, otp);
  if(!ok) return res.status(400).json({msg:'invalid or expired otp'});
  return res.json({ok:true});
});

router.post('/register', async (req,res)=>{
  try{
    const { fullName,email,phone,aadhar,address,gender,dob,password,confirmPassword } = req.body;
    if(!fullName || !email || !phone || !aadhar || !password || !confirmPassword){
      return res.status(400).json({msg:'missing fields'});
    }
    if(/[0-9]/.test(fullName) || /[^a-zA-Z\s]/.test(fullName)) return res.status(400).json({msg:'Invalid name'});
    if(!validator.isEmail(email)) return res.status(400).json({msg:'Invalid email'});
    if(!/^\d{10}$/.test(phone)) return res.status(400).json({msg:'Invalid phone'});
    if(!/^\d{12}$/.test(aadhar)) return res.status(400).json({msg:'Invalid aadhar'});
    const pwRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if(!pwRules.test(password)) return res.status(400).json({msg:'Password must be 8+ with upper, lower, number, symbol'});
    if(password !== confirmPassword) return res.status(400).json({msg:'Passwords do not match'});

    const existing = await User.findOne({email});
    if(existing) return res.status(400).json({msg:'Email already registered. Please use a different email address.'});
    const bcryptHash = await bcrypt.hash(password, 10);
    const user = new User({ fullName,email,phone,aadhar,address,gender,dob,passwordHash:bcryptHash });
    await user.save();
    return res.json({ok:true, msg:'Registered'});
  }catch(err){ console.error(err); return res.status(500).json({msg:'server error'}); }
});

router.post('/login', async (req,res)=>{
  const { email, password } = req.body;
  const user = await User.findOne({email});
  if(!user) return res.status(400).json({msg:'Invalid credentials'});
  const ok = await require('bcryptjs').compare(password, user.passwordHash);
  if(!ok) return res.status(400).json({msg:'Invalid credentials'});
  const token = jwt.sign({ id:user._id, role:user.role }, process.env.JWT_SECRET || 'secret', { expiresIn:'7d' });
  return res.json({ token, user:{ id:user._id, email:user.email, fullName:user.fullName, role:user.role, verified:user.verified }});
});

router.put('/notifications/:notificationId/read', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const notification = user.notifications.id(req.params.notificationId);
    if (!notification) return res.status(404).json({ msg: 'Notification not found' });

    notification.read = true;
    await user.save();

    res.json({ ok: true, msg: 'Notification marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
