const express = require("express");
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateToken, verifyTokenData } = require('../middleware/verifyToken');

// --- 1. API CHECK TRÙNG LẶP (Dùng cho Frontend check ngay khi nhập) ---
router.post("/check-existence", async (req, res) => {
  try {
    const { type, value } = req.body;
    if (!value) return res.json({ exists: false });

    let query = "";
    if (type === 'email') query = "SELECT id FROM users WHERE email = ?";
    else if (type === 'phone') query = "SELECT id FROM users WHERE phone = ?";
    else return res.status(400).json({ error: "Invalid type" });

    const [rows] = await db.query(query, [value]);
    res.json({ exists: rows.length > 0 });
  } catch (error) {
    console.error("Check existence error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// --- 2. API ĐĂNG KÝ (Đã sửa lỗi target_tier) ---
router.post("/register", async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      phone, email, password, fullName,
      birthDate, cccd, gender, 
      finalPermanentAddress, finalCurrentAddress,
      address, ward, district, city, 
      permanentAddress, permanentWard, permanentDistrict, permanentCity,
      emergencyName, emergencyPhone, emergencyRelation,
      uavTypes, uavPurpose, activityArea, experience, certificateType
    } = req.body;

    // Check trùng lần cuối
    const [existing] = await connection.query("SELECT id FROM users WHERE phone = ? OR email = ?", [phone, email]);
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: "Số điện thoại hoặc Email đã tồn tại trong hệ thống." });
    }

    // Hash pass
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert Users
    const [userResult] = await connection.query(
      `INSERT INTO users (phone, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'student')`,
      [phone, email, password_hash, fullName]
    );
    const newUserId = userResult.insertId;

    // Chuẩn bị data Profile
    const uavTypeString = Array.isArray(uavTypes) ? uavTypes.join(', ') : uavTypes;
    const dbCurrentAddress = finalCurrentAddress || [address, ward, district, city].filter(Boolean).join(', ');
    const dbPermanentAddress = finalPermanentAddress || [permanentAddress, permanentWard, permanentDistrict, permanentCity].filter(Boolean).join(', ');

    // Insert Profile
    const insertProfileSql = `
      INSERT INTO user_profiles 
      (user_id, address, permanent_address, identity_number, birth_date, gender,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        uav_type, usage_purpose, operation_area, uav_experience, target_tier,
        identity_image_front, identity_image_back)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.query(insertProfileSql, [
      newUserId, dbCurrentAddress, dbPermanentAddress, cccd, birthDate || null, gender || null,
      emergencyName, emergencyPhone, emergencyRelation,
      uavTypeString, uavPurpose, activityArea, experience,
      certificateType || null, // Fix lỗi data truncated
      null, null
    ]);

    await connection.commit();
    res.status(201).json({ message: "Đăng ký thành công", userId: newUserId });

  } catch (error) {
    await connection.rollback();
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ error: "Lỗi server: " + error.message });
  } finally {
    connection.release();
  }
});

// --- 3. API ĐĂNG NHẬP (User thường) ---
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body; 
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ? OR phone = ?", [identifier, identifier]);
    if (rows.length === 0) return res.status(400).json({ error: "Tài khoản không tồn tại" });
    
    const user = rows[0];
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) return res.status(400).json({ error: "Mật khẩu không đúng" });
    if (!user.is_active) return res.status(403).json({ error: "Tài khoản bị khóa" });

    const token = generateToken({ id: user.id, role: user.role, fullName: user.full_name, email: user.email }, 'access');
    const refreshToken = generateToken({ id: user.id, role: user.role }, 'refresh');
    
    let responseData = { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar };
    if (user.role === 'admin') responseData.permissions = ['manage_users', 'manage_courses', 'manage_exams', 'manage_settings'];

    res.json({ success: true, message: "Đăng nhập thành công", token, refreshToken, user: responseData });
  } catch (error) { console.error(error); res.status(500).json({ error: "Lỗi đăng nhập" }); }
});

// --- 4. API ĐĂNG NHẬP ADMIN (ĐÂY LÀ PHẦN BỊ THIẾU TRƯỚC ĐÓ) ---
router.post("/login-admin", async (req, res) => {
  const { identifier, password } = req.body;
  try {
    // Chỉ lấy user có role = 'admin'
    const [rows] = await db.query(
      "SELECT * FROM users WHERE (email = ? OR phone = ?) AND role = 'admin'",
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Thông tin đăng nhập admin không hợp lệ hoặc bạn không có quyền admin" });
    }

    const admin = rows[0];
    const validPass = await bcrypt.compare(password, admin.password_hash);
    if (!validPass) return res.status(401).json({ error: "Mật khẩu không đúng" });
    if (!admin.is_active) return res.status(403).json({ error: "Tài khoản admin đã bị khóa" });

    const token = generateToken({ id: admin.id, role: admin.role, fullName: admin.full_name, email: admin.email }, 'access');
    const refreshToken = generateToken({ id: admin.id, role: admin.role }, 'refresh');

    res.json({
      success: true,
      message: "Đăng nhập Admin thành công",
      token,
      refreshToken,
      user: {
        id: admin.id,
        full_name: admin.full_name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        avatar: admin.avatar,
        permissions: ['manage_users', 'manage_courses', 'manage_exams', 'manage_settings', 'view_analytics']
      }
    });

  } catch (error) {
    console.error("Lỗi login admin:", error);
    res.status(500).json({ error: "Lỗi đăng nhập admin" });
  }
});

// --- 5. REFRESH TOKEN ---
router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: "Thiếu token", code: 'NO_REFRESH_TOKEN' });
    
    const decoded = verifyTokenData(refreshToken, 'refresh');
    const [rows] = await db.query("SELECT id, role, full_name, email FROM users WHERE id = ?", [decoded.id]);
    
    if (rows.length === 0) return res.status(401).json({ success: false, error: "User không tồn tại", code: 'USER_NOT_FOUND' });
    
    const newToken = generateToken({ id: rows[0].id, role: rows[0].role, fullName: rows[0].full_name, email: rows[0].email }, 'access');
    res.json({ success: true, token: newToken });
  } catch (error) { res.status(401).json({ success: false, error: "Token lỗi", code: 'INVALID_REFRESH_TOKEN' }); }
});

// --- 6. VERIFY TOKEN ---
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: "No token", code: 'NO_TOKEN' });
    
    const decoded = verifyTokenData(token, 'access');
    const [rows] = await db.query("SELECT id, full_name, email, phone, role, avatar FROM users WHERE id = ?", [decoded.id]);
    
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Not found", code: 'USER_NOT_FOUND' });
    res.json({ success: true, user: rows[0] });
  } catch (error) { res.status(401).json({ success: false, error: "Invalid token", code: 'INVALID_TOKEN' }); }
});

module.exports = router;