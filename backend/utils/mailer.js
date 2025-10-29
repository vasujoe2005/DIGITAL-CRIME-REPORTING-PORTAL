const nodemailer = require('nodemailer');
const {
  otpEmail,
  complaintSubmittedEmail,
  caseAssignedEmail,
  complaintUpdateEmail,
  emergencyCaseAssignedEmail,
  adminNoteEmail,
  officerWelcomeEmail
} = require('./emailTemplates');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vasuprabakar1985@gmail.com',
    pass: 'kpzjyaszcuavrqnh'
  }
});

async function sendMail(to, subject, html){
  const info = await transporter.sendMail({
    from: 'vasuprabakar1985@gmail.com',
    to, subject, html
  });
  return info;
}

module.exports = {
  sendMail,
  otpEmail,
  complaintSubmittedEmail,
  caseAssignedEmail,
  complaintUpdateEmail,
  emergencyCaseAssignedEmail,
  adminNoteEmail,
  officerWelcomeEmail
};
