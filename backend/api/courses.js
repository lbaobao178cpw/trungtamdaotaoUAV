const express = require("express");
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin, verifyStudent, verifyTokenOptional } = require('../middleware/verifyToken');

// === AUTO MIGRATION: Thêm cột max_attempts và pass_score nếu chưa có ===
(async () => {
  try {
    // Kiểm tra và thêm cột max_attempts
    const [columns1] = await db.query(
      "SHOW COLUMNS FROM lessons LIKE 'max_attempts'"
    );
    if (columns1.length === 0) {
      await db.query("ALTER TABLE lessons ADD COLUMN max_attempts INT DEFAULT 0");
      console.log('✅ Added max_attempts column to lessons table');
    }

    // Kiểm tra và thêm cột pass_score
    const [columns2] = await db.query(
      "SHOW COLUMNS FROM lessons LIKE 'pass_score'"
    );
    if (columns2.length === 0) {
      await db.query("ALTER TABLE lessons ADD COLUMN pass_score INT DEFAULT 0");
      console.log('✅ Added pass_score column to lessons table');
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  }
})();

// --- GET: Lấy tổng lượt xem khóa học ---
router.get("/:id/view-stats", async (req, res) => {
  try {
    const courseId = req.params.id;

    // Kiểm tra xem khóa học có tồn tại không
    const [courseExists] = await db.query(
      "SELECT id FROM courses WHERE id = ?",
      [courseId]
    );

    if (courseExists.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy khóa học" });
    }

    // Lấy thống kê lượt xem (đếm số bản ghi = tổng lượt xem)
    const [stats] = await db.query(
      `SELECT 
        COUNT(DISTINCT user_id) as unique_viewers,
        COUNT(*) as total_views,
        MAX(last_viewed_at) as last_viewed_at
       FROM course_views 
       WHERE course_id = ?`,
      [courseId]
    );

    res.json({
      message: "Lấy thống kê lượt xem thành công",
      courseId: courseId,
      uniqueViewers: stats[0].unique_viewers || 0,
      totalViews: stats[0].total_views || 0,
      lastViewedAt: stats[0].last_viewed_at || null
    });

  } catch (error) {
    console.error("Lỗi lấy thống kê lượt xem:", error);
    res.status(500).json({ error: "Lỗi server khi lấy thống kê lượt xem" });
  }
});

// --- POST: Ghi nhận lượt xem khóa học (Debounce 10 phút, không yêu cầu đăng nhập) ---
router.post("/:id/record-view", verifyStudent, async (req, res) => {
  try {
    const courseId = req.params.id;
    // Lấy user.id từ token nếu có, không thì dùng NULL (anonymous user)
    const userId = req.user?.id || null;

    // Kiểm tra xem khóa học có tồn tại không
    const [courseExists] = await db.query(
      "SELECT id FROM courses WHERE id = ?",
      [courseId]
    );

    if (courseExists.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy khóa học" });
    }

    // Kiểm tra view gần nhất của user (hoặc anonymous) cho khóa học này
    const [lastView] = await db.query(
      `SELECT id, last_viewed_at FROM course_views 
       WHERE course_id = ? AND user_id <=> ? 
       ORDER BY last_viewed_at DESC LIMIT 1`,
      [courseId, userId]
    );

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // Nếu chưa có view hoặc view cuối cùng cách đây > 10 phút, thì ghi nhận
    if (lastView.length === 0 || new Date(lastView[0].last_viewed_at) < tenMinutesAgo) {
      // Insert hàng mới (không cập nhật cái cũ)
      await db.query(
        `INSERT INTO course_views (course_id, user_id, last_viewed_at)
         VALUES (?, ?, ?)`,
        [courseId, userId, now]
      );

      return res.json({
        message: "Ghi nhận lượt xem thành công",
        recorded: true
      });
    } else {
      // View đã được ghi nhận trong 10 phút gần đây
      return res.json({
        message: "Lượt xem đã được ghi nhận gần đây, không ghi nhận lại",
        recorded: false
      });
    }

  } catch (error) {
    console.error("Lỗi ghi nhận lượt xem:", error);
    res.status(500).json({ error: "Lỗi server khi ghi nhận lượt xem" });
  }
});

// --- GET: Lấy danh sách khóa học liên quan theo LEVEL ---
router.get("/related/level/:id", async (req, res) => {
  try {
    const courseId = req.params.id;
    const { page = 1, limit } = req.query;

    // 1. Lấy thông tin level của khóa học hiện tại
    const [currentCourse] = await db.query(
      "SELECT level FROM courses WHERE id = ?",
      [courseId]
    );

    if (currentCourse.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy khóa học" });
    }

    const courseLevel = currentCourse[0].level;

    // 2. Lấy khóa học cùng level (loại trừ khóa học hiện tại)
    let query = `SELECT * FROM courses 
       WHERE level = ? AND id != ? 
       ORDER BY created_at DESC`;

    let queryParams = [courseLevel, courseId];

    if (limit) {
      const offset = (page - 1) * limit;
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(parseInt(limit), offset);
    }

    const [relatedCourses] = await db.query(query, queryParams);

    // Lấy tổng số khóa học cùng level
    const [totalCount] = await db.query(
      "SELECT COUNT(*) as count FROM courses WHERE level = ? AND id != ?",
      [courseLevel, courseId]
    );

    res.json({
      message: "Lấy khóa học liên quan thành công",
      currentLevel: courseLevel,
      total: totalCount[0].count,
      page: limit ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : null,
      totalPages: limit ? Math.ceil(totalCount[0].count / limit) : 1,
      courses: relatedCourses
    });

  } catch (error) {
    console.error("Lỗi lấy khóa học liên quan:", error);
    res.status(500).json({ error: "Lỗi server khi lấy khóa học liên quan" });
  }
});

// --- GET: Lấy danh sách tất cả khóa học (Hiển thị trang chủ/danh sách) ---
router.get("/", async (req, res) => {
  try {
    const [courses] = await db.query(`
      SELECT 
        c.*,
        COUNT(*) as totalViews,
        COUNT(DISTINCT cv.user_id) as uniqueViewers
      FROM courses c
      LEFT JOIN course_views cv ON c.id = cv.course_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách khóa học" });
  }
});

// --- GET: Lấy danh sách khóa học MÀ USER ĐƯỢC PHÉP XEM (Theo hạng đăng ký) ---
router.get("/my-accessible", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("[my-accessible] userId:", userId);

    // Lấy target_tier của user
    const [userProfile] = await db.query(
      "SELECT target_tier FROM user_profiles WHERE user_id = ?",
      [userId]
    );

    console.log("[my-accessible] userProfile:", userProfile);
    const userTier = userProfile[0]?.target_tier?.toUpperCase() || null;
    console.log("[my-accessible] userTier:", userTier);

    // Logic phân quyền:
    // - Khóa học level B hoặc "Nâng cao": chỉ user hạng B mới xem được
    // - Khóa học level A hoặc "Cơ bản": user hạng A hoặc B đều xem được
    // - Nếu user chưa đăng ký hạng: không xem được gì (trừ khóa miễn phí nếu có)
    let query = `
      SELECT 
        c.*,
        COUNT(cv.id) as totalViews,
        COUNT(DISTINCT cv.user_id) as uniqueViewers,
        CASE 
          WHEN (UPPER(c.level) = 'B' OR LOWER(c.level) LIKE '%nâng cao%') AND ? != 'B' THEN 0
          WHEN (UPPER(c.level) = 'A' OR LOWER(c.level) LIKE '%cơ bản%') AND ? IS NULL THEN 0
          ELSE 1
        END as canAccess
      FROM courses c
      LEFT JOIN course_views cv ON c.id = cv.course_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    const [courses] = await db.query(query, [userTier, userTier]);

    // Phân loại khóa học
    const accessibleCourses = courses.filter(c => c.canAccess === 1);
    const lockedCourses = courses.filter(c => c.canAccess === 0);

    res.json({
      userTier: userTier || 'Chưa đăng ký',
      accessibleCount: accessibleCourses.length,
      lockedCount: lockedCourses.length,
      courses: courses.map(c => ({
        ...c,
        canAccess: c.canAccess === 1
      }))
    });

  } catch (error) {
    console.error("Lỗi lấy danh sách khóa học theo quyền:", error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách khóa học" });
  }
});

// --- GET: Lấy chi tiết 1 BÀI HỌC (Dùng cho trang học/Quiz lẻ) ---
router.get("/lesson/:id", async (req, res) => {
  try {
    const lessonId = req.params.id;

    // Truy vấn bảng lessons
    const [rows] = await db.query("SELECT * FROM lessons WHERE id = ?", [lessonId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy bài học" });
    }

    const lesson = rows[0];

    // Parse quiz_data từ JSON string nếu có
    if (lesson.content_data && lesson.type === 'quiz') {
      try {
        lesson.quiz_data = JSON.parse(lesson.content_data);
      } catch (e) {
        lesson.quiz_data = [];
      }
    } else {
      lesson.quiz_data = [];
    }

    res.json(lesson);
  } catch (error) {
    console.error("Lỗi lấy bài học:", error);
    res.status(500).json({ error: "Lỗi server khi lấy bài học" });
  }
});


router.get("/:id", verifyTokenOptional, async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user?.id;

    console.log("[course/:id] courseId:", courseId, "userId:", userId, "role:", req.user?.role);

    // 1. Lấy thông tin khóa học
    const [courseRows] = await db.query("SELECT * FROM courses WHERE id = ?", [courseId]);
    if (courseRows.length === 0) return res.status(404).json({ error: "Không tìm thấy khóa học" });

    const course = courseRows[0];
    const courseLevel = course.level?.toUpperCase(); // A hoặc B
    console.log("[course/:id] course.level:", course.level, "courseLevel:", courseLevel);

    // 2. Lấy target_tier của user từ user_profiles
    const [userProfile] = await db.query(
      "SELECT target_tier FROM user_profiles WHERE user_id = ?",
      [userId]
    );

    const userTier = userProfile[0]?.target_tier?.toUpperCase() || null;
    console.log("[course/:id] userProfile:", userProfile, "userTier:", userTier);

    // 3. Kiểm tra quyền xem khóa học 
    // - Chỉ kiểm tra nếu user đã authenticate (có token hợp lệ)
    // - Admin luôn được xem tất cả
    // - Nếu user public (không có token) → cho phép xem tất cả
    // - Nếu user đã login nhưng chưa đăng ký tier → kiểm tra

    // Nếu có user và không phải admin thì kiểm tra tier
    if (req.user && req.user.role !== 'admin') {
      // Kiểm tra level B hoặc "Nâng cao"
      const isLevelB = courseLevel === 'B' || (course.level && course.level.toLowerCase().includes('nâng cao'));
      // Kiểm tra level A hoặc "Cơ bản"
      const isLevelA = courseLevel === 'A' || (course.level && course.level.toLowerCase().includes('cơ bản'));

      if (isLevelB && userTier !== 'B') {
        return res.status(403).json({
          error: "Bạn cần đăng ký hạng B để xem khóa học này",
          code: 'TIER_REQUIRED',
          requiredTier: 'B',
          currentTier: userTier || 'Chưa đăng ký'
        });
      }

      if (isLevelA && !userTier) {
        return res.status(403).json({
          error: "Bạn cần đăng ký khóa học để xem nội dung này",
          code: 'TIER_REQUIRED',
          requiredTier: 'A',
          currentTier: 'Chưa đăng ký'
        });
      }
    }
    // Nếu không có user (public) hoặc là admin → cho phép xem tất cả

    // 4. Lấy danh sách CHƯƠNG (Chapters)
    const [chapterRows] = await db.query(
      "SELECT * FROM chapters WHERE course_id = ? ORDER BY order_index ASC",
      [courseId]
    );

    // 5. Lấy danh sách BÀI HỌC (Lessons) thuộc khóa học này (join qua bảng chapters để lấy hết 1 lần cho tối ưu)
    // Lưu ý: Cần join bảng chapters để lọc theo course_id
    const [lessonRows] = await db.query(
      `SELECT l.* FROM lessons l 
       JOIN chapters c ON l.chapter_id = c.id 
       WHERE c.course_id = ? 
       ORDER BY l.order_index ASC`,
      [courseId]
    );

    // 6. Ghép bài học vào chương tương ứng (Mapping Data)
    const chapters = chapterRows.map(chapter => {
      // Lọc các bài học thuộc chương này
      const lessonsInChapter = lessonRows.filter(l => l.chapter_id === chapter.id);

      // Format lại dữ liệu bài học (parse JSON quiz nếu cần)
      const formattedLessons = lessonsInChapter.map(lesson => ({
        ...lesson,
        quiz_data: lesson.content_data ? JSON.parse(lesson.content_data) : []
      }));

      return {
        ...chapter,
        lessons: formattedLessons // Gán mảng bài học vào chương
      };
    });

    // Trả về dữ liệu cây: Course -> Chapters -> Lessons
    res.json({ ...courseRows[0], chapters });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi server khi lấy chi tiết khóa học" });
  }
});

// --- POST: Tạo mới khóa học (Cùng với Chương và Bài học) ---
router.post("/", async (req, res) => {
  // Dữ liệu nhận vào bây giờ có dạng: { ..., chapters: [ { title: "Chương 1", lessons: [] } ] }
  const { title, image, description, level, price, chapters } = req.body;

  const priceA = price || 0;
  const priceB = price || 0;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert Course
    const [result] = await connection.query(
      `INSERT INTO courses (title, image, description, level, price_tier_a, price_tier_b) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, image, description, level || 'Cơ bản', priceA, priceB]
    );
    const newCourseId = result.insertId;

    // 2. Insert Chapters & Lessons
    if (chapters && chapters.length > 0) {
      for (let i = 0; i < chapters.length; i++) {
        const chap = chapters[i];

        // Insert từng chương
        const [chapResult] = await connection.query(
          `INSERT INTO chapters (course_id, title, order_index) VALUES (?, ?, ?)`,
          [newCourseId, chap.title, i]
        );
        const newChapterId = chapResult.insertId;

        // Nếu chương có bài học, insert bài học và gắn với chapter_id vừa tạo
        if (chap.lessons && chap.lessons.length > 0) {
          for (let j = 0; j < chap.lessons.length; j++) {
            const l = chap.lessons[j];
            const contentData = l.type === 'quiz' ? JSON.stringify(l.quiz_data) : null;
            // Lấy video_url từ video_url hoặc content
            const videoUrl = l.video_url || l.content || '';
            // Lấy display_name (tên file gốc)
            const displayName = l.display_name || null;
            // Lấy max_attempts và pass_score cho quiz
            const maxAttempts = l.max_attempts || 0;
            const passScore = l.pass_score || 0;

            await connection.query(
              `INSERT INTO lessons (course_id, chapter_id, title, type, video_url, display_name, duration, content_data, order_index, required_tier, max_attempts, pass_score)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [newCourseId, newChapterId, l.title, l.type, videoUrl, displayName, l.duration || 0, contentData, j, 'A', maxAttempts, passScore]
            );
          }
        }
      }
    }

    await connection.commit();
    res.status(201).json({ message: "Tạo khóa học thành công", id: newCourseId });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: "Lỗi khi tạo khóa học" });
  } finally {
    connection.release();
  }
});

// --- PUT: Cập nhật khóa học ---
router.put("/:id", async (req, res) => {
  const courseId = req.params.id;
  // Payload nhận vào cũng phải có cấu trúc chapters lồng nhau
  const { title, image, description, level, price, chapters } = req.body;
  const priceA = price || 0;
  const priceB = price || 0;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Update Course Info
    await connection.query(
      `UPDATE courses 
       SET title=?, image=?, description=?, level=?, price_tier_a=?, price_tier_b=? 
       WHERE id=?`,
      [title, image, description, level, priceA, priceB, courseId]
    );

    // 2. Nếu payload chứa `chapters` thì thay thế toàn bộ chapters/lessons.
    // Nếu frontend chỉ cập nhật metadata (ví dụ: title, image, price) và không gửi
    // trường `chapters`, thì không xóa dữ liệu hiện có (tránh mất bài học).
    if (Array.isArray(chapters)) {
      // Chiến lược cập nhật nội dung: XÓA ĐI LÀM LẠI (An toàn nhất cho cấu trúc lồng nhau)
      // Xóa tất cả các CHƯƠNG của khóa học này.
      // Do đã set ON DELETE CASCADE ở database (giữa chapters và lessons), các bài học sẽ tự động bị xóa theo.
      await connection.query("DELETE FROM chapters WHERE course_id = ?", [courseId]);

      // 3. Insert lại Chapters và Lessons mới (chỉ khi chapters được cung cấp)
      if (chapters.length > 0) {
        for (let i = 0; i < chapters.length; i++) {
          const chap = chapters[i];

          // Tạo chương mới
          const [chapResult] = await connection.query(
            `INSERT INTO chapters (course_id, title, order_index) VALUES (?, ?, ?)`,
            [courseId, chap.title, i]
          );
          const newChapterId = chapResult.insertId;

          // Tạo bài học cho chương đó
          if (chap.lessons && chap.lessons.length > 0) {
            for (let j = 0; j < chap.lessons.length; j++) {
              const l = chap.lessons[j];
              const contentData = l.type === 'quiz' ? JSON.stringify(l.quiz_data) : null;
              // Lấy video_url từ video_url hoặc content
              const videoUrl = l.video_url || l.content || '';
              // Lấy display_name (tên file gốc)
              const displayName = l.display_name || null;
              // Lấy max_attempts và pass_score cho quiz
              const maxAttempts = l.max_attempts || 0;
              const passScore = l.pass_score || 0;

              await connection.query(
                `INSERT INTO lessons (course_id, chapter_id, title, type, video_url, display_name, duration, content_data, order_index, required_tier, max_attempts, pass_score)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [courseId, newChapterId, l.title, l.type, videoUrl, displayName, l.duration || 0, contentData, j, 'A', maxAttempts, passScore]
              );
            }
          }
        }
      }
    }

    await connection.commit();
    res.json({ message: "Cập nhật khóa học thành công" });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: "Lỗi khi cập nhật khóa học" });
  } finally {
    connection.release();
  }
});

// --- DELETE: Xóa khóa học ---
router.delete("/:id", async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const courseId = req.params.id;

    // Xóa dữ liệu học tập liên quan trước
    // 1. Xóa quiz_results
    await connection.query("DELETE FROM quiz_results WHERE course_id = ?", [courseId]);

    // 2. Xóa lesson_completion (dựa vào lessons của course)
    await connection.query(
      `DELETE lc FROM lesson_completion lc 
       INNER JOIN lessons l ON lc.lesson_id = l.id 
       WHERE l.course_id = ?`,
      [courseId]
    );

    // 3. Xóa user_course_progress
    await connection.query("DELETE FROM user_course_progress WHERE course_id = ?", [courseId]);

    // 4. Xóa course_views
    await connection.query("DELETE FROM course_views WHERE course_id = ?", [courseId]);

    // 5. Cuối cùng xóa khóa học (CASCADE sẽ xóa chapters và lessons)
    await connection.query("DELETE FROM courses WHERE id = ?", [courseId]);

    await connection.commit();
    res.json({ message: "Đã xóa khóa học và dữ liệu liên quan" });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: "Lỗi khi xóa khóa học" });
  } finally {
    connection.release();
  }
});

// --- GET: Debug document info (kiểm tra URL có đúng không) ---
router.get("/lessons/:lessonId/debug-document", async (req, res) => {
  try {
    const { lessonId } = req.params;

    const [rows] = await db.query(
      "SELECT id, title, video_url, display_name, type FROM lessons WHERE id = ?",
      [lessonId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const lesson = rows[0];
    const fileUrl = lesson.video_url;

    res.json({
      success: true,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        display_name: lesson.display_name,
        video_url: lesson.video_url,
        video_url_length: fileUrl ? fileUrl.length : 0,
        url_starts_with_https: fileUrl ? fileUrl.startsWith('https') : false,
        url_starts_with_http: fileUrl ? fileUrl.startsWith('http') : false,
        is_cloudinary_url: fileUrl ? fileUrl.includes('cloudinary') : false,
        url_sample: fileUrl ? fileUrl.substring(0, 100) + '...' : null
      }
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- GET: Tải tài liệu (lesson document) ---
router.get("/lessons/:lessonId/download-document", async (req, res) => {
  try {
    const { lessonId } = req.params;
    console.log(`📥 Download document request for lesson: ${lessonId}`);

    // Lấy thông tin lesson
    const [rows] = await db.query(
      "SELECT id, title, video_url, display_name, type FROM lessons WHERE id = ? AND type = 'document'",
      [lessonId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tài liệu không tồn tại"
      });
    }

    const lesson = rows[0];
    console.log("Lesson data:", lesson);

    // File URL nằm ở video_url
    const fileUrl = lesson.video_url;
    console.log("File URL:", fileUrl);

    if (!fileUrl) {
      return res.status(404).json({
        success: false,
        message: "File URL không tồn tại"
      });
    }

    // Lấy file từ Cloudinary
    const https = require('https');
    const http = require('http');

    // Ưu tiên display_name (tên file gốc), nếu không có thì dùng title
    let filename = lesson.display_name || lesson.title || 'document';

    // Fix UTF-8 encoding issue nếu có
    try {
      if (filename.match(/[Ã¡-ÿ]/g)) {
        filename = Buffer.from(filename, 'latin1').toString('utf8');
        console.log("🔧 Fixed display_name encoding:", filename);
      }
    } catch (e) {
      console.log("⚠️ Display name encoding fix failed");
    }

    return new Promise((resolve, reject) => {
      // Chọn protocol (http hoặc https)
      const protocol = fileUrl.startsWith('https') ? https : http;

      console.log(`Starting download from: ${fileUrl}`);

      protocol.get(fileUrl, (cloudinaryRes) => {
        console.log("Cloudinary response status:", cloudinaryRes.statusCode);
        console.log("Cloudinary headers:", {
          'content-type': cloudinaryRes.headers['content-type'],
          'content-length': cloudinaryRes.headers['content-length']
        });

        // Set headers với tên file UTF-8
        res.setHeader('Content-Type', cloudinaryRes.headers['content-type'] || 'application/octet-stream');

        const filenameUTF8 = Buffer.from(filename, 'utf8').toString('utf8');
        const filenameEncoded = encodeURIComponent(filenameUTF8);

        // RFC 5987 format: filename*=UTF-8''<encoded-filename>
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filenameEncoded}`);

        if (cloudinaryRes.headers['content-length']) {
          res.setHeader('Content-Length', cloudinaryRes.headers['content-length']);
          console.log("Content-Length set to:", cloudinaryRes.headers['content-length']);
        }

        console.log("✅ Starting to pipe response...");
        cloudinaryRes.pipe(res);

        cloudinaryRes.on('data', (chunk) => {
          console.log("📦 Received chunk:", chunk.length, "bytes");
        });

        cloudinaryRes.on('end', () => {
          console.log("✅ Download complete");
          resolve();
        });

        cloudinaryRes.on('error', (err) => {
          console.error("❌ Cloudinary error:", err);
          if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Lỗi tải file" });
          }
          reject(err);
        });
      }).on('error', (err) => {
        console.error("❌ Download error:", err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "Lỗi tải file" });
        }
        reject(err);
      });
    });

  } catch (error) {
    console.error("❌ Lỗi download document:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Lỗi server" });
    }
  }
});

// --- GET: Xem trực tiếp tài liệu (Preview) - Không tải về ---
router.get("/lessons/:lessonId/preview-document", async (req, res) => {
  try {
    const { lessonId } = req.params;
    console.log(`👁️ Preview document request for lesson: ${lessonId}`);

    // Lấy thông tin lesson
    const [rows] = await db.query(
      "SELECT id, title, video_url, display_name, type FROM lessons WHERE id = ? AND type = 'document'",
      [lessonId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tài liệu không tồn tại"
      });
    }

    const lesson = rows[0];
    console.log("Lesson data:", lesson);

    // File URL nằm ở video_url
    const fileUrl = lesson.video_url;
    console.log("File URL:", fileUrl);

    if (!fileUrl) {
      return res.status(404).json({
        success: false,
        message: "File URL không tồn tại"
      });
    }

    // Lấy file từ Cloudinary
    const https = require('https');
    const http = require('http');

    return new Promise((resolve, reject) => {
      // Chọn protocol (http hoặc https)
      const protocol = fileUrl.startsWith('https') ? https : http;

      console.log(`Starting preview from: ${fileUrl}`);

      protocol.get(fileUrl, (cloudinaryRes) => {
        console.log("Cloudinary response status:", cloudinaryRes.statusCode);
        console.log("Cloudinary headers:", {
          'content-type': cloudinaryRes.headers['content-type'],
          'content-length': cloudinaryRes.headers['content-length']
        });

        // Lấy content-type từ Cloudinary
        const contentType = cloudinaryRes.headers['content-type'] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);

        // QUAN TRỌNG: Luôn sử dụng 'inline' để xem trong trình duyệt
        // Không set filename để tránh trigger download dialog
        res.setHeader('Content-Disposition', 'inline');

        // Disable cache busting để browser có thể cache
        res.setHeader('Cache-Control', 'public, max-age=3600');

        if (cloudinaryRes.headers['content-length']) {
          res.setHeader('Content-Length', cloudinaryRes.headers['content-length']);
          console.log("Content-Length set to:", cloudinaryRes.headers['content-length']);
        }

        // Cho phép CORS
        res.setHeader('Access-Control-Allow-Origin', '*');

        console.log("✅ Starting to pipe preview...");
        cloudinaryRes.pipe(res);

        cloudinaryRes.on('data', (chunk) => {
          console.log("📦 Received preview chunk:", chunk.length, "bytes");
        });

        cloudinaryRes.on('end', () => {
          console.log("✅ Preview complete");
          resolve();
        });

        cloudinaryRes.on('error', (err) => {
          console.error("❌ Cloudinary preview error:", err);
          if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Lỗi tải file" });
          }
          reject(err);
        });
      }).on('error', (err) => {
        console.error("❌ Preview error:", err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "Lỗi tải file" });
        }
        reject(err);
      });
    });

  } catch (error) {
    console.error("❌ Lỗi preview document:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Lỗi server" });
    }
  }
});

// --- GET: Kiểm tra số lần đã làm quiz của user ---
router.get("/:courseId/quiz-attempts/:lessonId", verifyToken, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;

    // Lấy max_attempts từ lesson
    const [lessonRows] = await db.query(
      "SELECT max_attempts, pass_score FROM lessons WHERE id = ?",
      [lessonId]
    );

    if (lessonRows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy bài học" });
    }

    const maxAttempts = lessonRows[0].max_attempts || 0;
    const passScore = lessonRows[0].pass_score || 0;

    // Đếm số lần đã làm quiz
    const [attemptRows] = await db.query(
      `SELECT COUNT(*) as attemptCount, MAX(score) as bestScore 
       FROM quiz_results 
       WHERE user_id = ? AND lesson_id = ?`,
      [userId, lessonId]
    );

    const attemptCount = attemptRows[0].attemptCount || 0;
    const bestScore = attemptRows[0].bestScore || 0;
    const remainingAttempts = maxAttempts === 0 ? -1 : Math.max(0, maxAttempts - attemptCount);
    const canAttempt = maxAttempts === 0 || attemptCount < maxAttempts;

    res.json({
      attemptCount,
      maxAttempts,
      remainingAttempts,
      canAttempt,
      bestScore,
      passScore
    });

  } catch (error) {
    console.error("Lỗi kiểm tra số lần làm quiz:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// --- POST: Lưu kết quả quiz ---
router.post("/:courseId/quiz-result", verifyToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const { lessonId, score, correctAnswers, totalQuestions } = req.body;

    if (score === undefined || lessonId === undefined) {
      return res.status(400).json({ error: "Thiếu thông tin điểm quiz" });
    }

    // Kiểm tra bảng quiz_results có tồn tại không, nếu chưa thì tạo
    await db.query(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        lesson_id INT,
        score DECIMAL(5,2) NOT NULL,
        correct_answers INT,
        total_questions INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_course (user_id, course_id),
        INDEX idx_lesson (lesson_id)
      )
    `);

    // Lưu kết quả quiz (cho phép làm lại nhiều lần)
    await db.query(`
      INSERT INTO quiz_results (user_id, course_id, lesson_id, score, correct_answers, total_questions)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, courseId, lessonId, score, correctAnswers, totalQuestions]);

    res.json({
      message: "Lưu kết quả quiz thành công",
      score,
      correctAnswers,
      totalQuestions
    });

  } catch (error) {
    console.error("Lỗi lưu kết quả quiz:", error);
    res.status(500).json({ error: "Lỗi server khi lưu kết quả quiz" });
  }
});

// --- POST: Track video watching progress ---
router.post("/:courseId/track-video/:lessonId", verifyToken, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { watchedSeconds = 0, totalSeconds = 0 } = req.body;
    const userId = req.user.id;

    console.log(`🎥 Tracking video: lesson=${lessonId}, watched=${watchedSeconds}s/${totalSeconds}s`);

    // Lấy thông tin lesson
    const [lesson] = await db.query(
      "SELECT id, duration FROM lessons WHERE id = ?",
      [lessonId]
    );

    if (lesson.length === 0) {
      return res.status(404).json({ error: "Lesson không tồn tại" });
    }

    const lessonDuration = lesson[0].duration || totalSeconds || 1;
    const watchedPercentage = Math.round((watchedSeconds / lessonDuration) * 100);

    console.log(`📊 Watched: ${watchedPercentage}%`);

    // Nếu xem >= 80%, mark as completed
    if (watchedPercentage >= 80) {
      // Mark as completed - table and columns already migrated
      await db.query(`
        INSERT INTO lesson_completion (user_id, lesson_id, course_id, watched_seconds, watched_percentage)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          watched_seconds = VALUES(watched_seconds),
          watched_percentage = VALUES(watched_percentage),
          completed_at = NOW()
      `, [userId, lessonId, courseId, watchedSeconds, watchedPercentage]);

      console.log(`✅ Lesson marked as completed (${watchedPercentage}%)`);
    }

    res.json({
      message: "Video tracked",
      watchedPercentage,
      isCompleted: watchedPercentage >= 80,
      watchedSeconds,
      totalSeconds: lessonDuration
    });

  } catch (error) {
    console.error("Lỗi tracking video:", error);
    res.status(500).json({ error: "Lỗi server khi tracking video" });
  }
});

// --- POST: Track lesson (for documents) ---
router.post("/:courseId/track-lesson/:lessonId", verifyToken, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;

    console.log(`📍 Tracking lesson: user=${userId}, course=${courseId}, lesson=${lessonId}`);

    // Kiểm tra bảng lesson_completion
    const [checkTable] = await db.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lesson_completion'
    `);

    // Nếu chưa có table, tạo
    if (checkTable.length === 0) {
      await db.query(`
        CREATE TABLE lesson_completion (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          lesson_id INT NOT NULL,
          course_id INT NOT NULL,
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_lesson (user_id, lesson_id),
          INDEX idx_user_course (user_id, course_id)
        )
      `);
      console.log('Created lesson_completion table');
    }

    // Insert hoặc ignore nếu đã có
    await db.query(`
      INSERT IGNORE INTO lesson_completion (user_id, lesson_id, course_id)
      VALUES (?, ?, ?)
    `, [userId, lessonId, courseId]);

    // Tính lại progress percentage
    // Lấy tổng số lesson trong khóa học
    const [totalLessons] = await db.query(`
      SELECT COUNT(DISTINCT l.id) as total 
      FROM lessons l
      INNER JOIN chapters c ON l.chapter_id = c.id
      WHERE c.course_id = ?
      GROUP BY c.course_id
    `, [courseId]);

    // Nếu không có result, try query khác
    let totalCount = totalLessons[0]?.total;

    if (!totalCount) {
      const [fallback] = await db.query(`
        SELECT COUNT(*) as total FROM lessons
        WHERE chapter_id IN (
          SELECT id FROM chapters WHERE course_id = ?
        )
      `, [courseId]);
      totalCount = fallback[0]?.total || 1;
    }

    totalCount = totalCount || 1;

    // Lấy số lesson đã hoàn thành
    // - Non-video (documents, quiz): Count ngay khi tracked
    // - Videos: Count nếu watched_percentage >= 80% (tracked via track-video)
    //           HOẶC watched_percentage = 0 (tracked via track-lesson = YouTube/instant)
    const [completedLessons] = await db.query(`
      SELECT COUNT(DISTINCT lc.lesson_id) as completed 
      FROM lesson_completion lc
      LEFT JOIN lessons l ON lc.lesson_id = l.id
      WHERE lc.user_id = ? 
        AND lc.course_id = ?
        AND (
          l.type != 'video'  -- Non-videos: count immediately
          OR (l.type = 'video' AND (lc.watched_percentage = 0 OR lc.watched_percentage >= 80))  -- Videos: count if tracked (0=instant/YouTube) or >= 80% (HTML5)
        )
    `, [userId, courseId]);

    const completedCount = completedLessons[0]?.completed || 0;
    // Cap progress ở 100%
    const progressPercentage = Math.min(100, Math.round((completedCount / totalCount) * 100));

    console.log(`✅ Progress: ${completedCount}/${totalCount} = ${progressPercentage}% (Course ${courseId})`);

    // Cập nhật progress
    await db.query(`
      INSERT INTO user_course_progress (user_id, course_id, progress_percentage, progress_percentage_value)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        progress_percentage = VALUES(progress_percentage),
        progress_percentage_value = VALUES(progress_percentage_value)
    `, [userId, courseId, progressPercentage, progressPercentage]);

    res.json({
      message: "Tracking thành công",
      lessonId,
      progressPercentage,
      completedCount,
      totalCount
    });

  } catch (error) {
    console.error("Lỗi tracking lesson:", error);
    res.status(500).json({ error: "Lỗi server khi tracking lesson" });
  }
});

// --- GET: Lấy tiến độ học của học sinh trong khóa học ---
router.get("/:courseId/progress/:userId", verifyToken, async (req, res) => {
  try {
    const { courseId, userId } = req.params;

    // Kiểm tra quyền (chỉ admin hoặc chính học sinh đó mới xem được)
    if (req.user.id != userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Không có quyền xem tiến độ này" });
    }

    // Lấy thông tin khóa học
    const [course] = await db.query(
      "SELECT id FROM courses WHERE id = ?",
      [courseId]
    );

    if (course.length === 0) {
      return res.status(404).json({ error: "Khóa học không tồn tại" });
    }

    // Lấy tiến độ học từ user_course_progress
    const [progress] = await db.query(`
      SELECT 
        user_id,
        course_id,
        quiz_score,
        progress_percentage_value,
        overall_score,
        started_at,
        completed_at,
        score_calculated_at
      FROM user_course_progress
      WHERE user_id = ? AND course_id = ?
    `, [userId, courseId]);

    if (progress.length === 0) {
      // Nếu chưa có record, tạo mới
      console.log(`Creating new progress record for user ${userId}, course ${courseId}`);
      await db.query(`
        INSERT INTO user_course_progress (user_id, course_id, progress_percentage, progress_percentage_value, quiz_score, overall_score)
        VALUES (?, ?, 0, 0, 0, NULL)
      `, [userId, courseId]);

      return res.json({
        message: "Chưa có tiến độ học",
        user_id: userId,
        course_id: courseId,
        quiz_score: 0,
        progress_percentage_value: 0,
        overall_score: null,
        started_at: new Date(),
        completed_at: null,
        score_calculated_at: null
      });
    }

    res.json({
      message: "Lấy tiến độ học thành công",
      ...progress[0]
    });

  } catch (error) {
    console.error("Lỗi lấy tiến độ học:", error);
    res.status(500).json({ error: "Lỗi server khi lấy tiến độ học" });
  }
});

// --- POST: Tính lại điểm tổng thể (Gọi sau khi hoàn thành quiz hoặc xem video) ---
router.post("/:courseId/calculate-score/:userId", verifyToken, async (req, res) => {
  try {
    const { courseId, userId } = req.params;

    // Kiểm tra quyền
    if (req.user.id != userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Không có quyền tính điểm" });
    }

    // 1. Lấy tổng số bài học (video + tài liệu + quiz) trong khóa
    const [totalLessons] = await db.query(`
      SELECT COUNT(*) as total FROM lessons l
      JOIN chapters c ON l.chapter_id = c.id
      WHERE c.course_id = ?
    `, [courseId]);

    const totalLessonCount = totalLessons[0].total || 0;

    if (totalLessonCount === 0) {
      return res.status(400).json({ error: "Khóa học không có bài học" });
    }

    // 2. Lấy số bài học mà học sinh đã hoàn thành (viewed/taken quiz)
    // Giả sử: nếu có record trong lesson_completion hoặc quiz_results thì đã hoàn thành
    // Nếu chưa có table này, dùng tiến độ từ user_course_progress
    const [userProgress] = await db.query(`
      SELECT progress_percentage FROM user_course_progress
      WHERE user_id = ? AND course_id = ?
    `, [userId, courseId]);

    const currentProgressPercentage = userProgress[0]?.progress_percentage || 0;

    // 3. Tính trung bình điểm Quiz
    // Giả sử: Quiz được lưu trong bảng quiz_results hoặc quiz_scores
    // Nếu chưa có, set mặc định = NULL (chưa làm quiz)
    const [quizScores] = await db.query(`
      SELECT MAX(score) as max_quiz_score
      FROM quiz_results
      WHERE user_id = ? AND course_id = ?
    `, [userId, courseId]);

    const rawQuizScore = quizScores[0]?.max_quiz_score;
    const quizScore = rawQuizScore ? parseFloat(rawQuizScore) : 0;

    // 4. Tính điểm tổng thể theo công thức
    // Điểm Tổng = (Quiz × 70%) + (Tiến Độ × 30%)
    const overallScore = (quizScore * 0.7) + (currentProgressPercentage * 0.3);

    // 5. Cập nhật hoặc tạo mới record user_course_progress
    await db.query(`
      INSERT INTO user_course_progress (user_id, course_id, progress_percentage, quiz_score, progress_percentage_value, overall_score, score_calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        quiz_score = VALUES(quiz_score),
        progress_percentage_value = VALUES(progress_percentage_value),
        overall_score = VALUES(overall_score),
        score_calculated_at = NOW()
    `, [userId, courseId, currentProgressPercentage, quizScore, currentProgressPercentage, overallScore]);

    res.json({
      message: "Tính điểm thành công",
      courseId,
      userId,
      quiz_score: quizScore.toFixed(2),
      progress_percentage: currentProgressPercentage,
      overall_score: overallScore.toFixed(2),
      formula: `(${quizScore.toFixed(2)} × 0.7) + (${currentProgressPercentage} × 0.3) = ${overallScore.toFixed(2)}`
    });

  } catch (error) {
    console.error("Lỗi tính điểm:", error);
    res.status(500).json({ error: "Lỗi server khi tính điểm" });
  }
});

// --- GET: Lấy bảng xếp hạng học sinh trong khóa học ---
router.get("/:courseId/leaderboard", verifyToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    // Kiểm tra khóa học tồn tại
    const [course] = await db.query(
      "SELECT id FROM courses WHERE id = ?",
      [courseId]
    );

    if (course.length === 0) {
      return res.status(404).json({ error: "Khóa học không tồn tại" });
    }

    // Lấy tất cả bảng xếp hạng (không dùng RANK() vì có thể không support)
    const [allLeaderboard] = await db.query(`
      SELECT 
        ucp.user_id,
        u.full_name,
        u.email,
        ucp.quiz_score,
        ucp.progress_percentage_value as progress_percentage,
        ucp.overall_score,
        ucp.score_calculated_at
      FROM user_course_progress ucp
      JOIN users u ON ucp.user_id = u.id
      WHERE ucp.course_id = ?
      ORDER BY ucp.overall_score DESC, ucp.user_id ASC
    `, [courseId]);

    // Tính rank thủ công
    const leaderboardWithRank = allLeaderboard.map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    // Phân trang
    const offset = (page - 1) * limit;
    const paginatedLeaderboard = leaderboardWithRank.slice(offset, offset + parseInt(limit));

    res.json({
      message: "Lấy bảng xếp hạng thành công",
      courseId,
      total: leaderboardWithRank.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(leaderboardWithRank.length / limit),
      leaderboard: paginatedLeaderboard
    });

  } catch (error) {
    console.error("Lỗi lấy bảng xếp hạng:", error);
    res.status(500).json({ error: "Lỗi server khi lấy bảng xếp hạng" });
  }
});

module.exports = router;