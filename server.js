const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ---------------- MONGODB ----------------
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected 🚀"))
  .catch(err => console.log("MongoDB Error:", err));

// ---------------- SOCKET ----------------
io.on("connection", (socket) => {
  console.log("Client Connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client Disconnected:", socket.id);
  });
});

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

    io.emit("newLead", {
      name: data.name,
      phone: data.phone,
      loanType: data.loanType,
      loanAmount: data.loan
    });

    return res.status(201).json({
      success: true,
      message: "Enquiry saved successfully"
    });

  } catch (err) {
    console.log("ENQUIRY ERROR:", err); // 🔥 DEBUG LOG

    return res.status(500).json({
      success: false,
      message: "Error saving enquiry"
    });
  }
});

// ---------------- ADMIN LOGIN ----------------
app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({
        success: false,
        message: "Invalid login"
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid login"
      });
    }

    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      token
    });

  } catch (err) {
    console.log("LOGIN ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ---------------- TOKEN MIDDLEWARE ----------------
function verifyToken(req, res, next) {
  let token = req.headers["authorization"];

  console.log("AUTH HEADER:", token);
  console.log("JWT SECRET EXISTS:", !!process.env.JWT_SECRET);

  if (!token) {
    return res.status(403).json({
      success: false,
      message: "Token missing"
    });
  }

  if (token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("TOKEN VERIFIED:", decoded);

    req.user = decoded;
    next();

  } catch (err) {

    console.log("JWT ERROR:", err.message);

    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
}
// ---------------- LEADS API ----------------
app.get("/leads", verifyToken, async (req, res) => {
  try {
    const data = await Enquiry.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    console.log("LEADS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Error fetching leads"
    });
  }
});

// ---------------- DELETE LEAD ----------------
app.delete("/leads/:id", verifyToken, async (req, res) => {
  try {
    await Enquiry.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Lead deleted successfully"
    });

  } catch (err) {
    console.log("DELETE ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Error deleting lead"
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
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
