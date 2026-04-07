const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'agriassist.smart@gmail.com',
    pass: 'jvgvakglrovygetn'
  }
});

const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: '"AgriAssist 🌱" <agriassist.smart@gmail.com>',
    to: email,
    subject: 'Verify Your Account',

    // ❌ REMOVE THIS
    // text: `Your OTP is ${otp}`,

    // ✅ ADD THIS
    html: `
    <div style="background:#f4f6f8;padding:20px;font-family:Arial;">
      <div style="max-width:500px;margin:auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 5px 15px rgba(0,0,0,0.1);">

        <div style="background:#2e7d32;color:white;padding:20px;text-align:center;">
          <h2>🌱 AgriAssist</h2>
          <p>Smart Farming Assistant</p>
        </div>

        <div style="padding:30px;text-align:center;">
          <h3>Email Verification</h3>
          <p>Use this OTP to continue</p>

          <div style="
            margin:20px auto;
            padding:15px 30px;
            font-size:30px;
            font-weight:bold;
            letter-spacing:6px;
            color:#2e7d32;
            background:#e8f5e9;
            border-radius:8px;
            display:inline-block;
          ">
            ${otp}
          </div>

          <p style="font-size:12px;color:gray;">
            Valid for 5 minutes
          </p>
        </div>

        <div style="background:#f1f1f1;padding:10px;text-align:center;font-size:12px;">
          © 2026 AgriAssist
        </div>

      </div>
    </div>
    `
  });
};

module.exports = sendOTP;