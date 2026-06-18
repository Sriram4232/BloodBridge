const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configurations (EMAIL_USER or EMAIL_PASS) are missing from the environment variables.');
    throw new Error('Email transport is not configured: missing credentials.');
  }

  // Create a transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"Blood Bridge" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html, 
  };

  try {
    console.log(`Attempting to send email to: ${options.email} with subject: "${options.subject}"`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email successfully sent to: ${options.email}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Error occurred while sending email to ${options.email}:`, error);
    throw error;
  }
};

module.exports = sendEmail;
