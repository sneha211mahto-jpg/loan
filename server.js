const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------- STATIC FILES ----------------
app.use(express.static(__dirname));

// ---------------- MONGODB ----------------
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected 🚀"))
.catch(err => console.log(err));

// ---------------- SCHEMA ----------------
const enquirySchema = new mongoose.Schema({
  name: String,
  phone: String,
  loan: String,
  salary: String,
  loanType: String,
  createdAt: { type: Date, default: Date.now }
});

const Enquiry = mongoose.model("Enquiry", enquirySchema);

// ---------------- ENQUIRY API ----------------
app.post("/enquiry", async (req, res) => {
  try {
    const data = new Enquiry(req.body);
    await data.save();

    res.json({
      success: true,
      message: "Enquiry saved"
    });
  } catch (err) {
    res.json({
      success: false,
      message: "Error saving enquiry"
    });
  }
});

// ---------------- ADMIN LOGIN (GMAIL + FIXED PASSWORD + JWT) ----------------
app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;

  // 🔥 RULE 1: must be gmail
  const isGmail = email.endsWith("@gmail.com");

  // 🔥 RULE 2: fixed password
  const isPasswordCorrect = password === "261991";

  if (isGmail && isPasswordCorrect) {
    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token: token
    });
  }

  return res.status(401).json({
    success: false,
    message: "Only Gmail allowed + correct password required"
  });
});

// ---------------- TOKEN MIDDLEWARE ----------------
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({
      success: false,
      message: "Token missing"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
}

// ---------------- LEADS API (PROTECTED) ----------------
app.get("/leads", verifyToken, async (req, res) => {
  try {
    const data = await Enquiry.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching leads"
    });
  }
});

// ---------------- DASHBOARD ----------------
app.get("/admin/dashboard", verifyToken, (req, res) => {
  res.json({
    success: true,
    message: "Welcome Admin 🚀",
    user: req.user
  });
});

// ---------------- SERVER ----------------
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});