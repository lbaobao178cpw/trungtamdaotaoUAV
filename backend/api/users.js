const express = require("express");
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { verifyToken, verifyAdmin, verifyStudent } = require('../middleware/verifyToken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Setup multer for avatar upload
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file ảnh'), false);
    }
  }
});

// --- GET: Lấy danh sách người dùng (Kèm thông tin chi tiết) ---
router.get("/", verifyAdmin, async (req, res) => {
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

router.get("/:id/profile", verifyStudent, async (req, res) => {
  try {
    const requestedId = req.params.id;

    const [rows] = await db.query(`
      SELECT
        u.full_name,
        u.email,
        u.phone,
        u.created_at,
        u.avatar,

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

// --- PUT: Đổi mật khẩu (lấy user từ token) ---
router.put("/change-password", verifyStudent, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Mật khẩu mới không khớp" });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error: "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
      });
    }

    const [users] = await db.query("SELECT password_hash FROM users WHERE id = ?", [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    const validPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: "Mật khẩu hiện tại không đúng" });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [newPasswordHash, userId]);

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: "Lỗi khi đổi mật khẩu" });
  }
});

// --- PUT: Cập nhật thông tin người dùng (Admins có thể sửa nhiều trường) ---
router.put("/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    full_name, email, phone, role, is_active,
    identity_number, gender, birth_date, address,
    target_tier, uav_type
  } = req.body;

  try {
    // Cập nhật các trường trong bảng users (cho phép admin chỉnh)
    const isActiveParam = typeof is_active !== 'undefined' ? (is_active ? 1 : 0) : null;
    await db.query(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           role = COALESCE(?, role),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [full_name, email, phone, role, isActiveParam, id]
    );

    // Cập nhật/tao profile trong bảng user_profiles
    const [profileUpdateResult] = await db.query(
      `UPDATE user_profiles
       SET identity_number = COALESCE(?, identity_number),
           gender = COALESCE(?, gender),
           birth_date = COALESCE(?, birth_date),
           address = COALESCE(?, address),
           target_tier = COALESCE(?, target_tier),
           uav_type = COALESCE(?, uav_type)
       WHERE user_id = ?`,
      [identity_number, gender, birth_date, address, target_tier, uav_type, id]
    );

    // Nếu chưa có profile (affectedRows === 0), tạo mới
    if (profileUpdateResult && profileUpdateResult.affectedRows === 0) {
      await db.query(
        `INSERT INTO user_profiles (user_id, identity_number, gender, birth_date, address, target_tier, uav_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, identity_number || null, gender || null, birth_date || null, address || null, target_tier || null, uav_type || null]
      );
    }

    res.json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi cập nhật người dùng" });
  }
});

// --- DELETE: Xóa người dùng ---
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "Đã xóa người dùng" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi khi xóa người dùng" });
  }
});

// --- POST: Upload avatar ---
router.post("/:id/avatar", verifyStudent, avatarUpload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params;

    // Chỉ chính chủ 
    if (req.user.id !== Number(id)) {
      return res.status(403).json({ error: "Bạn không có quyền cập nhật avatar này" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Không có file được upload" });
    }

    // Upload lên Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'uav-training/avatars',
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // Cập nhật avatar URL vào database
    await db.query("UPDATE users SET avatar = ? WHERE id = ?", [uploadResult.secure_url, id]);

    res.json({
      message: "Upload avatar thành công",
      avatar: uploadResult.secure_url
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: "Lỗi khi upload avatar" });
  }
});

// --- GET: Lấy lịch sử học tập của người dùng ---
router.get("/:id/learning-history", verifyStudent, async (req, res) => {
  try {
    const userId = req.params.id;

    // Chỉ cho phép xem lịch sử của chính mình hoặc admin
    if (req.user.id != userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Không có quyền xem lịch sử học tập" });
    }

    // 1. Lấy danh sách khóa học đã đăng ký và tiến độ
    const [courses] = await db.query(`
      SELECT 
        c.id as course_id,
        c.title as course_title,
        c.image as course_image,
        c.level as course_level,
        ucp.progress_percentage,
        ucp.quiz_score,
        ucp.overall_score,
        ucp.progress_percentage_value,
        ucp.score_calculated_at,
        ucp.score_calculated_at as last_activity,
        (SELECT COUNT(*) FROM lessons l JOIN chapters ch ON l.chapter_id = ch.id WHERE ch.course_id = c.id) as total_lessons,
        (SELECT COUNT(*) FROM lesson_completion lc 
         JOIN lessons l ON lc.lesson_id = l.id 
         JOIN chapters ch ON l.chapter_id = ch.id 
         WHERE lc.user_id = ? AND ch.course_id = c.id) as completed_lessons
      FROM user_course_progress ucp
      JOIN courses c ON ucp.course_id = c.id
      WHERE ucp.user_id = ?
      ORDER BY ucp.score_calculated_at DESC
    `, [userId, userId]);

    // 2. Lấy lịch sử làm quiz
    const [quizHistory] = await db.query(`
      SELECT 
        qr.id,
        qr.course_id,
        qr.lesson_id,
        qr.score,
        qr.correct_answers,
        qr.total_questions,
        qr.created_at,
        c.title as course_title,
        l.title as lesson_title
      FROM quiz_results qr
      JOIN courses c ON qr.course_id = c.id
      LEFT JOIN lessons l ON qr.lesson_id = l.id
      WHERE qr.user_id = ?
      ORDER BY qr.created_at DESC
      LIMIT 50
    `, [userId]);

    // 3. Tính tổng thống kê (chỉ tính khóa học còn tồn tại)
    const [stats] = await db.query(`
      SELECT 
        COUNT(DISTINCT ucp.course_id) as total_courses,
        COALESCE(AVG(ucp.overall_score), 0) as avg_overall_score,
        COALESCE(AVG(ucp.quiz_score), 0) as avg_quiz_score,
        COALESCE(AVG(ucp.progress_percentage), 0) as avg_progress
      FROM user_course_progress ucp
      INNER JOIN courses c ON ucp.course_id = c.id
      WHERE ucp.user_id = ?
    `, [userId]);

    res.json({
      courses,
      quizHistory,
      stats: stats[0] || {
        total_courses: 0,
        avg_overall_score: 0,
        avg_quiz_score: 0,
        avg_progress: 0
      }
    });

  } catch (error) {
    console.error("Lỗi lấy lịch sử học tập:", error);
    res.status(500).json({ error: "Lỗi server khi lấy lịch sử học tập" });
  }
});

// --- GET: Lấy điểm số tất cả người dùng (Admin) ---
router.get("/scores/all", verifyAdmin, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        p.target_tier,
        (SELECT COUNT(DISTINCT ucp.course_id) FROM user_course_progress ucp INNER JOIN courses c ON ucp.course_id = c.id WHERE ucp.user_id = u.id) as enrolled_courses,
        (SELECT COALESCE(AVG(ucp.overall_score), 0) FROM user_course_progress ucp INNER JOIN courses c ON ucp.course_id = c.id WHERE ucp.user_id = u.id) as avg_overall_score,
        (SELECT COALESCE(AVG(ucp.quiz_score), 0) FROM user_course_progress ucp INNER JOIN courses c ON ucp.course_id = c.id WHERE ucp.user_id = u.id) as avg_quiz_score,
        (SELECT COALESCE(AVG(ucp.progress_percentage), 0) FROM user_course_progress ucp INNER JOIN courses c ON ucp.course_id = c.id WHERE ucp.user_id = u.id) as avg_progress
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.role = 'student'
      ORDER BY avg_overall_score DESC
    `);

    res.json(users);
  } catch (error) {
    console.error("Lỗi lấy điểm số:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// --- GET: Lấy chi tiết điểm số của một user (Admin) ---
router.get("/:id/scores", verifyAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Lấy điểm theo từng khóa học
    const [courseScores] = await db.query(`
      SELECT 
        c.id as course_id,
        c.title as course_title,
        ucp.progress_percentage,
        ucp.quiz_score,
        ucp.overall_score,
        ucp.score_calculated_at
      FROM user_course_progress ucp
      JOIN courses c ON ucp.course_id = c.id
      WHERE ucp.user_id = ?
      ORDER BY ucp.overall_score DESC
    `, [userId]);

    // Lấy lịch sử quiz
    const [quizResults] = await db.query(`
      SELECT 
        qr.*,
        c.title as course_title,
        l.title as lesson_title
      FROM quiz_results qr
      JOIN courses c ON qr.course_id = c.id
      LEFT JOIN lessons l ON qr.lesson_id = l.id
      WHERE qr.user_id = ?
      ORDER BY qr.created_at DESC
    `, [userId]);

    res.json({
      courseScores,
      quizResults
    });

  } catch (error) {
    console.error("Lỗi lấy điểm:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

module.exports = router;