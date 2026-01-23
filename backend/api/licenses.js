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
        p.target_tier as license_tier,
        p.birth_date,
        p.address
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
      SELECT u.id, u.full_name, u.avatar, p.identity_number, p.birth_date, p.target_tier, p.address
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
      birth_date: user.birth_date,
      address: user.address,
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
        p.target_tier as license_tier,
        p.birth_date,
        p.address
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
        u.phone,
        p.identity_number,
        p.target_tier
      FROM drone_licenses l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      ORDER BY l.issue_date DESC
    `);

    // Format dữ liệu cho frontend-admin
    const formattedLicenses = await Promise.all(licenses.map(async (license) => {
      // Lấy thiết bị cho mỗi giấy phép
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

      return {
        id: license.license_number,
        licenseNumber: license.license_number,
        userId: license.user_id,
        category: license.target_tier || 'A',
        name: license.full_name || '',
        idNumber: license.identity_number || '',
        issueDate: license.issue_date ? license.issue_date.toISOString().split('T')[0] : '',
        expireDate: license.expiry_date ? license.expiry_date.toISOString().split('T')[0] : '',
        status: license.license_status === 'Đang hoạt động' ? 'active' : 'expired',
        portraitImage: license.portrait_image,
        email: license.email,
        phone: license.phone,
        drones: devices.map(d => ({
          id: d.device_id,
          model: d.model_name || '',
          serial: d.serial_number || '',
          weight: d.weight || '',
          status: d.device_status === 'Đang hoạt động' ? 'active' : 'inactive'
        }))
      };
    }));

    res.json(formattedLicenses);

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

// ============================================
// ADMIN CRUD ENDPOINTS
// ============================================

/**
 * POST /api/licenses
 * Tạo giấy phép mới (Admin only)
 */
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const {
      licenseNumber,
      userId,
      category,
      name,
      idNumber,
      issueDate,
      expireDate,
      status,
      portraitImage,
      drones
    } = req.body;

    // Validate required fields
    if (!licenseNumber) {
      return res.status(400).json({ error: "Số giấy phép là bắt buộc" });
    }

    // Determine final user id (prefer provided userId, otherwise try idNumber)
    let finalUserId = userId;
    if (!finalUserId && idNumber) {
      const [users] = await db.query(
        "SELECT u.id FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE p.identity_number = ?",
        [idNumber]
      );
      if (users.length > 0) {
        finalUserId = users[0].id;
      }
    }

    // Ensure a user_profiles row exists for this license_number (upsert)
    // Map incoming category (e.g. 'Hạng A' or 'Hạng B') to stored tier ('A','B','C')
    const mapCategoryToTier = (cat) => {
      if (!cat && cat !== 0) return null;
      const s = String(cat).trim();
      const m = s.match(/[ABC]/i);
      if (m) return m[0].toUpperCase();
      // try extract after 'Hạng '
      const parts = s.split(' ');
      if (parts.length >= 2 && /^[A-Ca-c]$/.test(parts[1])) return parts[1].toUpperCase();
      return null;
    };
    const tierValue = mapCategoryToTier(category);

    // Ensure license_number exists in user_profiles
    // user_profiles uses user_id as PRIMARY KEY, so we INSERT... ON DUPLICATE KEY UPDATE
    if (finalUserId) {
      try {
        await db.query(
          `INSERT INTO user_profiles (user_id, license_number, identity_number, target_tier)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             license_number = VALUES(license_number),
             identity_number = COALESCE(VALUES(identity_number), identity_number),
             target_tier = COALESCE(VALUES(target_tier), target_tier)`,
          [finalUserId, licenseNumber, idNumber || null, tierValue]
        );
      } catch (err) {
        console.error('Error managing user_profiles for POST:', err);
        throw err;
      }
    } else {
      // If no user_id, try to insert/update by license_number only
      try {
        const [existingByLicense] = await db.query(
          "SELECT user_id FROM user_profiles WHERE license_number = ?",
          [licenseNumber]
        );

        if (existingByLicense.length > 0) {
          await db.query(
            `UPDATE user_profiles SET 
               identity_number = COALESCE(?, identity_number),
               target_tier = COALESCE(?, target_tier)
             WHERE license_number = ?`,
            [idNumber || null, tierValue, licenseNumber]
          );
        } else {
          // Can't insert without user_id and it doesn't exist by license_number
          // Just skip this step - user_profiles is optional for lookup
          console.warn('Skipping user_profiles insert: no user_id or existing license_number');
        }
      } catch (err) {
        console.error('Error managing user_profiles for POST (fallback):', err);
        // Don't throw - this is non-critical
      }
    }

    // Kiểm tra số giấy phép đã tồn tại chưa
    const [existing] = await db.query(
      "SELECT license_number FROM drone_licenses WHERE license_number = ?",
      [licenseNumber]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Số giấy phép đã tồn tại" });
    }

    // Tạo giấy phép mới
    await db.query(`
      INSERT INTO drone_licenses (
        license_number, 
        user_id, 
        issue_date, 
        expiry_date, 
        portrait_image,
        license_status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      licenseNumber,
      finalUserId || null,
      issueDate || null,
      expireDate || null,
      portraitImage || null,
      status === 'active' ? 'Đang hoạt động' : (status === 'expired' ? 'Hết hạn' : status || 'Đang hoạt động')
    ]);

    // Thêm thiết bị nếu có
    if (drones && Array.isArray(drones) && drones.length > 0) {
      for (const drone of drones) {
        if (drone.serial) {
          try {
            await db.query(`
              INSERT INTO drone_devices (
                license_number_ref,
                model_name,
                serial_number,
                weight,
                device_status
              ) VALUES (?, ?, ?, ?, ?)
            `, [
              licenseNumber,
              drone.model || null,
              drone.serial,
              drone.weight || null,
              drone.status === 'active' ? 'Đang hoạt động' : (drone.status === 'inactive' ? 'Ngừng sử dụng' : 'Đang hoạt động')
            ]);
          } catch (droneErr) {
            console.error(`Error inserting drone ${drone.serial}:`, droneErr);
            console.error('License number ref:', licenseNumber);
            throw new Error(`Lỗi khi thêm thiết bị ${drone.serial}: ${droneErr.message}`);
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: "Tạo giấy phép thành công",
      licenseNumber: licenseNumber
    });

  } catch (error) {
    console.error('Create license error:', error);

    let errorMessage = "Lỗi server khi tạo giấy phép";
    if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = "Số giấy phép này đã tồn tại";
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = "Lỗi: Người dùng hoặc giấy phép được tham chiếu không tồn tại. Vui lòng thử lại.";
    } else if (error.message && error.message.includes('Lỗi khi thêm thiết bị')) {
      errorMessage = error.message;
    }

    res.status(500).json({ error: errorMessage });
  }
});

/**
 * PUT /api/licenses/:licenseNumber
 * Cập nhật giấy phép (Admin only)
 */
router.put("/:licenseNumber", verifyAdmin, async (req, res) => {
  try {
    const { licenseNumber } = req.params;
    const {
      newLicenseNumber,
      userId,
      category,
      name,
      idNumber,
      issueDate,
      expireDate,
      status,
      portraitImage,
      drones
    } = req.body;

    // Kiểm tra giấy phép tồn tại
    const [existing] = await db.query(
      "SELECT license_number FROM drone_licenses WHERE license_number = ?",
      [licenseNumber]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy giấy phép" });
    }

    // Determine final user id for update (prefer provided userId, otherwise try idNumber)
    let finalUserIdForUpdate = userId;
    if (!finalUserIdForUpdate && idNumber) {
      const [users] = await db.query(
        "SELECT u.id FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE p.identity_number = ?",
        [idNumber]
      );
      if (users.length > 0) {
        finalUserIdForUpdate = users[0].id;
      }
    }

    // Determine target license number (if renaming)
    const targetLicenseNumber = newLicenseNumber || licenseNumber;

    // Ensure user_profiles row exists for the target license number (upsert)
    const mapCategoryToTier = (cat) => {
      if (!cat && cat !== 0) return null;
      const s = String(cat).trim();
      const m = s.match(/[ABC]/i);
      if (m) return m[0].toUpperCase();
      const parts = s.split(' ');
      if (parts.length >= 2 && /^[A-Ca-c]$/.test(parts[1])) return parts[1].toUpperCase();
      return null;
    };
    const tierValueUpdate = mapCategoryToTier(category);

    // Ensure user_profiles row exists for the target license number
    // user_profiles uses user_id as PRIMARY KEY, so we INSERT... ON DUPLICATE KEY UPDATE
    if (finalUserIdForUpdate) {
      try {
        await db.query(
          `INSERT INTO user_profiles (user_id, license_number, identity_number, target_tier)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             license_number = VALUES(license_number),
             identity_number = COALESCE(VALUES(identity_number), identity_number),
             target_tier = COALESCE(VALUES(target_tier), target_tier)`,
          [finalUserIdForUpdate, targetLicenseNumber, idNumber || null, tierValueUpdate]
        );
      } catch (err) {
        console.error('Error managing user_profiles for PUT:', err);
        throw err;
      }
    } else {
      // If no user_id, try to update by license_number only
      try {
        const [existingByLicense] = await db.query(
          "SELECT user_id FROM user_profiles WHERE license_number = ?",
          [licenseNumber]
        );

        if (existingByLicense.length > 0) {
          await db.query(
            `UPDATE user_profiles SET 
               license_number = ?,
               identity_number = COALESCE(?, identity_number),
               target_tier = COALESCE(?, target_tier)
             WHERE license_number = ?`,
            [targetLicenseNumber, idNumber || null, tierValueUpdate, licenseNumber]
          );
        } else {
          // Can't update - doesn't exist yet and no user_id to create
          console.warn('Skipping user_profiles update: no user_id or existing license_number');
        }
      } catch (err) {
        console.error('Error managing user_profiles for PUT (fallback):', err);
        // Don't throw - this is non-critical
      }
    }

    // Cập nhật giấy phép
    let updateFields = [];
    let updateValues = [];

    if (issueDate !== undefined) {
      updateFields.push("issue_date = ?");
      updateValues.push(issueDate);
    }
    if (expireDate !== undefined) {
      updateFields.push("expiry_date = ?");
      updateValues.push(expireDate);
    }
    if (status !== undefined) {
      updateFields.push("license_status = ?");
      const statusValue = status === 'active' ? 'Đang hoạt động' : (status === 'expired' ? 'Hết hạn' : status);
      updateValues.push(statusValue);
    }
    if (portraitImage !== undefined) {
      updateFields.push("portrait_image = ?");
      updateValues.push(portraitImage);
    }
    if (userId !== undefined) {
      updateFields.push("user_id = ?");
      updateValues.push(userId);
    }

    if (updateFields.length > 0) {
      updateValues.push(licenseNumber);
      await db.query(
        `UPDATE drone_licenses SET ${updateFields.join(", ")} WHERE license_number = ?`,
        updateValues
      );
    }

    // Cập nhật thiết bị nếu có
    if (drones && Array.isArray(drones)) {
      // Xóa thiết bị cũ
      await db.query("DELETE FROM drone_devices WHERE license_number_ref = ?", [licenseNumber]);

      // Thêm thiết bị mới (reference targetLicenseNumber)
      for (const drone of drones) {
        if (drone.serial) {
          try {
            await db.query(`
              INSERT INTO drone_devices (
                license_number_ref,
                model_name,
                serial_number,
                weight,
                device_status
              ) VALUES (?, ?, ?, ?, ?)
            `, [
              targetLicenseNumber,
              drone.model || null,
              drone.serial,
              drone.weight || null,
              drone.status === 'active' ? 'Đang hoạt động' : (drone.status === 'inactive' ? 'Ngừng sử dụng' : 'Đang hoạt động')
            ]);
          } catch (droneErr) {
            console.error(`Error inserting drone ${drone.serial}:`, droneErr);
            console.error('Target License:', targetLicenseNumber);
            console.error('Drone data:', drone);
            throw new Error(`Lỗi khi thêm thiết bị ${drone.serial}: ${droneErr.message}`);
          }
        }
      }
    }

    res.json({
      success: true,
      message: "Cập nhật giấy phép thành công"
    });

  } catch (error) {
    console.error('Update license error:', error);

    let errorMessage = "Lỗi server khi cập nhật giấy phép";
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = "Lỗi: Giấy phép hoặc người dùng được tham chiếu không tồn tại. Vui lòng thử lại.";
    } else if (error.message && error.message.includes('Lỗi khi thêm thiết bị')) {
      errorMessage = error.message;
    }

    res.status(500).json({ error: errorMessage });
  }
});

/**
 * DELETE /api/licenses/:licenseNumber
 * Xóa giấy phép (Admin only)
 */
router.delete("/:licenseNumber", verifyAdmin, async (req, res) => {
  try {
    const { licenseNumber } = req.params;

    // Kiểm tra giấy phép tồn tại
    const [existing] = await db.query(
      "SELECT license_number FROM drone_licenses WHERE license_number = ?",
      [licenseNumber]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy giấy phép" });
    }

    // Xóa thiết bị liên quan trước
    await db.query("DELETE FROM drone_devices WHERE license_number_ref = ?", [licenseNumber]);

    // Xóa giấy phép
    await db.query("DELETE FROM drone_licenses WHERE license_number = ?", [licenseNumber]);

    res.json({
      success: true,
      message: "Xóa giấy phép thành công"
    });

  } catch (error) {
    console.error('Delete license error:', error);
    res.status(500).json({ error: "Lỗi server khi xóa giấy phép" });
  }
});

module.exports = router;
