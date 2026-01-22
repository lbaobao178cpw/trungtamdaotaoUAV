const express = require("express");
const router = express.Router();
const db = require('../config/db'); 
const { verifyToken, verifyAdmin, verifyStudent } = require('../middleware/verifyToken');
// --- GET: Lấy danh sách lịch thi (Có kiểm tra trạng thái đăng ký của User) ---
router.get("/", async (req, res) => {
  const userId = req.query.user_id; // Lấy user_id từ URL nếu có

  try {
    let query = "SELECT * FROM exam_schedules ORDER BY exam_date ASC";
    let params = [];

    // Nếu có user_id, kiểm tra xem user đã đăng ký chưa
    if (userId) {
      query = `
        SELECT s.*, 
               (SELECT COUNT(*) FROM exam_registrations r 
                WHERE r.exam_schedule_id = s.id AND r.user_id = ?) as is_registered
        FROM exam_schedules s
        ORDER BY s.exam_date ASC
      `;
      params = [userId];
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi lấy danh sách lịch thi" });
  }
});

// --- GET: Lấy lịch thi theo tháng (year, month) ---
// GET /api/exams/month?year=2026&month=1
router.get("/month", async (req, res) => {
  try {
    let { year, month } = req.query;
    const now = new Date();
    year = parseInt(year) || now.getFullYear();
    month = parseInt(month) || (now.getMonth() + 1);

    const [rows] = await db.query(
      `SELECT * FROM exam_schedules WHERE YEAR(exam_date) = ? AND MONTH(exam_date) = ? AND is_active = 1 ORDER BY exam_date ASC`,
      [year, month]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi lấy lịch thi theo tháng" });
  }
});

// --- POST: Tạo lịch thi mới (ADMIN) ---
router.post("/", verifyAdmin, async (req, res) => {
  const { type, location, address, exam_date, exam_time, spots_left, is_active } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO exam_schedules (type, location, address, exam_date, exam_time, spots_left, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [type, location, address, exam_date, exam_time, spots_left || 0, is_active ? 1 : 0]
    );
    res.status(201).json({ message: "Tạo thành công", id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi tạo lịch thi" });
  }
});

// --- PUT: Cập nhật lịch thi (ADMIN) ---
router.put("/:id",verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { type, location, address, exam_date, exam_time, spots_left, is_active } = req.body;
  try {
    await db.query(
      `UPDATE exam_schedules 
       SET type=?, location=?, address=?, exam_date=?, exam_time=?, spots_left=?, is_active=? 
       WHERE id=?`,
      [type, location, address, exam_date, exam_time, spots_left, is_active ? 1 : 0, id]
    );
    res.json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi cập nhật" });
  }
});

// --- DELETE: Xóa lịch thi (ADMIN) ---
router.delete("/:id",  verifyAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM exam_schedules WHERE id = ?", [req.params.id]);
    res.json({ message: "Đã xóa thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi xóa dữ liệu" });
  }
});

// ============================================================
// --- POST: ĐĂNG KÝ THI (Dành cho User đã đăng nhập) ---
// ============================================================
router.post("/book",verifyStudent ,async (req, res) => {
  const { user_id, exam_schedule_id } = req.body;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Kiểm tra trùng lặp
    const [existing] = await connection.query(
      "SELECT id FROM exam_registrations WHERE user_id = ? AND exam_schedule_id = ?",
      [user_id, exam_schedule_id]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Bạn đã đăng ký kỳ thi này rồi." });
    }

    // 2. Kiểm tra chỗ trống
    const [examRows] = await connection.query(
      "SELECT spots_left FROM exam_schedules WHERE id = ?", 
      [exam_schedule_id]
    );

    if (examRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Không tìm thấy lịch thi." });
    }

    if (examRows[0].spots_left <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Lịch thi này đã hết chỗ." });
    }

    // 3. Tạo đăng ký
    await connection.query(
      `INSERT INTO exam_registrations (user_id, exam_schedule_id, status, payment_status, created_at) 
       VALUES (?, ?, 'pending', 'unpaid', NOW())`,
      [user_id, exam_schedule_id]
    );

    // 4. Trừ chỗ trống
    await connection.query(
      "UPDATE exam_schedules SET spots_left = spots_left - 1 WHERE id = ?",
      [exam_schedule_id]
    );

    await connection.commit();
    res.status(201).json({ message: "Đăng ký thi thành công!" });

  } catch (error) {
    await connection.rollback();
    console.error("Lỗi đăng ký thi:", error);
    res.status(500).json({ error: "Lỗi server khi đăng ký thi: " + error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;