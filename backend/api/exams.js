const express = require("express");
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin, verifyStudent } = require('../middleware/verifyToken');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

// === AUTO MIGRATION: Update status ENUM to Vietnamese values ===
(async () => {
  try {
    await db.query(
      `ALTER TABLE exam_registrations MODIFY COLUMN status ENUM('Đã đăng ký', 'Đã duyệt', 'Đã hủy') DEFAULT 'Đã đăng ký'`
    );
    console.log('✅ Updated exam_registrations status ENUM to Vietnamese values');
  } catch (err) {
    if (err.message.includes('Duplicate key')) {
      console.log('ℹ️ Status ENUM already updated');
    } else {
      console.error('⚠️ Error updating status ENUM:', err.message);
    }
  }
})();

// --- GET: Lấy danh sách lịch thi (Có kiểm tra trạng thái đăng ký của User) ---
// Không bắt buộc token - nếu có token thì filter theo level, nếu không thì show all
router.get("/", async (req, res) => {
  const userId = req.query.user_id; // Lấy user_id từ URL nếu có
  const authHeader = req.headers.authorization;

  try {
    let params = [];
    let userLevel = null;
    // By default non-admin users see only upcoming exams (today and future).
    // Admin (when authenticated) should see all exams including past ones.
    let includePast = false;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
        if (decoded && decoded.role === 'admin') includePast = true;
      } catch (e) {
        includePast = false;
      }
    }

    // Default query (no user filter)
    let query = includePast
      ? "SELECT * FROM exam_schedules ORDER BY exam_date ASC"
      : "SELECT * FROM exam_schedules WHERE DATE(exam_date) >= CURDATE() ORDER BY exam_date ASC";

    // Nếu có user_id, query target_tier từ database
    if (userId) {
      try {
        const [userRows] = await db.query(
          "SELECT p.target_tier FROM user_profiles p JOIN users u ON p.user_id = u.id WHERE u.id = ?",
          [userId]
        );
        if (userRows.length > 0) {
          userLevel = userRows[0].target_tier;
        }
      } catch (e) {
        // User không tồn tại, tiếp tục mà không filter
        userLevel = null;
      }
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      // Fallback: nếu không có user_id, thử lấy từ token
      const token = authHeader.slice(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.id) {
          const [userRows] = await db.query(
            "SELECT p.target_tier FROM user_profiles p JOIN users u ON p.user_id = u.id WHERE u.id = ?",
            [decoded.id]
          );
          if (userRows.length > 0) {
            userLevel = userRows[0].target_tier;
          }
        }
      } catch (e) {
        // Token không hợp lệ, tiếp tục mà không filter
        userLevel = null;
      }
    }

    // Nếu có user_id, kiểm tra đăng ký + filter theo target_tier
    if (userId) {
      const dateCond = includePast ? '' : 'AND DATE(s.exam_date) >= CURDATE()';
      if (userLevel === "A") {
        // User hạng A chỉ xem lịch hạng A
        query = `
          SELECT s.*, 
                 (SELECT COUNT(*) FROM exam_registrations r 
                  WHERE r.exam_schedule_id = s.id AND r.user_id = ?) as is_registered
          FROM exam_schedules s
          WHERE s.type LIKE '%Hạng A%' ${dateCond}
          ORDER BY s.exam_date ASC
        `;
      } else if (userLevel === "B") {
        // User hạng B xem được cả hạng A và B
        query = `
          SELECT s.*, 
                 (SELECT COUNT(*) FROM exam_registrations r 
                  WHERE r.exam_schedule_id = s.id AND r.user_id = ?) as is_registered
          FROM exam_schedules s
          WHERE (s.type LIKE '%Hạng A%' OR s.type LIKE '%Hạng B%') ${dateCond}
          ORDER BY s.exam_date ASC
        `;
      } else {
        // Không có target_tier hoặc token không hợp lệ, show all (but still respect includePast)
        query = `
          SELECT s.*, 
                 (SELECT COUNT(*) FROM exam_registrations r 
                  WHERE r.exam_schedule_id = s.id AND r.user_id = ?) as is_registered
          FROM exam_schedules s
          WHERE 1=1 ${dateCond}
          ORDER BY s.exam_date ASC
        `;
      }

      params = [userId];
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi lấy danh sách lịch thi", details: error.message });
  }
});

// --- GET: Lấy lịch thi theo tháng (year, month) ---
// GET /api/exams/month?year=2026&month=1
// Không bắt buộc token - nếu có token thì filter theo level, nếu không thì show all
router.get("/month", async (req, res) => {
  try {
    let { year, month } = req.query;
    const now = new Date();
    year = parseInt(year) || now.getFullYear();
    month = parseInt(month) || (now.getMonth() + 1);

    let userLevel = null;
    const authHeader = req.headers.authorization;

    console.log("🔍 DEBUG /month endpoint - Authorization:", authHeader ? "HAS TOKEN" : "NO TOKEN");

    // Nếu có token, lấy user_id và target_tier
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded && decoded.id) {
          const [userRows] = await db.query(
            "SELECT u.id, u.email, p.target_tier FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.id = ?",
            [decoded.id]
          );

          if (userRows.length > 0) {
            userLevel = userRows[0].target_tier;
          }
        }
      } catch (e) {
        userLevel = null;
      }
    }

    // Include all exams in the specified month (past and upcoming)
    let query = `SELECT * FROM exam_schedules WHERE YEAR(exam_date) = ? AND MONTH(exam_date) = ? AND is_active = 1`;
    let params = [year, month];

    // Filter theo target_tier nếu có token
    if (userLevel === "A") {
      query += ` AND type LIKE '%Hạng A%'`;
    } else if (userLevel === "B") {
      query += ` AND (type LIKE '%Hạng A%' OR type LIKE '%Hạng B%')`;
    } else {
      // Không có target_tier, show all
    }

    query += ` ORDER BY exam_date ASC`;

    const [rows] = await db.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error("Error in /month:", error);
    res.status(500).json({ error: "Lỗi lấy lịch thi theo tháng", details: error.message });
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
router.put("/:id", verifyAdmin, async (req, res) => {
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
router.delete("/:id", verifyAdmin, async (req, res) => {
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
router.post("/book", verifyStudent, async (req, res) => {
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
    // Insert minimal registration fields to match DB schema (no extra payment_status field).
    // Use Vietnamese status value 'Đã đăng ký'.
    await connection.query(
      `INSERT INTO exam_registrations (user_id, exam_schedule_id, status) 
       VALUES (?, ?, 'Đã đăng ký')`,
      [user_id, exam_schedule_id]
    );

    // 4. Trừ chỗ trống
    await connection.query(
      "UPDATE exam_schedules SET spots_left = spots_left - 1 WHERE id = ?",
      [exam_schedule_id]
    );

    await connection.commit();
    // Lấy số chỗ còn lại và trả về cho client để client có thể cập nhật giao diện
    const [updatedRows] = await connection.query(
      "SELECT spots_left FROM exam_schedules WHERE id = ?",
      [exam_schedule_id]
    );
    const remaining = updatedRows && updatedRows[0] ? updatedRows[0].spots_left : null;
    res.status(201).json({ message: "Đăng ký thành công!", spots_left: remaining });

  } catch (error) {
    await connection.rollback();
    console.error("Lỗi đăng ký thi:", error);
    res.status(500).json({ error: "Lỗi server khi đăng ký thi: " + error.message });
  } finally {
    connection.release();
  }
});

// --- GET: Lấy lịch sử đăng ký của người dùng đang đăng nhập ---
router.get("/my-registrations", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT r.id AS registration_id, r.status AS registration_status, r.created_at,
             s.id AS schedule_id, s.type, s.location, s.address, s.exam_date, s.exam_time, s.spots_left, s.is_active
      FROM exam_registrations r
      JOIN exam_schedules s ON r.exam_schedule_id = s.id
      WHERE r.user_id = ?
      ORDER BY s.exam_date DESC
    `;
    const [rows] = await db.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error("Error in /my-registrations:", error);
    res.status(500).json({ error: "Lỗi lấy lịch sử đăng ký", details: error.message });
  }
});

// --- GET: DANH SÁCH ĐĂNG KÝ (ADMIN) ---
router.get("/registrations", verifyAdmin, async (req, res) => {
  try {
    const { search, name, tier, location, status, date, sort, direction } = req.query;

    let query = `
      SELECT r.id AS registration_id, r.status AS registration_status, r.created_at,
             u.id AS user_id, u.email, u.full_name,
             s.id AS schedule_id, s.type, s.location, s.address, s.exam_date, s.exam_time
      FROM exam_registrations r
      JOIN users u ON r.user_id = u.id
      JOIN exam_schedules s ON r.exam_schedule_id = s.id
      WHERE 1=1
    `;

    const params = [];

    // Search filter - tìm kiếm chung trong tên, email, mã đăng ký, loại lịch thi, địa điểm
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query += ` AND (
        u.full_name LIKE ? OR
        u.email LIKE ? OR
        r.id LIKE ? OR
        s.type LIKE ? OR
        s.location LIKE ? OR
        s.address LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Filter by name (người dùng)
    if (name && name.trim()) {
      query += ` AND u.full_name LIKE ?`;
      params.push(`%${name.trim()}%`);
    }

    // Filter by tier (lịch thi - Hạng A/B)
    if (tier && tier.trim()) {
      query += ` AND s.type LIKE ?`;
      params.push(`%Hạng ${tier.trim()}%`);
    }

    // Filter by location (địa điểm)
    if (location && location.trim()) {
      query += ` AND (s.location LIKE ? OR s.address LIKE ?)`;
      params.push(`%${location.trim()}%`, `%${location.trim()}%`);
    }

    // Filter by status (trạng thái)
    if (status && status.trim()) {
      query += ` AND r.status = ?`;
      params.push(status.trim());
    }

    // Filter by date (ngày thi) - format: YYYY-MM-DD
    if (date && date.trim()) {
      query += ` AND DATE(s.exam_date) = ?`;
      params.push(date.trim());
    }

    // Sort
    let orderBy = 'r.created_at DESC'; // default
    if (sort && direction) {
      const validSortColumns = {
        'registration_id': 'r.id',
        'full_name': 'u.full_name',
        'email': 'u.email',
        'exam_date': 's.exam_date',
        'registration_status': 'r.status',
        'created_at': 'r.created_at'
      };

      const dbColumn = validSortColumns[sort];
      if (dbColumn) {
        const sortDir = direction === 'desc' ? 'DESC' : 'ASC';
        orderBy = `${dbColumn} ${sortDir}`;
      }
    }

    query += ` ORDER BY ${orderBy}`;

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error in /registrations:", error);
    res.status(500).json({ error: "Lỗi lấy danh sách đăng ký", details: error.message });
  }
});

// --- PUT: CẬP NHẬT TRẠNG THÁI ĐĂNG KÝ (ADMIN) ---
router.put("/registrations/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // expected values: 'Đã đăng ký', 'Đã duyệt', 'Đã hủy'

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      `SELECT r.id, r.status, r.exam_schedule_id, s.spots_left FROM exam_registrations r JOIN exam_schedules s ON r.exam_schedule_id = s.id WHERE r.id = ?`,
      [id]
    );

    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Không tìm thấy đăng ký." });
    }

    const existing = existingRows[0];
    const prevStatus = existing.status;
    const scheduleId = existing.exam_schedule_id;

    // Nếu thay đổi sang 'Đã hủy' từ trạng thái khác thì trả lại chỗ
    if (status === 'Đã hủy' && prevStatus !== 'Đã hủy') {
      await connection.query(
        "UPDATE exam_schedules SET spots_left = spots_left + 1 WHERE id = ?",
        [scheduleId]
      );
    }

    // Nếu thay đổi từ 'Đã hủy' sang 'Đã đăng ký' hoặc 'Đã duyệt' thì trừ chỗ nếu còn
    if ((status === 'Đã đăng ký' || status === 'Đã duyệt') && prevStatus === 'Đã hủy') {
      const [sRows] = await connection.query(
        "SELECT spots_left FROM exam_schedules WHERE id = ?",
        [scheduleId]
      );
      if (sRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Không tìm thấy lịch thi." });
      }
      if (sRows[0].spots_left <= 0) {
        await connection.rollback();
        return res.status(400).json({ error: "Không còn chỗ trong lịch thi." });
      }
      await connection.query(
        "UPDATE exam_schedules SET spots_left = spots_left - 1 WHERE id = ?",
        [scheduleId]
      );
    }

    await connection.query("UPDATE exam_registrations SET status = ? WHERE id = ?", [status, id]);

    await connection.commit();
    res.json({ message: "Cập nhật trạng thái thành công" });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating registration status:", error);
    res.status(500).json({ error: "Lỗi khi cập nhật trạng thái", details: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;