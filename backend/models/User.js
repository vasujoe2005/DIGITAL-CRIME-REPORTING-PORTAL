const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  fullName:{type:String, required:true},
  email:{type:String, required:true, unique:true},
  phone:{type:String, required:true},
  aadhar:{type:String, required:true},
  address:{type:String},
  gender:{type:String},
  dob:{type:Date},
  passwordHash:{type:String, required:true},
  role:{type:String, enum:['user','admin','officer'], default:'user'},
  postingSite:{type:String},
  badgeNumber:{type:String},
  verified:{type:Boolean, default:false},
  notifications:[{
    message:String,
    type:String, // e.g., 'admin_note', 'case_update'
    complaintId:{type: mongoose.Schema.Types.ObjectId, ref:'Complaint'},
    read:{type:Boolean, default:false},
    createdAt:{type:Date, default:Date.now}
  }]
}, {timestamps:true});
module.exports = mongoose.model('User', userSchema);
