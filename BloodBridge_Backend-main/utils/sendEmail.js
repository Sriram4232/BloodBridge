const nodemailer = require('nodemailer');
const dns = require('dns').promises;

const sendEmail = async (options) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configurations (EMAIL_USER or EMAIL_PASS) are missing from the environment variables.');
    throw new Error('Email transport is not configured: missing credentials.');
  }

  // Force DNS lookup of smtp.gmail.com to IPv4 to bypass Render's IPv6 ENETUNREACH issues
  let smtpHost = 'smtp.gmail.com';
  try {
    const addresses = await dns.resolve4('smtp.gmail.com');
    if (addresses && addresses.length > 0) {
      smtpHost = addresses[0];
      console.log(`Resolved smtp.gmail.com to IPv4: ${smtpHost}`);
    }
  } catch (dnsErr) {
    console.warn('Failed to resolve smtp.gmail.com to IPv4 using dns.resolve4, falling back to hostname:', dnsErr);
  }

  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      servername: 'smtp.gmail.com', // Crucial for certificate validation when host is an IP
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
