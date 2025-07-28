// lib/emailservice.ts
import nodemailer from 'nodemailer';

// Define a simple interface for email options
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Configure Nodemailer transporter (example for Gmail)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASSWORD, // Your email app password or regular password
  },
});

/**
 * Sends an email using the configured nodemailer transporter.
 * @param options Email options including to, subject, and html content.
 */
async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.EMAIL_SERVICE) {
    console.error('Email credentials (EMAIL_USER, EMAIL_PASSWORD, EMAIL_SERVICE) not set in environment variables. Skipping email sending.');
    throw new Error('Email service not configured.');
  }
  if (!process.env.EMAIL_FROM) {
    console.warn('EMAIL_FROM environment variable is not set. Using default sender.');
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'no-reply@jobportal.com',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.to}`);
  } catch (error: unknown) {
    console.error(`Failed to send email to ${options.to}:`, error);
    if (error instanceof Error) {
        throw new Error(`Failed to send email: ${error.message}`);
    } else {
        throw new Error(`Failed to send email: An unknown error occurred.`);
    }
  }
}

export default sendEmail;