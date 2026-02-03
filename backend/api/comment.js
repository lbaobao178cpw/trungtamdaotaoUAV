const express = require("express");
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyStudent, verifyAdmin } = require('../middleware/verifyToken');

// --- CREATE: Thêm comment mới 
router.post("/", verifyStudent, async (req, res) => {
  try {
    const { course_id, content, rating } = req.body;
    const user_id = req.user.id;

    // Kiểm tra dữ liệu
    if (!course_id || !content) {
      return res.status(400).json({ error: "course_id và content không được để trống" });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: "Nội dung comment không được để trống" });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: "Nội dung comment không được vượt quá 500 ký tự" });
    }

    // Validate rating (1-5) - default 5 if not provided
    const validRating = rating ? Math.min(5, Math.max(1, parseInt(rating))) : 5;

    // Kiểm tra khóa học có tồn tại không và lấy level của khóa học
    const [courseRows] = await db.query("SELECT id, level FROM courses WHERE id = ?", [course_id]);
    if (courseRows.length === 0) {
      return res.status(404).json({ error: "Khóa học không tồn tại" });
    }
    const courseLevel = (courseRows[0].level || '').toUpperCase(); // 'A' hoặc 'B' hoặc text

    // Lấy tier của user (target_tier trong user_profiles)
    const [profileRows] = await db.query("SELECT target_tier FROM user_profiles WHERE user_id = ?", [user_id]);
    const userTier = (profileRows[0]?.target_tier || null) ? profileRows[0].target_tier.toString().toUpperCase() : null;

    // Kiểm tra quyền bình luận theo tier hoặc enrollment
    // Nếu user đã enroll trong bảng user_course_progress thì cho phép
    const [enrollRows] = await db.query(
      "SELECT id FROM user_course_progress WHERE user_id = ? AND course_id = ?",
      [user_id, course_id]
    );

    let hasAccessByTier = false;
    // Nếu course là hạng B -> chỉ users có tier B được phép
    if (courseLevel === 'B' || (courseRows[0].level || '').toLowerCase().includes('nâng cao')) {
      if (userTier === 'B') hasAccessByTier = true;
    } else {
      // course A hoặc default: both A and B tiers can access
      if (userTier === 'A' || userTier === 'B') hasAccessByTier = true;
    }

    if (enrollRows.length === 0 && !hasAccessByTier) {
      return res.status(403).json({ error: "Bạn chỉ có thể bình luận sau khi đã đăng ký khóa học hoặc có quyền theo hạng" });
    }

    // Kiểm tra user đã bình luận cho khóa học này chưa (chỉ 1 lần)
    const [existingComment] = await db.query(
      "SELECT id FROM comments WHERE user_id = ? AND course_id = ?",
      [user_id, course_id]
    );
    if (existingComment.length > 0) {
      return res.status(400).json({ error: "Bạn đã bình luận cho khóa học này rồi" });
    }

    // Insert comment - Lưu theo múi giờ Việt Nam (UTC+7)
    const vietnamTime = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', 'T');

    const [result] = await db.query(
      `INSERT INTO comments (user_id, course_id, content, rating, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, course_id, content.trim(), validRating, vietnamTime]
    );

    res.status(201).json({
      message: "Thêm comment thành công",
      comment: {
        id: result.insertId,
        user_id,
        course_id,
        content: content.trim(),
        rating: validRating,
        created_at: vietnamTime
      }
    });

  } catch (error) {
    // console.error("Lỗi tạo comment:", error);
    res.status(500).json({ error: "Lỗi server khi tạo comment" });
  }
});

// --- READ: Lấy danh sách comments của 1 khóa học ---
router.get("/course/:course_id", async (req, res) => {
  try {
    const { course_id } = req.params;
    const { page = 1, limit } = req.query;

    // Kiểm tra khóa học có tồn tại không
    const [courseExists] = await db.query("SELECT id FROM courses WHERE id = ?", [course_id]);
    if (courseExists.length === 0) {
      return res.status(404).json({ error: "Khóa học không tồn tại" });
    }

    // Tính offset cho phân trang (nếu có limit)
    let query = `SELECT 
        c.id, 
        c.user_id, 
        c.content,
        c.rating,
        c.created_at,
        u.full_name as user_name,
        u.avatar as user_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.course_id = ?
       ORDER BY c.created_at DESC`;

    let queryParams = [course_id];

    if (limit) {
      const offset = (page - 1) * limit;
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(parseInt(limit), offset);
    }

    const [comments] = await db.query(query, queryParams);

    // Lấy tổng số comments
    const [totalCount] = await db.query(
      "SELECT COUNT(*) as count FROM comments WHERE course_id = ?",
      [course_id]
    );

    res.json({
      message: "Lấy danh sách comments thành công",
      total: totalCount[0].count,
      page: limit ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : null,
      totalPages: limit ? Math.ceil(totalCount[0].count / limit) : 1,
      comments
    });

  } catch (error) {
    // console.error("Lỗi lấy comments:", error);
    res.status(500).json({ error: "Lỗi server khi lấy comments" });
  }
});

// --- READ: Lấy comments của user hiện tại (Chỉ user đã đăng nhập) ---
router.get("/my-comments", verifyStudent, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { page = 1, limit } = req.query;

    let query = `SELECT 
        c.id, 
        c.user_id, 
        c.course_id,
        c.content,
        c.rating,
        c.created_at,
        co.title as course_title
       FROM comments c
       JOIN courses co ON c.course_id = co.id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`;

    let queryParams = [user_id];

    if (limit) {
      const offset = (page - 1) * limit;
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(parseInt(limit), offset);
    }

    const [comments] = await db.query(query, queryParams);

    const [totalCount] = await db.query(
      "SELECT COUNT(*) as count FROM comments WHERE user_id = ?",
      [user_id]
    );

    res.json({
      message: "Lấy danh sách comments của bạn thành công",
      total: totalCount[0].count,
      page: limit ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : null,
      totalPages: limit ? Math.ceil(totalCount[0].count / limit) : 1,
      comments
    });

  } catch (error) {
    // console.error("Lỗi lấy comments của user:", error);
    res.status(500).json({ error: "Lỗi server khi lấy comments" });
  }
});
// --- READ: Lấy comment theo ID ---
router.get("/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [comments] = await db.query(
      `SELECT 
        c.id, 
        c.user_id, 
        c.course_id,
        c.content,
        c.rating,
        c.created_at,
        u.full_name,
        u.avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [id]
    );

    if (comments.length === 0) {
      return res.status(404).json({ error: "Comment không tồn tại" });
    }

    res.json({
      message: "Lấy comment thành công",
      comment: comments[0]
    });

  } catch (error) {
    // console.error("Lỗi lấy comment:", error);
    res.status(500).json({ error: "Lỗi server khi lấy comment" });
  }
});

// --- UPDATE: Cập nhật comment (Chỉ chủ comment được cập nhật) ---
router.put("/:id", verifyStudent, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, rating } = req.body;
    const user_id = req.user.id;

    if (!content) {
      return res.status(400).json({ error: "Nội dung không được để trống" });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: "Nội dung comment không được để trống" });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: "Nội dung comment không được vượt quá 500 ký tự" });
    }

    // Validate rating (1-5) - default 5 if not provided
    const validRating = rating ? Math.min(5, Math.max(1, parseInt(rating))) : 5;

    // Kiểm tra comment có tồn tại không
    const [comments] = await db.query(
      "SELECT user_id FROM comments WHERE id = ?",
      [id]
    );

    if (comments.length === 0) {
      return res.status(404).json({ error: "Comment không tồn tại" });
    }

    // Kiểm tra quyền (chỉ người tạo comment mới được cập nhật)
    if (comments[0].user_id !== user_id) {
      return res.status(403).json({ error: "Bạn không có quyền cập nhật comment này" });
    }

    // Update comment with content and rating
    await db.query(
      "UPDATE comments SET content = ?, rating = ? WHERE id = ?",
      [content.trim(), validRating, id]
    );

    res.json({
      message: "Cập nhật comment thành công",
      comment: {
        id: parseInt(id),
        content: content.trim(),
        rating: validRating
      }
    });

  } catch (error) {
    // console.error("Lỗi cập nhật comment:", error);
    res.status(500).json({ error: "Lỗi server khi cập nhật comment" });
  }
});

// --- DELETE: Xóa comment (Chỉ chủ comment hoặc admin được xóa) ---
router.delete("/:id", verifyStudent, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const userRole = req.user.role;

    // Kiểm tra comment có tồn tại không
    const [comments] = await db.query(
      "SELECT user_id FROM comments WHERE id = ?",
      [id]
    );

    if (comments.length === 0) {
      return res.status(404).json({ error: "Comment không tồn tại" });
    }

    // Kiểm tra quyền (chỉ người tạo comment hoặc admin mới được xóa)
    if (comments[0].user_id !== user_id && userRole !== 'admin') {
      return res.status(403).json({ error: "Bạn không có quyền xóa comment này" });
    }

    // Delete comment
    await db.query(
      "DELETE FROM comments WHERE id = ?",
      [id]
    );

    res.json({
      message: "Xóa comment thành công"
    });

  } catch (error) {
    // console.error("Lỗi xóa comment:", error);
    res.status(500).json({ error: "Lỗi server khi xóa comment" });
  }
});



module.exports = router;
