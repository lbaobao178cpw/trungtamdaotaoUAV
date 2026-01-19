const express = require("express");
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { verifyToken, verifyAdmin } = require('../middleware/verifyToken');

// --- GET: Lấy danh sách người dùng (Kèm thông tin chi tiết) ---
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id, u.full_name, u.email, u.phone, u.role, u.is_active, u.created_at,
        p.identity_number, p.address, p.birth_date, p.gender, p.target_tier
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách người dùng" });
  }
});

// ============================================================
// --- GET: Lấy thông tin Profile chi tiết (User cá nhân) ---
// ============================================================
router.get("/:id/profile", verifyToken, async (req, res) => {
  try {
    const requestedId = req.params.id;
    const tokenUserId = req.user.id;

    if (req.user.role !== 'admin' && tokenUserId !== Number(requestedId)) {
      return res.status(403).json({ error: "Bạn không có quyền xem profile này" });
    }

    const [rows] = await db.query(`
      SELECT
        u.full_name,
        u.email,
        u.phone,
        u.created_at,

        p.gender,
        p.identity_number,
        p.birth_date,
        p.address,
        p.target_tier,
        p.uav_type
        
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = ?
    `, [requestedId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi server khi lấy profile" });
  }
});


// --- POST: Tạo người dùng mới (Admin) ---
router.post("/", async (req, res) => {
  const { full_name, email, phone, password, role, is_active } = req.body;

  const finalPassword = password || "123456";

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(finalPassword, salt);

    const [result] = await db.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_active) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, phone, password_hash, role || 'student', is_active ? 1 : 0]
    );

    // Tự động tạo profile trống để sau này update không bị lỗi
    await db.query("INSERT INTO user_profiles (user_id) VALUES (?)", [result.insertId]);

    res.status(201).json({ message: "Tạo người dùng thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi tạo người dùng (Email/SĐT có thể đã tồn tại)" });
  }
});

// --- PUT: Cập nhật thông tin người dùng ---
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { full_name, email, phone, role, is_active } = req.body;

  try {
    await db.query(
      `UPDATE users 
       SET full_name=?, email=?, phone=?, role=?, is_active=? 
       WHERE id=?`,
      [full_name, email, phone, role, is_active ? 1 : 0, id]
    );
    res.json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi cập nhật người dùng" });
  }
});

// --- DELETE: Xóa người dùng ---
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "Đã xóa người dùng" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi khi xóa người dùng" });
  }
});

module.exports = router;