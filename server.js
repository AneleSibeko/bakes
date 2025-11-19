// server.js

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require('cors');
const nodemailer = require('nodemailer');

dotenv.config(); // Load .env file

const app = express();
app.use(express.json());
app.use(cors());

// Support common env names for the MongoDB connection string
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!mongoUri) {
  console.error("❌ Missing MongoDB URI. Set MONGO_URI or MONGODB_URI in .env");
  process.exit(1);
}

// Mask credentials when logging
const maskedUri = mongoUri.replace(/:\/\/(?:[^:@\/\n]+)(?::[^@\/\n]*)?@/, '://***:***@');
console.log("Mongo URI (masked) is:", maskedUri);

// Connect to MongoDB
mongoose
  .connect(mongoUri)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.log("❌ MongoDB connection error:", err));

// Example route
app.get("/", (req, res) => {
  res.send("Welcome to Lunele Bakes!");
});

// POST /api/signup - accept username/email/password and send a welcome email
app.post('/api/signup', async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // If SMTP isn't configured, skip sending email (useful for local/dev)
    const smtpConfigured = !!(process.env.SMTP_HOST || (process.env.SMTP_USER && process.env.SMTP_PASS));
    if (!smtpConfigured) {
      console.log('SMTP not configured — skipping welcome email (development mode)');
      return res.status(200).json({ ok: true, message: 'Signup processed; email skipped (SMTP not configured).' });
    }

    // Create transporter using SMTP config from .env
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: (process.env.SMTP_SECURE === 'true') || false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
    });

    // Verify transporter (will throw if invalid)
    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.warn('Warning: SMTP transporter verification failed:', verifyErr.message || verifyErr);
      // continue — attempt to send anyway; some providers don't allow verify
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'no-reply@lunelebakes.com',
      to: email,
      subject: 'Welcome to Lunele Bakes — Thank you for signing up!',
      text: `Hi ${username || ''},\n\nThank you for signing up to Lunele Bakes! We're happy to have you with us.\n\n— The Lunele Bakes team`,
      html: `<p>Hi ${username || ''},</p><p>Thank you for signing up to <strong>Lunele Bakes</strong>! We're happy to have you with us.</p><p>— The Lunele Bakes team</p>`
    };

    // Send mail
    let info;
    try {
      info = await transporter.sendMail(mailOptions);
      console.log('Welcome email sent:', info && (info.messageId || info.accepted));
    } catch (sendErr) {
      console.error('Failed to send welcome email:', sendErr.stack || sendErr);
      // return a 502 to indicate email delivery problem while still allowing user creation
      return res.status(502).json({ error: 'Failed to send welcome email', detail: sendErr.message || String(sendErr) });
    }

    return res.status(200).json({ ok: true, message: 'Signup processed; welcome email sent.' });
  } catch (err) {
    console.error('Error in /api/signup:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

