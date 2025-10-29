const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const FIRPDFGenerator = require('../utils/pdfGenerator');

async function isAdmin(req,res,next){
  if(req.user.role !== 'admin') return res.status(403).json({msg:'Admin only'});
  next();
}

router.post('/add-officer', auth, isAdmin, async (req,res)=>{
  try{
    const { fullName,email,phone,aadhar,address,gender,dob,postingSite,badgeNumber } = req.body;
    if(!fullName||!email||!phone||!aadhar||!address||!gender||!dob||!postingSite||!badgeNumber) return res.status(400).json({msg:'missing fields'});
    // Constraints
    const nameRegex = /^[A-Za-z\s]+$/;
    if(!nameRegex.test(fullName)) return res.status(400).json({msg:'Full name must contain only letters and spaces'});
    if(!/^\d{10}$/.test(phone)) return res.status(400).json({msg:'Phone must be 10 digits'});
    if(!/^\d{12}$/.test(aadhar)) return res.status(400).json({msg:'Aadhar must be 12 digits'});
    if(!email.includes('@')) return res.status(400).json({msg:'Invalid email'});
    const existing = await User.findOne({email});
    if(existing) return res.status(400).json({msg:'Email already exists. Please use a different email address.'});
    const existingBadge = await User.findOne({badgeNumber});
    if(existingBadge) return res.status(400).json({msg:'badge number exists'});
    // Password: dob (YYYY-MM-DD) + "ips"
    const dobStr = new Date(dob).toISOString().split('T')[0];
    const password = dobStr + 'ips';
    const passwordHash = await bcrypt.hash(password, 10);
    const officer = new User({ fullName,email,phone,aadhar,address,gender,dob,postingSite,passwordHash,role:'officer',badgeNumber,verified:true });
    await officer.save();

    // Send welcome email to the new officer
    const { sendMail, officerWelcomeEmail } = require('../utils/mailer');
    await sendMail(email, 'Welcome to Digital Crime Management Portal', officerWelcomeEmail(fullName, email, password));

    return res.json({ok:true, officer});
  }catch(err){ console.error(err); return res.status(500).json({msg:'err'}); }
});

router.get('/officers', auth, isAdmin, async (req,res)=>{
  const officers = await User.find({ role:'officer' }).select('-passwordHash');
  res.json(officers);
});

router.post('/add-note/:complaintId', auth, isAdmin, async (req,res)=>{
  try{
    const { note } = req.body;
    if(!note) return res.status(400).json({msg:'Note is required'});
    const complaint = await Complaint.findById(req.params.complaintId).populate('assignedOfficer','email fullName');
    if(!complaint) return res.status(404).json({msg:'Complaint not found'});
    complaint.updates.push({ by: req.user.id, type:'admin', note });
    await complaint.save();
    // Notify officer via email
    if(complaint.assignedOfficer && complaint.assignedOfficer.email){
      const { sendMail, adminNoteEmail } = require('../utils/mailer');
      try {
        await sendMail(complaint.assignedOfficer.email, 'Admin Note on Case', adminNoteEmail(complaint._id, note));
      } catch (emailErr) {
        console.error('Email sending failed:', emailErr);
      }
    }
    // Add in-app notification to officer
    if(complaint.assignedOfficer){
      try {
        const officer = await User.findById(complaint.assignedOfficer._id);
        if (!officer) {
          console.error('Officer not found for notification:', complaint.assignedOfficer._id);
        } else {
          if (!Array.isArray(officer.notifications)) {
            officer.notifications = [];
          }
          officer.notifications.push({
            message: `Admin note on case ${complaint._id}: ${note}`,
            type: 'admin_note',
            complaintId: complaint._id,
            read: false,
            createdAt: new Date()
          });
          await officer.save();
        }
      } catch (notifErr) {
        console.error('Error saving notification:', notifErr);
      }
    }
    return res.json({ok:true, msg:'Note added successfully'});
  }catch(err){ console.error(err); return res.status(500).json({msg:'err'}); }
});

// Generate Statistics PDF
router.get('/download-statistics', auth, isAdmin, async (req, res) => {
  try {
    const complaints = await Complaint.find({}).populate('assignedOfficer', 'fullName badgeNumber');
    const officers = await User.find({ role: 'officer' });

    const doc = new FIRPDFGenerator().doc;
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ADMIN STATISTICS REPORT', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated on: ' + new Date().toLocaleString(), pageWidth / 2, 35, { align: 'center' });

    let yPosition = 50;

    // Summary Statistics
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY STATISTICS', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');

    const totalComplaints = complaints.length;
    const activeCases = complaints.filter(c => c.status !== 'Closed').length;
    const closedCases = complaints.filter(c => c.status === 'Closed').length;
    const resolutionRate = totalComplaints > 0 ? Math.round((closedCases / totalComplaints) * 100) : 0;

    const summaryData = [
      ['Total Complaints:', totalComplaints.toString()],
      ['Active Cases:', activeCases.toString()],
      ['Closed Cases:', closedCases.toString()],
      ['Resolution Rate:', resolutionRate + '%'],
      ['Total Officers:', officers.length.toString()],
      ['Verified Officers:', officers.filter(o => o.verified).length.toString()]
    ];

    doc.autoTable({
      startY: yPosition,
      head: [],
      body: summaryData,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 40 }
      }
    });

    yPosition = doc.lastAutoTable.finalY + 20;

    // Complaint Types Distribution
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPLAINT TYPES DISTRIBUTION', 20, yPosition);
    yPosition += 15;

    const typeStats = {};
    complaints.forEach(c => {
      typeStats[c.type] = (typeStats[c.type] || 0) + 1;
    });

    const typeData = Object.entries(typeStats).map(([type, count]) => [
      type,
      count.toString(),
      ((count / totalComplaints) * 100).toFixed(1) + '%'
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['Complaint Type', 'Count', 'Percentage']],
      body: typeData,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    yPosition = doc.lastAutoTable.finalY + 20;

    // Status Distribution
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CASE STATUS DISTRIBUTION', 20, yPosition);
    yPosition += 15;

    const statusStats = {};
    complaints.forEach(c => {
      statusStats[c.status] = (statusStats[c.status] || 0) + 1;
    });

    const statusData = Object.entries(statusStats).map(([status, count]) => [
      status,
      count.toString(),
      ((count / totalComplaints) * 100).toFixed(1) + '%'
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['Status', 'Count', 'Percentage']],
      body: statusData,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [46, 204, 113], textColor: 255 }
    });

    yPosition = doc.lastAutoTable.finalY + 20;

    // Officer Workload
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICER WORKLOAD', 20, yPosition);
    yPosition += 15;

    const officerWorkload = {};
    complaints.forEach(c => {
      if (c.assignedOfficer) {
        const officerName = c.assignedOfficer.fullName;
        officerWorkload[officerName] = (officerWorkload[officerName] || 0) + 1;
      }
    });

    const workloadData = Object.entries(officerWorkload).map(([officer, count]) => [
      officer,
      count.toString()
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['Officer Name', 'Assigned Cases']],
      body: workloadData,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [155, 89, 182], textColor: 255 }
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    const footerY = pageHeight - 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a system-generated statistics report. For administrative use only.', pageWidth / 2, footerY, { align: 'center' });

    const buffer = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=admin-statistics-report.pdf');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error generating statistics PDF' });
  }
});

// Download Individual Case Report PDF
router.get('/download-case-report/:complaintId', auth, isAdmin, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId)
      .populate('assignedOfficer', 'fullName badgeNumber postingSite')
      .populate('reporter', 'fullName email phone');

    if (!complaint) {
      return res.status(404).json({ msg: 'Complaint not found' });
    }

    const generator = new FIRPDFGenerator();
    const doc = generator.generateFIR(complaint, complaint.assignedOfficer, complaint.updates.filter(u => u.type === 'admin'));

    const buffer = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=case-report-${complaint._id.toString().slice(-8).toUpperCase()}.pdf`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error generating case report PDF' });
  }
});

module.exports = router;
