const express = require("express");
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin, verifyStudent } = require('../middleware/verifyToken');

// ============================================
// PUBLIC LOOKUP ENDPOINTS (Không cần đăng nhập)
// ============================================

/**
 * GET /api/licenses/lookup/license/:licenseNumber
 * Tra cứu công khai theo số giấy phép
 */
router.get("/lookup/license/:licenseNumber", async (req, res) => {
  try {
    const { licenseNumber } = req.params;

    // Lấy thông tin giấy phép
    const [licenses] = await db.query(`
      SELECT 
        l.license_number,
        l.issue_date,
        l.expiry_date,
        COALESCE(l.portrait_image, u.avatar) as portrait_image,
        l.license_status,
        u.full_name,
        u.avatar,
        p.identity_number,
        p.target_tier as license_tier
      FROM drone_licenses l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE l.license_number = ?
    `, [licenseNumber]);

    if (licenses.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy giấy phép với số này" });
    }

    const license = licenses[0];

    // Lấy danh sách thiết bị
    const [devices] = await db.query(`
      SELECT 
        device_id,
        model_name,
        serial_number,
        weight,
        device_status
      FROM drone_devices
      WHERE license_number_ref = ?
    `, [licenseNumber]);

    res.json({
      license: license,
      devices: devices
    });

  } catch (error) {
    console.error('Lookup license error:', error);
    res.status(500).json({ error: "Lỗi server khi tra cứu giấy phép" });
  }
});

/**
 * GET /api/licenses/lookup/cccd/:cccdNumber
 * Tra cứu công khai theo số CCCD và ngày sinh
 */
router.get("/lookup/cccd/:cccdNumber", async (req, res) => {
  try {
    const { cccdNumber } = req.params;
    const { birthDate } = req.query;

    if (!birthDate) {
      return res.status(400).json({ error: "Vui lòng cung cấp ngày sinh" });
    }

    // Tìm user theo CCCD và ngày sinh
    const [users] = await db.query(`
      SELECT u.id, u.full_name, u.avatar, p.identity_number, p.birth_date, p.target_tier
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE p.identity_number = ? AND DATE(p.birth_date) = DATE(?)
    `, [cccdNumber, birthDate]);

    if (users.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy thông tin với CCCD và ngày sinh này" });
    }

    const user = users[0];

    // Lấy giấy phép của user
    const [licenses] = await db.query(`
      SELECT 
        l.license_number,
        l.issue_date,
        l.expiry_date,
        l.portrait_image,
        l.license_status
      FROM drone_licenses l
      WHERE l.user_id = ?
    `, [user.id]);

    if (licenses.length === 0) {
      return res.status(404).json({ error: "Người dùng chưa có giấy phép" });
    }

    const license = {
      ...licenses[0],
      full_name: user.full_name,
      identity_number: user.identity_number,
      license_tier: user.target_tier,
      portrait_image: licenses[0].portrait_image || user.avatar
    };

    // Lấy danh sách thiết bị
    const [devices] = await db.query(`
      SELECT 
        device_id,
        model_name,
        serial_number,
        weight,
        device_status
      FROM drone_devices
      WHERE license_number_ref = ?
    `, [license.license_number]);

    res.json({
      license: license,
      devices: devices
    });

  } catch (error) {
    console.error('Lookup by CCCD error:', error);
    res.status(500).json({ error: "Lỗi server khi tra cứu" });
  }
});

/**
 * GET /api/licenses/lookup/device/:serialNumber
 * Tra cứu công khai theo số serial thiết bị
 */
router.get("/lookup/device/:serialNumber", async (req, res) => {
  try {
    const { serialNumber } = req.params;

    // Tìm thiết bị theo serial
    const [devices] = await db.query(`
      SELECT 
        d.device_id,
        d.license_number_ref,
        d.model_name,
        d.serial_number,
        d.weight,
        d.device_status,
        d.created_at
      FROM drone_devices d
      WHERE d.serial_number = ?
    `, [serialNumber]);

    if (devices.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy thiết bị với số serial này" });
    }

    const device = devices[0];

    // Lấy thông tin giấy phép liên kết
    const [licenses] = await db.query(`
      SELECT 
        l.license_number,
        l.issue_date,
        l.expiry_date,
        COALESCE(l.portrait_image, u.avatar) as portrait_image,
        l.license_status,
        u.full_name,
        u.avatar,
        p.identity_number,
        p.target_tier as license_tier
      FROM drone_licenses l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE l.license_number = ?
    `, [device.license_number_ref]);

    if (licenses.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy giấy phép liên kết với thiết bị" });
    }

    const license = licenses[0];

    // Lấy tất cả thiết bị của giấy phép này
    const [allDevices] = await db.query(`
      SELECT 
        device_id,
        model_name,
        serial_number,
        weight,
        device_status
      FROM drone_devices
      WHERE license_number_ref = ?
    `, [license.license_number]);

    res.json({
      license: license,
      devices: allDevices
    });

  } catch (error) {
    console.error('Lookup by device error:', error);
    res.status(500).json({ error: "Lỗi server khi tra cứu" });
  }
});

// ============================================
// PROTECTED ENDPOINTS (Cần đăng nhập)
// ============================================

/**
 * GET /api/licenses/user/:userId
 * Lấy thông tin giấy cấp phép của user theo user_id
 */
router.get("/user/:userId", verifyStudent, async (req, res) => {
  try {
    const { userId } = req.params;

    // Kiểm tra quyền: chỉ chính chủ hoặc admin mới được xem
    if (req.user.role !== 'admin' && req.user.id !== Number(userId)) {
      return res.status(403).json({ error: "Bạn không có quyền xem thông tin này" });
    }

    // Lấy thông tin giấy phép
    const [licenses] = await db.query(`
      SELECT 
        l.license_number,
        l.user_id,
        l.issue_date,
        l.expiry_date,
        l.portrait_image,
        l.license_status,
        u.full_name,
        u.email,
        u.phone
      FROM drone_licenses l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.user_id = ?
    `, [userId]);

    if (licenses.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy giấy phép cho người dùng này" });
    }

    const license = licenses[0];

    // Lấy danh sách thiết bị liên kết với giấy phép
    const [devices] = await db.query(`
      SELECT 
        device_id,
        license_number_ref,
        model_name,
        serial_number,
        weight,
        device_status,
        created_at
      FROM drone_devices
      WHERE license_number_ref = ?
    `, [license.license_number]);

    res.json({
      license: license,
      devices: devices
    });

  } catch (error) {
    console.error('Get license error:', error);
    res.status(500).json({ error: "Lỗi server khi lấy thông tin giấy phép" });
  }
});

/**
 * GET /api/licenses/:licenseNumber
 * Lấy thông tin giấy phép theo số giấy phép
 */
router.get("/:licenseNumber", verifyStudent, async (req, res) => {
  try {
    const { licenseNumber } = req.params;

    // Lấy thông tin giấy phép
    const [licenses] = await db.query(`
      SELECT 
        l.license_number,
        l.user_id,
        l.issue_date,
        l.expiry_date,
        l.portrait_image,
        l.license_status,
        u.full_name,
        u.email,
        u.phone
      FROM drone_licenses l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.license_number = ?
    `, [licenseNumber]);

    if (licenses.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy giấy phép" });
    }

    const license = licenses[0];

    // Kiểm tra quyền: chỉ chính chủ hoặc admin mới được xem chi tiết
    if (req.user.role !== 'admin' && req.user.id !== license.user_id) {
      return res.status(403).json({ error: "Bạn không có quyền xem thông tin này" });
    }

    // Lấy danh sách thiết bị
    const [devices] = await db.query(`
      SELECT 
        device_id,
        license_number_ref,
        model_name,
        serial_number,
        weight,
        device_status,
        created_at
      FROM drone_devices
      WHERE license_number_ref = ?
    `, [licenseNumber]);

    res.json({
      license: license,
      devices: devices
    });

  } catch (error) {
    console.error('Get license error:', error);
    res.status(500).json({ error: "Lỗi server khi lấy thông tin giấy phép" });
  }
});

/**
 * GET /api/licenses
 * Lấy tất cả giấy phép (Admin only)
 */
router.get("/", verifyAdmin, async (req, res) => {
  try {
    const [licenses] = await db.query(`
      SELECT 
        l.license_number,
        l.user_id,
        l.issue_date,
        l.expiry_date,
        l.portrait_image,
        l.license_status,
        u.full_name,
        u.email,
        u.phone
      FROM drone_licenses l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.issue_date DESC
    `);

    res.json(licenses);

  } catch (error) {
    console.error('Get all licenses error:', error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách giấy phép" });
  }
});

/**
 * GET /api/licenses/my
 * Lấy giấy phép của user hiện tại (từ token)
 */
router.get("/my/info", verifyStudent, async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy thông tin giấy phép
    const [licenses] = await db.query(`
      SELECT 
        l.license_number,
        l.user_id,
        l.issue_date,
        l.expiry_date,
        l.portrait_image,
        l.license_status
      FROM drone_licenses l
      WHERE l.user_id = ?
    `, [userId]);

    if (licenses.length === 0) {
      return res.status(404).json({ error: "Bạn chưa có giấy phép" });
    }

    const license = licenses[0];

    // Lấy danh sách thiết bị
    const [devices] = await db.query(`
      SELECT 
        device_id,
        license_number_ref,
        model_name,
        serial_number,
        weight,
        device_status,
        created_at
      FROM drone_devices
      WHERE license_number_ref = ?
    `, [license.license_number]);

    res.json({
      license: license,
      devices: devices
    });

  } catch (error) {
    console.error('Get my license error:', error);
    res.status(500).json({ error: "Lỗi server khi lấy thông tin giấy phép" });
  }
});

module.exports = router;
