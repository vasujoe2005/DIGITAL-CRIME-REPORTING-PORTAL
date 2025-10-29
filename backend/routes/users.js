const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

router.get('/me', auth, async (req,res)=>{
  const user = await User.findById(req.user.id).select('-passwordHash');
  res.json(user);
});

router.put('/me', auth, async (req, res) => {
  try {
    const { fullName, phone, address, gender, dob, postingSite, badgeNumber } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { fullName, phone, address, gender, dob, postingSite, badgeNumber },
      { new: true, runValidators: true }
    ).select('-passwordHash');
    if (!updatedUser) return res.status(404).json({ msg: 'User not found' });
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
