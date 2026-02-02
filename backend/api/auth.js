const express = require("express");
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateToken, verifyTokenData } = require('../middleware/verifyToken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// ===== RATE LIMITING CONFIGURATION =====
// Rate limiter cho login endpoint
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 5, // Tối đa 5 lần thử/5 phút
  message: { error: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 5 phút.' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limit cho admin nếu cần (tùy chọn)
    return false;
  }
  // Không custom keyGenerator - để mặc định sử dụng IP helper từ express-rate-limit
});

// Rate limiter cho register endpoint
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5, // Tối đa 5 lần đăng ký/giờ từ cùng 1 IP
  message: 'Quá nhiều lần đăng ký từ địa chỉ này. Vui lòng thử lại sau 1 giờ.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter cho refresh token endpoint
const refreshTokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 10, // Tối đa 10 requests/phút
  message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.',
  standardHeaders: true,
  legacyHeaders: false
});

// Normalize gender for storage: map common variants to 'Nam' or 'Nữ', else capitalize
function normalizeGenderForStorage(g) {
  if (!g) return null;
  try {
    const s = String(g).trim();
    if (s === '') return null;
    const lowered = s.toLowerCase();
    const stripped = lowered.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['nam', 'n', 'male', 'm'].includes(stripped)) return 'Nam';
    if (['nu', 'nu', 'female', 'f'].includes(stripped) || stripped === 'nu') return 'Nữ';
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch (e) {
    return g;
  }
}

// === AUTO MIGRATION: Tạo bảng user_sessions nếu chưa có ===
(async () => {
  try {
    // Kiểm tra bảng user_sessions có tồn tại không
    const [tables] = await db.query(
      "SHOW TABLES LIKE 'user_sessions'"
    );

    if (tables.length === 0) {
      await db.query(`
        CREATE TABLE user_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token VARCHAR(500) UNIQUE,
          device_id VARCHAR(255),
          device_name VARCHAR(255),
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE,
          INDEX idx_user_id (user_id),
          INDEX idx_token (token),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Created user_sessions table');
    }

    // Kiểm tra và thêm cột active_session_id vào users
    const [columns1] = await db.query(
      "SHOW COLUMNS FROM users LIKE 'active_session_id'"
    );
    if (columns1.length === 0) {
      await db.query("ALTER TABLE users ADD COLUMN active_session_id INT DEFAULT NULL");
      console.log('✅ Added active_session_id column to users table');
    }

    // Kiểm tra và thêm cột active_device_id vào users
    const [columns2] = await db.query(
      "SHOW COLUMNS FROM users LIKE 'active_device_id'"
    );
    if (columns2.length === 0) {
      await db.query("ALTER TABLE users ADD COLUMN active_device_id VARCHAR(255) DEFAULT NULL");
      console.log('✅ Added active_device_id column to users table');
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  }
})();

// Hàm tạo unique device ID dựa trên device info
const generateDeviceId = (userAgent, ipAddress) => {
  const deviceInfo = `${userAgent}-${ipAddress}`;
  return crypto.createHash('md5').update(deviceInfo).digest('hex');
};

// Hàm lấy device name từ user agent
const getDeviceName = (userAgent) => {
  if (!userAgent) return 'Unknown Device';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPad')) return 'iPad';
  return 'Mobile Device';
};

// --- 1. API CHECK TRÙNG LẶP (Dùng cho Frontend check ngay khi nhập) ---
router.post("/check-existence", async (req, res) => {
  try {
    const { type, value } = req.body;
    console.log(`[Check Existence] Received - type="${type}", value="${value}"`);
    if (!value) return res.json({ exists: false });

    let query = "";
    if (type === 'email') query = "SELECT id FROM users WHERE email = ?";
    else if (type === 'phone') query = "SELECT id FROM users WHERE phone = ?";
    else if (type === 'cccd') query = "SELECT user_id FROM user_profiles WHERE identity_number = ?";
    else {
      console.log(`[Check Existence] Invalid type: ${type}`);
      return res.status(400).json({ error: "Invalid type" });
    }

    const [rows] = await db.query(query, [value]);
    const exists = rows.length > 0;
    console.log(`[Check Existence] Query result - exists: ${exists}`);
    res.json({ exists });
  } catch (error) {
    console.error("Check existence error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// --- 2. API ĐĂNG KÝ (Đã sửa lỗi target_tier) ---
router.post("/register", registerLimiter, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      phone, email, password, fullName,
      birthDate, cccd, gender, jobTitle, workPlace,
      finalPermanentAddress, finalCurrentAddress,
      permanentAddress, permanentWard, permanentDistrict, permanentCity,
      permanentCityId, permanentWardId,
      currentAddress, currentWard, currentDistrict, currentCity,
      currentCityId, currentWardId,
      emergencyName, emergencyPhone, emergencyRelation,
      uavTypes, uavPurpose, activityArea, experience, certificateType,
      cccdFront, cccdBack, tierBServices
    } = req.body;

    // === VALIDATION: TẤT CẢ CÁC TRƯỜNG BẮT BUỘC ===
    const requiredFields = {
      phone: 'Số điện thoại',
      email: 'Email',
      password: 'Mật khẩu',
      fullName: 'Họ và tên',
      birthDate: 'Ngày sinh',
      cccd: 'Số CCCD/CMND',
      gender: 'Giới tính',
      jobTitle: 'Nghề nghiệp',
      workPlace: 'Nơi làm việc',
      permanentAddress: 'Địa chỉ hộ khẩu',
      permanentCityId: 'Tỉnh/Thành phố hộ khẩu',
      permanentWardId: 'Xã/Phường hộ khẩu',
      currentAddress: 'Địa chỉ hiện tại',
      currentCityId: 'Tỉnh/Thành phố hiện tại',
      currentWardId: 'Xã/Phường hiện tại',
      emergencyName: 'Tên người liên hệ khẩn cấp',
      emergencyPhone: 'SĐT người liên hệ khẩn cấp',
      emergencyRelation: 'Mối quan hệ',
      uavPurpose: 'Mục đích sử dụng',
      activityArea: 'Khu vực hoạt động',
      experience: 'Kinh nghiệm',
      certificateType: 'Loại chứng chỉ',
      cccdFront: 'Ảnh CCCD mặt trước',
      cccdBack: 'Ảnh CCCD mặt sau'
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field]) {
        connection.release();
        return res.status(400).json({ error: `${label} không được bỏ trống` });
      }
    }

    // Check trùng lần cuối
    const [existing] = await connection.query("SELECT id FROM users WHERE phone = ? OR email = ?", [phone, email]);
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: "Số điện thoại hoặc Email đã tồn tại trong hệ thống." });
    }

    // Hash pass
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert Users (new registrations are not approved by default)
    const [userResult] = await connection.query(
      `INSERT INTO users (phone, email, password_hash, full_name, role, is_approved) VALUES (?, ?, ?, ?, 'student', 0)`,
      [phone, email, password_hash, fullName]
    );
    const newUserId = userResult.insertId;

    // Chuẩn bị data Profile
    const uavTypeString = uavTypes ? (Array.isArray(uavTypes) ? uavTypes.join(', ') : uavTypes) : null;
    const dbCurrentAddress = currentAddress || [currentCity, currentWard, currentDistrict].filter(Boolean).join(', ');
    const dbPermanentAddress = permanentAddress || [permanentCity, permanentWard, permanentDistrict].filter(Boolean).join(', ');

    // Insert Profile với tất cả các trường
    const insertProfileSql = `
      INSERT INTO user_profiles 
      (user_id, address, permanent_address, identity_number, birth_date, gender,
        job_title, work_place, current_address,
        permanent_city_id, permanent_ward_id, current_city_id, current_ward_id,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        uav_type, usage_purpose, operation_area, uav_experience, target_tier,
        identity_image_front, identity_image_back, tier_b_services)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const tierBServicesJson = tierBServices && tierBServices.length > 0 
      ? JSON.stringify(tierBServices) 
      : null;

    await connection.query(insertProfileSql, [
      newUserId, 
      dbCurrentAddress, 
      dbPermanentAddress, 
      cccd, 
      birthDate || null, 
      normalizeGenderForStorage(gender),
      jobTitle,
      workPlace,
      dbCurrentAddress,
      permanentCityId || null,
      permanentWardId || null,
      currentCityId || null,
      currentWardId || null,
      emergencyName, 
      emergencyPhone, 
      emergencyRelation,
      uavTypeString || null, 
      uavPurpose, 
      activityArea, 
      experience,
      certificateType || null,
      cccdFront || null,
      cccdBack || null,
      tierBServicesJson
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
router.post("/login", loginLimiter, async (req, res) => {
  const { identifier, password } = req.body;
  const userAgent = req.get('user-agent') || '';
  const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
  
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ? OR phone = ?", [identifier, identifier]);
    if (rows.length === 0) return res.status(400).json({ error: "Tài khoản không tồn tại" });

    const user = rows[0];
    
    // Check if account is locked due to failed login attempts
    if (user.is_active === 0) {
      return res.status(403).json({ error: "Tài khoản bị khóa. Vui lòng liên hệ admin." });
    }
    
    const validPass = await bcrypt.compare(password, user.password_hash);
    
    // Handle failed login attempt
    if (!validPass) {
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      
      // Lock account if failed attempts reach 5
      if (failedAttempts >= 5) {
        await db.query(
          "UPDATE users SET is_active = 0, failed_login_attempts = ?, last_failed_login = NOW() WHERE id = ?",
          [failedAttempts, user.id]
        );
        return res.status(403).json({ 
          error: "Tài khoản của bạn đã bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng liên hệ admin để mở khóa." 
        });
      } else {
        // Just increment failed attempts
        await db.query(
          "UPDATE users SET failed_login_attempts = ?, last_failed_login = NOW() WHERE id = ?",
          [failedAttempts, user.id]
        );
        const attemptsLeft = 5 - failedAttempts;
        return res.status(400).json({ 
          error: `Mật khẩu không đúng. Bạn còn ${attemptsLeft} lần thử.` 
        });
      }
    }
    
    // Check if student account is approved by admin
    if (user.role === 'student' && !user.is_approved) {
      return res.status(403).json({ error: "Tài khoản của bạn đang chờ admin phê duyệt. Vui lòng quay lại sau." });
    }

    // Reset failed login attempts on successful login
    await db.query(
      "UPDATE users SET failed_login_attempts = 0, last_failed_login = NULL WHERE id = ?",
      [user.id]
    );

    const token = generateToken({ id: user.id, role: user.role, fullName: user.full_name, email: user.email }, 'access');
    const refreshToken = generateToken({ id: user.id, role: user.role }, 'refresh');
    
    // Tạo device ID
    const deviceId = generateDeviceId(userAgent, ipAddress);
    const deviceName = getDeviceName(userAgent);

    // === XÓA SESSION CŨ (LOGOUT CÁC THIẾT BỊ KHÁC) ===
    await db.query(
      "DELETE FROM user_sessions WHERE user_id = ? AND device_id != ?",
      [user.id, deviceId]
    );

    // === TẠO SESSION MỚI ===
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Xóa session cũ của device này nếu có
      await connection.query(
        "DELETE FROM user_sessions WHERE user_id = ? AND device_id = ?",
        [user.id, deviceId]
      );

      // Tạo session mới
      const [sessionResult] = await connection.query(
        `INSERT INTO user_sessions (user_id, token, device_id, device_name, ip_address, user_agent, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [user.id, token, deviceId, deviceName, ipAddress, userAgent]
      );

      // Cập nhật active session trong users table
      await connection.query(
        "UPDATE users SET active_session_id = ?, active_device_id = ? WHERE id = ?",
        [sessionResult.insertId, deviceId, user.id]
      );

      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    let responseData = { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar };
    if (user.role === 'admin') responseData.permissions = ['manage_users', 'manage_courses', 'manage_exams', 'manage_settings'];

    res.json({ 
      success: true, 
      message: "Đăng nhập thành công", 
      token, 
      refreshToken, 
      user: responseData,
      deviceId,
      deviceName
    });
  } catch (error) { 
    console.error(error); 
    res.status(500).json({ error: "Lỗi đăng nhập" }); 
  }
});

// --- 4. API ĐĂNG NHẬP ADMIN (ĐÂY LÀ PHẦN BỊ THIẾU TRƯỚC ĐÓ) ---
router.post("/login-admin", async (req, res) => {
  const { identifier, password } = req.body;
  const userAgent = req.get('user-agent') || '';
  const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
  
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
    
    // Tạo device ID
    const deviceId = generateDeviceId(userAgent, ipAddress);
    const deviceName = getDeviceName(userAgent);

    // === XÓA SESSION CŨ (LOGOUT CÁC THIẾT BỊ KHÁC) ===
    await db.query(
      "DELETE FROM user_sessions WHERE user_id = ? AND device_id != ?",
      [admin.id, deviceId]
    );

    // === TẠO SESSION MỚI ===
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Xóa session cũ của device này nếu có
      await connection.query(
        "DELETE FROM user_sessions WHERE user_id = ? AND device_id = ?",
        [admin.id, deviceId]
      );

      // Tạo session mới
      const [sessionResult] = await connection.query(
        `INSERT INTO user_sessions (user_id, token, device_id, device_name, ip_address, user_agent, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [admin.id, token, deviceId, deviceName, ipAddress, userAgent]
      );

      // Cập nhật active session trong users table
      await connection.query(
        "UPDATE users SET active_session_id = ?, active_device_id = ? WHERE id = ?",
        [sessionResult.insertId, deviceId, admin.id]
      );

      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

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
      },
      deviceId,
      deviceName
    });

  } catch (error) {
    console.error("Lỗi login admin:", error);
    res.status(500).json({ error: "Lỗi đăng nhập admin" });
  }
});

// --- 5. REFRESH TOKEN ---
router.post("/refresh-token", refreshTokenLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: "Thiếu token", code: 'NO_REFRESH_TOKEN' });

    const decoded = verifyTokenData(refreshToken, 'refresh');
    const [rows] = await db.query("SELECT id, role, full_name, email FROM users WHERE id = ?", [decoded.id]);

    if (rows.length === 0) return res.status(401).json({ success: false, error: "User không tồn tại", code: 'USER_NOT_FOUND' });

    const newAccessToken = generateToken({ id: rows[0].id, role: rows[0].role, fullName: rows[0].full_name, email: rows[0].email }, 'access');
    const newRefreshToken = generateToken({ id: rows[0].id, role: rows[0].role }, 'refresh');
    res.json({ success: true, token: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) { res.status(401).json({ success: false, error: "Token lỗi", code: 'INVALID_REFRESH_TOKEN' }); }
});

// --- 6. VERIFY TOKEN ---
// --- 6. API LOGOUT (Xóa session) ---
router.post("/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ error: "Không có token" });
    }

    const decoded = verifyTokenData(token, 'access');

    // Xóa session của user này
    await db.query(
      "DELETE FROM user_sessions WHERE user_id = ? AND token = ?",
      [decoded.id, token]
    );

    res.json({ success: true, message: "Đăng xuất thành công" });
  } catch (error) {
    console.error("Lỗi logout:", error);
    res.status(500).json({ error: "Lỗi đăng xuất" });
  }
});

// --- 7. API VERIFY TOKEN ---
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