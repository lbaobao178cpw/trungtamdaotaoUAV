const express = require("express");
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');
const Brevo = require('@getbrevo/brevo');

// Lưu trữ OTP tạm thời (trong production nên dùng Redis)
const otpStore = new Map();

// Cấu hình Brevo
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

// Hàm tạo OTP 6 chữ số
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Hàm che email (chỉ hiển thị 3 ký tự đầu và domain)
const maskEmail = (email) => {
  if (!email) return null;
  const [name, domain] = email.split('@');
  const maskedName = name.substring(0, 3) + '***';
  return `${maskedName}@${domain}`;
};

// Hàm gửi email qua Brevo
const sendEmailWithBrevo = async (toEmail, otp) => {
  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  
  sendSmtpEmail.subject = "Mã OTP xác thực tra cứu giấy phép";
  sendSmtpEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0066cc 0%, #004499 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Xác thực OTP</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Xin chào,</p>
        <p style="font-size: 16px; color: #333;">Bạn đang tra cứu thông tin giấy phép điều khiển drone. Mã OTP của bạn là:</p>
        <div style="background: #0066cc; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #666;">⏱️ Mã này sẽ hết hạn sau <strong>5 phút</strong>.</p>
        <p style="font-size: 14px; color: #666;">⚠️ Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          Trung tâm đào tạo điều khiển UAV<br>
          Email này được gửi tự động, vui lòng không trả lời.
        </p>
      </div>
    </div>
  `;
  sendSmtpEmail.sender = { 
    name: "Trung tâm đào tạo UAV", 
    email: process.env.BREVO_SENDER_EMAIL || "noreply@uavtraining.vn" 
  };
  sendSmtpEmail.to = [{ email: toEmail }];
  
  return await apiInstance.sendTransacEmail(sendSmtpEmail);
};

/**
 * POST /api/otp/send
 * Gửi OTP qua email
 */
router.post("/send", async (req, res) => {
  try {
    const { searchType, searchValue, birthDate } = req.body;
    
    let email = null;
    let licenseNumber = null;
    
    // Tìm email dựa trên loại tra cứu
    if (searchType === 'license') {
      // Tra cứu theo số giấy phép
      const [licenses] = await db.query(`
        SELECT l.license_number, u.email, u.full_name
        FROM drone_licenses l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE l.license_number = ?
      `, [searchValue]);
      
      if (licenses.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy giấy phép với số này" });
      }
      
      email = licenses[0].email;
      licenseNumber = licenses[0].license_number;
      
    } else if (searchType === 'cccd') {
      // Tra cứu theo CCCD
      if (!birthDate) {
        return res.status(400).json({ error: "Vui lòng cung cấp ngày sinh" });
      }
      
      const [users] = await db.query(`
        SELECT u.id, u.email, u.full_name
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE p.identity_number = ? AND DATE(p.birth_date) = DATE(?)
      `, [searchValue, birthDate]);
      
      if (users.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy thông tin với CCCD và ngày sinh này" });
      }
      
      email = users[0].email;
      
    } else if (searchType === 'device') {
      // Tra cứu theo serial thiết bị
      const [devices] = await db.query(`
        SELECT d.license_number_ref, l.user_id, u.email
        FROM drone_devices d
        LEFT JOIN drone_licenses l ON d.license_number_ref = l.license_number
        LEFT JOIN users u ON l.user_id = u.id
        WHERE d.serial_number = ?
      `, [searchValue]);
      
      if (devices.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy thiết bị với số serial này" });
      }
      
      email = devices[0].email;
    }
    
    if (!email) {
      return res.status(400).json({ error: "Không tìm thấy email liên kết. Vui lòng liên hệ hỗ trợ." });
    }
    
    // Tạo OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // Hết hạn sau 5 phút
    
    // Lưu OTP vào store
    const otpKey = `${searchType}_${searchValue}`;
    otpStore.set(otpKey, {
      otp,
      expiresAt,
      email,
      attempts: 0,
      lastSent: Date.now()
    });
    
    // Gửi email qua Brevo
    await sendEmailWithBrevo(email, otp);
    
    console.log(`[API] OTP sent to ${maskEmail(email)}`);
    
    res.json({
      success: true,
      message: "Đã gửi mã OTP đến email của bạn",
      maskedEmail: maskEmail(email)
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: "Lỗi khi gửi OTP. Vui lòng thử lại sau." });
  }
});

/**
 * POST /api/otp/verify
 * Xác thực OTP
 */
router.post("/verify", async (req, res) => {
  try {
    const { searchType, searchValue, otp } = req.body;
    
    const otpKey = `${searchType}_${searchValue}`;
    const storedData = otpStore.get(otpKey);
    
    if (!storedData) {
      return res.status(400).json({ error: "Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng gửi lại." });
    }
    
    // Kiểm tra số lần thử
    if (storedData.attempts >= 5) {
      otpStore.delete(otpKey);
      return res.status(400).json({ error: "Đã vượt quá số lần thử. Vui lòng gửi mã OTP mới." });
    }
    
    // Kiểm tra hết hạn
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(otpKey);
      return res.status(400).json({ error: "Mã OTP đã hết hạn. Vui lòng gửi lại." });
    }
    
    // Kiểm tra OTP
    if (storedData.otp !== otp) {
      storedData.attempts++;
      otpStore.set(otpKey, storedData);
      return res.status(400).json({ 
        error: `Mã OTP không đúng. Còn ${5 - storedData.attempts} lần thử.` 
      });
    }
    
    // OTP đúng - xóa khỏi store
    otpStore.delete(otpKey);
    
    res.json({
      success: true,
      message: "Xác thực thành công"
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: "Lỗi khi xác thực OTP" });
  }
});

/**
 * POST /api/otp/resend
 * Gửi lại OTP
 */
router.post("/resend", async (req, res) => {
  try {
    const { searchType, searchValue, birthDate } = req.body;
    
    const otpKey = `${searchType}_${searchValue}`;
    const storedData = otpStore.get(otpKey);
    
    // Kiểm tra rate limit (chỉ cho phép gửi lại sau 60 giây)
    if (storedData && storedData.lastSent && (Date.now() - storedData.lastSent) < 60000) {
      const waitTime = Math.ceil((60000 - (Date.now() - storedData.lastSent)) / 1000);
      return res.status(429).json({ 
        error: `Vui lòng đợi ${waitTime} giây trước khi gửi lại.` 
      });
    }
    
    // Lấy email từ stored data hoặc query lại
    let email = storedData?.email;
    
    if (!email) {
      // Query lại email
      if (searchType === 'license') {
        const [licenses] = await db.query(`
          SELECT u.email FROM drone_licenses l
          LEFT JOIN users u ON l.user_id = u.id
          WHERE l.license_number = ?
        `, [searchValue]);
        email = licenses[0]?.email;
      } else if (searchType === 'cccd') {
        const [users] = await db.query(`
          SELECT u.email FROM users u
          LEFT JOIN user_profiles p ON u.id = p.user_id
          WHERE p.identity_number = ? AND DATE(p.birth_date) = DATE(?)
        `, [searchValue, birthDate]);
        email = users[0]?.email;
      } else if (searchType === 'device') {
        const [devices] = await db.query(`
          SELECT u.email FROM drone_devices d
          LEFT JOIN drone_licenses l ON d.license_number_ref = l.license_number
          LEFT JOIN users u ON l.user_id = u.id
          WHERE d.serial_number = ?
        `, [searchValue]);
        email = devices[0]?.email;
      }
    }
    
    if (!email) {
      return res.status(400).json({ error: "Không tìm thấy email liên kết." });
    }
    
    // Tạo OTP mới
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    
    // Cập nhật store
    otpStore.set(otpKey, {
      otp,
      expiresAt,
      email,
      attempts: 0,
      lastSent: Date.now()
    });
    
    // Gửi email qua Brevo
    await sendEmailWithBrevo(email, otp);
    
    console.log(`[API] OTP resent to ${maskEmail(email)}`);
    
    res.json({
      success: true,
      message: "Đã gửi lại mã OTP",
      maskedEmail: maskEmail(email)
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: "Lỗi khi gửi lại OTP" });
  }
});

module.exports = router;
