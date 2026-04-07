const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const auth = require("../middleware/auth");
require("dotenv").config();

/* ================= EMAIL SETUP ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ================= EMAIL TEMPLATE ================= */
const generateOTPTemplate = (otp, type = "verify") => {
  const isReset = type === "reset";

  return `
  <div style="background:#f4f6f8;padding:20px;font-family:Arial;">
    <div style="max-width:500px;margin:auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.1);">

      <!-- HEADER -->
      <div style="background:${isReset ? "#d32f2f" : "#2e7d32"};color:white;padding:20px;text-align:center;">
        <h2 style="margin:0;">AgriAssist 🌱</h2>
        <p style="margin:5px 0 0;">${isReset ? "Password Reset" : "Email Verification"}</p>
      </div>

      <!-- BODY -->
      <div style="padding:30px;text-align:center;">
        <h3>${isReset ? "Reset Your Password" : "Verify Your Account"}</h3>
        <p>
          ${
            isReset
              ? "Use this OTP to reset your password"
              : "Use this OTP to complete your registration"
          }
        </p>

        <div style="
          margin:25px auto;
          padding:15px 35px;
          font-size:32px;
          font-weight:bold;
          letter-spacing:6px;
          color:${isReset ? "#d32f2f" : "#2e7d32"};
          background:${isReset ? "#fdecea" : "#e8f5e9"};
          border-radius:10px;
          display:inline-block;
        ">
          ${otp}
        </div>

        <p style="font-size:13px;color:gray;">
          This OTP is valid for 5 minutes. Do not share it with anyone.
        </p>
      </div>

      <!-- FOOTER -->
      <div style="background:#f1f1f1;padding:12px;text-align:center;font-size:12px;color:#777;">
        © 2026 AgriAssist | Smart Farming Assistant
      </div>

    </div>
  </div>
  `;
};

/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  const { firstName, lastName, email, password, mobile } = req.body;

  try {
    const existing = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users(first_name,last_name,email,password,mobile)
       VALUES($1,$2,$3,$4,$5)`,
      [firstName, lastName, email, hashed, mobile]
    );

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.query(
      "INSERT INTO otp_codes(email,otp) VALUES($1,$2)",
      [email, otp]
    );

    /* 🔥 SEND BEAUTIFUL EMAIL */
    try {
      await transporter.sendMail({
        from: `"AgriAssist 🌱" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verify Your Account",
        html: generateOTPTemplate(otp, "verify"),
      });
    } catch (emailErr) {
      console.log("EMAIL ERROR:", emailErr);
      console.log("Fallback OTP:", otp);
    }

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.log("REGISTER ERROR:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

/* ================= VERIFY OTP ================= */
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM otp_codes 
       WHERE email=$1 AND otp=$2 
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    await pool.query(
      "UPDATE users SET is_verified=true WHERE email=$1",
      [email]
    );

    res.json({ message: "Verified successfully" });

  } catch (err) {
    console.log("OTP ERROR:", err);
    res.status(500).json({ error: "OTP verification failed" });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.rows[0].password);

    if (!valid) {
      return res.status(400).json({ error: "Wrong password" });
    }

    if (!user.rows[0].is_verified) {
      return res.status(400).json({ error: "Verify email first" });
    }

    const token = jwt.sign(
      { id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      userId: user.rows[0].id,
    });

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* ================= FORGOT PASSWORD ================= */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ error: "Email not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.query(
      "INSERT INTO otp_codes(email, otp) VALUES($1, $2)",
      [email, otp]
    );

    /* 🔥 BEAUTIFUL RESET EMAIL */
    try {
      await transporter.sendMail({
        from: `"AgriAssist 🌱" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Password Reset OTP",
        html: generateOTPTemplate(otp, "reset"),
      });
    } catch (emailErr) {
      console.log("EMAIL ERROR:", emailErr);
      console.log("RESET OTP:", otp);
    }

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.log("FORGOT ERROR:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

/* ================= RESET PASSWORD ================= */
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM otp_codes 
       WHERE email=$1 AND otp=$2 
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password=$1 WHERE email=$2",
      [hashed, email]
    );

    res.json({ message: "Password reset successful" });

  } catch (err) {
    console.log("RESET ERROR:", err);
    res.status(500).json({ error: "Reset failed" });
  }
});

/* ================= PROFILE ================= */
router.get("/profile", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE id=$1",
      [req.user.id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.log("PROFILE ERROR:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

/* ================= UPDATE PROFILE ================= */
router.post("/profile", auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET
        first_name=$1,
        last_name=$2,
        email=$3,
        mobile=$4,
        alt_mobile=$5,
        dob=$6,
        address=$7,
        pincode=$8
       WHERE id=$9`,
      [
        req.body.firstName,
        req.body.lastName,
        req.body.email,
        req.body.mobile,
        req.body.altMobile,
        req.body.dob,
        req.body.address,
        req.body.pincode,
        req.user.id,
      ]
    );

    res.json({ message: "Profile updated successfully" });

  } catch (err) {
    console.log("PROFILE UPDATE ERROR:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

module.exports = router;