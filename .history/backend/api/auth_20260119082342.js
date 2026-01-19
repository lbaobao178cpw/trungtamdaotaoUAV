const express = require("express");
const router = express.Router();
const db = require('../config/db'); // Đảm bảo đường dẫn này đúng tới file db.js của bạn
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- ĐĂNG KÝ ---
router.post("/register", async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Nhận dữ liệu từ Frontend (formData)
    const {
      // Thông tin đăng nhập
      phone, email, password, fullName,
      // Thông tin CCCD & Cá nhân
      birthDate, cccd, idNumber, issueDate, gender,
      address, ward, district, city,
      // Địa chỉ thường trú
      permanentAddress, permanentWard, permanentDistrict, permanentCity,
      // Liên hệ khẩn cấp
      emergencyName, emergencyPhone, emergencyRelation,
      // Thông tin UAV (Mảng)
      uavTypes, uavPurposes, activityArea, experience, certificateType
    } = req.body;

    // 2. Kiểm tra tồn tại (Phone hoặc Email)
    const [existing] = await connection.query("SELECT id FROM users WHERE phone = ? OR email = ?", [phone, email]);
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: "Số điện thoại hoặc Email đã tồn tại trong hệ thống." });
    }

    // 3. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 4. Insert vào bảng USERS
    const [userResult] = await connection.query(
      `INSERT INTO users (phone, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'student')`,
      [phone, email, password_hash, fullName]
    );
    const newUserId = userResult.insertId;

    // 5. Xử lý dữ liệu mảng thành chuỗi để lưu (VD: ["DJI", "Autel"] => "DJI, Autel")
    const uavTypeString = Array.isArray(uavTypes) ? uavTypes.join(', ') : uavTypes;
    const uavPurposeString = Array.isArray(uavPurposes) ? uavPurposes.join(', ') : uavPurposes;

    // Tạo địa chỉ đầy đủ từ các trường lẻ
    const fullCurrentAddress = `${address}, ${ward}, ${district}, ${city}`;
    const fullPermanentAddress = `${permanentAddress}, ${permanentWard}, ${permanentDistrict}, ${permanentCity}`;

    // 6. Insert vào bảng USER_PROFILES
    // Lưu ý: Đảm bảo tên cột khớp với DB bạn đã tạo
    await connection.query(
      `INSERT INTO user_profiles 
      (user_id, address, permanent_address, identity_number, 
       emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
       uav_type, usage_purpose, operation_area, uav_experience, target_tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newUserId,
        fullCurrentAddress,
        fullPermanentAddress,
        cccd, // Dùng số CCCD làm identity_number
        emergencyName,
        emergencyPhone,
        emergencyRelation,
        uavTypeString,
        uavPurposeString,
        activityArea,
        experience,
        certificateType
      ]
    );

    await connection.commit();
    res.status(201).json({ message: "Đăng ký thành công", userId: newUserId });

  } catch (error) {
    await connection.rollback();
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ error: "Lỗi server khi đăng ký: " + error.message });
  } finally {
    connection.release();
  }
});

// --- ĐĂNG NHẬP (User & Admin) ---
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body; // identifier có thể là email hoặc phone

  try {
    // 1. Tìm user theo Email HOẶC Phone
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? OR phone = ?",
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Tài khoản không tồn tại" });
    }

    const user = rows[0];

    // 2. So sánh mật khẩu
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      return res.status(400).json({ error: "Mật khẩu không đúng" });
    }

    // 3. Kiểm tra tài khoản có hoạt động không
    if (!user.is_active) {
      return res.status(403).json({ error: "Tài khoản của bạn đã bị khóa" });
    }

    // 4. Tạo Token (JWT)
    const token = jwt.sign(
      { id: user.id, role: user.role, fullName: user.full_name },
      process.env.JWT_SECRET || "YOUR_SECRET_KEY", // Thay bằng chuỗi bí mật của bạn (nên để trong .env)
      { expiresIn: "1d" }
    );

    // 5. Lấy dữ liệu khác nhau dựa vào role
    let responseData = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar
    };

    // Nếu là admin, thêm thông tin đặc biệt
    if (user.role === 'admin') {
      responseData.permissions = ['manage_users', 'manage_courses', 'manage_exams', 'manage_settings'];
    }

    res.json({
      message: "Đăng nhập thành công",
      token,
      user: responseData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi đăng nhập" });
  }
});

// --- ĐĂNG NHẬP ADMIN (Riêng) ---
router.post("/login-admin", async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const [rows] = await db.query(
        "SELECT * FROM users WHERE (email = ? OR phone = ?) AND role = 'admin'", 
        [identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Thông tin đăng nhập admin không hợp lệ" });
    }

    const admin = rows[0];

    // So sánh mật khẩu
    const validPass = await bcrypt.compare(password, admin.password_hash);
    if (!validPass) {
      return res.status(401).json({ error: "Mật khẩu không đúng" });
    }

    // Kiểm tra tài khoản
    if (!admin.is_active) {
      return res.status(403).json({ error: "Tài khoản admin đã bị khóa" });
    }

    // Tạo Token
    const token = jwt.sign(
        { id: admin.id, role: admin.role, fullName: admin.full_name }, 
        "YOUR_SECRET_KEY",
        { expiresIn: "1d" }
    );

    res.json({
      message: "Đăng nhập Admin thành công",
      token,
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
    console.error(error);
    res.status(500).json({ error: "Lỗi đăng nhập admin" });
  }
});

module.exports = router;