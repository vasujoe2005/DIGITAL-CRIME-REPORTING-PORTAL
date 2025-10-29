require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vasuprabakar1985@gmail.com',
    pass: 'kpzjyaszcuavrqnh'
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log('SMTP Error:', error.message);
  } else {
    console.log('SMTP Server is ready to take messages');
  }
});

// Test sending an email
const testEmail = async () => {
  try {
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: 'vasuprabakar1985@gmail.com', // Replace with a real email for testing
      subject: 'Test Email from Digital Crime Portal',
      html: '<h1>Test Email</h1><p>This is a test email to verify SMTP configuration.</p>'
    });
    console.log('Test email sent:', info.messageId);
  } catch (error) {
    console.log('Error sending test email:', error.message);
  }
};

testEmail();
