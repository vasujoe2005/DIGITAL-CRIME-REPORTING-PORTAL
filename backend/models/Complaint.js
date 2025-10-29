const mongoose = require('mongoose');
const complaintSchema = new mongoose.Schema({
  reporter:{type: mongoose.Schema.Types.ObjectId, ref:'User'},
  anonymous:{type: Boolean, default: false},
  type:String,
  date:Date,
  time:String,
  location:String,
  nearestLandmark:String,
  description:String,
  relationToVictim:String,
  accusedDetails:[{
    name: String,
    alias: String,
    age: String,
    address: String,
    status: String,
    remarks: String
  }],
  victimDetails:[{
    name: String,
    gender: String,
    age: String,
    address: String,
    injuryLoss: String,
    medicalAid: Boolean
  }],
  evidence:[{
    fileId: String,
    filename: String,
    size: Number,
    mimetype: String
  }],
  status:{type:String, enum:['Submitted','Under Review','Investigation','Closed','Withdrawn'], default:'Submitted'},
  assignedOfficer:{type: mongoose.Schema.Types.ObjectId, ref:'User'},
  updates:[{
    by:{type: mongoose.Schema.Types.ObjectId, ref:'User'},
    type:{type:String, enum:['officer','admin'], default:'officer'},
    note:String,
    evidence:[{
      fileId: String,
      filename: String,
      size: Number,
      mimetype: String
    }],
    createdAt:{type:Date, default:Date.now}
  }]
}, {timestamps:true});
module.exports = mongoose.model('Complaint', complaintSchema);
