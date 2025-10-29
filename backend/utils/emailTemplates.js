function getBaseTemplate(title, content) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: linear-gradient(135deg, #e0f2fe 0%, #e8eaf6 100%);
          border: 2px solid #2563eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        .content {
          padding: 30px;
          color: #374151;
          line-height: 1.6;
        }
        .content p {
          margin: 0 0 15px 0;
        }
        .highlight {
          background-color: #dbeafe;
          border-left: 4px solid #2563eb;
          padding: 15px;
          margin: 20px 0;
          border-radius: 6px;
        }
        .footer {
          background-color: #f1f5f9;
          padding: 20px;
          text-align: center;
          font-size: 14px;
          color: #64748b;
        }
        .emoji {
          font-size: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Thank you for using our portal. <span class="emoji">🙏</span></p>
          <p>If you have any questions, please contact support.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function otpEmail(otp) {
  const content = `
    <p>Hello! <span class="emoji">👋</span></p>
    <p>We have sent you a One-Time Password (OTP) to verify your email address.</p>
    <div class="highlight">
      <p><strong>Your OTP is:</strong> <span style="font-size: 24px; color: #2563eb;">${otp}</span></p>
      <p>This code is valid for 10 minutes. Please do not share it with anyone.</p>
    </div>
    <p>If you did not request this, please ignore this email.</p>
  `;
  return getBaseTemplate('Your OTP Code', content);
}

function complaintSubmittedEmail(complaintId) {
  const content = `
    <p>Hello! <span class="emoji">📋</span></p>
    <p>Your complaint has been successfully submitted to our system.</p>
    <div class="highlight">
      <p><strong>Complaint ID:</strong> ${complaintId}</p>
      <p>Our team will review your submission and assign it to the appropriate officer shortly.</p>
    </div>
    <p>You can track the status of your complaint by logging into your dashboard.</p>
    <p>Thank you for helping us maintain a safe community! <span class="emoji">🛡️</span></p>
  `;
  return getBaseTemplate('Complaint Submitted Successfully', content);
}

function caseAssignedEmail(complaint) {
  const content = `
    <p>Hello Officer! <span class="emoji">👮‍♂️</span></p>
    <p>A new case has been assigned to you for immediate attention.</p>
    <div class="highlight">
      <p><strong>Complaint ID:</strong> ${complaint._id}</p>
      <p><strong>Type:</strong> ${complaint.type}</p>
      <p><strong>Location:</strong> ${complaint.location}</p>
      <p><strong>Date & Time:</strong> ${complaint.date} ${complaint.time}</p>
      <p><strong>Description:</strong> ${complaint.description}</p>
      <p><strong>Status:</strong> ${complaint.status}</p>
      <p><strong>Anonymous:</strong> ${complaint.anonymous ? 'Yes' : 'No'}</p>
    </div>
    <p>Please log in to your dashboard to view the complete case details and any attached evidence files.</p>
    <p><strong>Action Required:</strong> Review and update the case status as soon as possible. <span class="emoji">⚡</span></p>
  `;
  return getBaseTemplate('New Case Assigned - Action Required', content);
}

function complaintUpdateEmail(complaintId, note) {
  const content = `
    <p>Hello! <span class="emoji">📢</span></p>
    <p>There has been an update to your complaint.</p>
    <div class="highlight">
      <p><strong>Complaint ID:</strong> ${complaintId}</p>
      <p><strong>Update:</strong> ${note}</p>
    </div>
    <p>Please log in to your dashboard for more details.</p>
    <p>We appreciate your patience and cooperation. <span class="emoji">🤝</span></p>
  `;
  return getBaseTemplate('Update on Your Complaint', content);
}

function emergencyCaseAssignedEmail(complaint) {
  const content = `
    <p>Hello Officer! <span class="emoji">🚨</span></p>
    <p><strong style="color: #dc2626;">EMERGENCY CASE ASSIGNED - IMMEDIATE ACTION REQUIRED!</strong></p>
    <div class="highlight" style="border-left-color: #dc2626; background-color: #fef2f2;">
      <p><strong>Complaint ID:</strong> ${complaint._id}</p>
      <p><strong>Type:</strong> ${complaint.type}</p>
      <p><strong>Location:</strong> ${complaint.location}</p>
      <p><strong>Date & Time:</strong> ${complaint.date} ${complaint.time}</p>
      <p><strong>Description:</strong> ${complaint.description}</p>
      <p><strong>Status:</strong> ${complaint.status}</p>
    </div>
    <p style="color: #dc2626; font-weight: bold;">This is an EMERGENCY case. Please respond immediately! <span class="emoji">⚠️</span></p>
    <p>Log in to your dashboard to view complete details and evidence files.</p>
  `;
  return getBaseTemplate('🚨 EMERGENCY CASE ASSIGNED', content);
}

function adminNoteEmail(complaintId, note) {
  const content = `
    <p>Hello Officer! <span class="emoji">📝</span></p>
    <p>An admin has added a note to one of your assigned cases.</p>
    <div class="highlight">
      <p><strong>Complaint ID:</strong> ${complaintId}</p>
      <p><strong>Admin Note:</strong> ${note}</p>
    </div>
    <p>Please review the case and take appropriate action if needed.</p>
    <p>Thank you for your service! <span class="emoji">🙌</span></p>
  `;
  return getBaseTemplate('Admin Note on Case', content);
}

function officerWelcomeEmail(fullName, email, password) {
  const content = `
    <p>Congratulations ${fullName}! <span class="emoji">🎉</span></p>
    <p>Welcome to the Digital Crime Management Portal! You have been successfully added as an officer.</p>
    <div class="highlight">
      <p><strong>Your Login Credentials:</strong></p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${password}</p>
      <p style="color: #dc2626; font-weight: bold;">⚠️ Please change your password after first login for security reasons.</p>
    </div>
    <p>You can now log in to your dashboard to view assigned cases, update case statuses, and manage investigations.</p>
    <p>We are excited to have you on board! Your dedication to public safety is greatly appreciated. <span class="emoji">🛡️</span></p>
  `;
  return getBaseTemplate('Welcome to Digital Crime Management Portal', content);
}

module.exports = {
  otpEmail,
  complaintSubmittedEmail,
  caseAssignedEmail,
  complaintUpdateEmail,
  emergencyCaseAssignedEmail,
  adminNoteEmail,
  officerWelcomeEmail
};
