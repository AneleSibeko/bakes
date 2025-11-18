// server.js

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config(); // Load .env file

const app = express();
app.use(express.json());

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

