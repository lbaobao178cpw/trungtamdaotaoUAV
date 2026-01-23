const express = require("express");
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin, verifyStudent } = require('../middleware/verifyToken');

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


router.get("/:id", verifyToken, async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    console.log("[course/:id] courseId:", courseId, "userId:", userId, "role:", req.user.role);

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
    // - Hạng A: chỉ xem được khóa học level A (hoặc Cơ bản)
    // - Hạng B: xem được cả khóa học level A và B
    // - Admin luôn được xem tất cả
    // - Nếu user chưa đăng ký hạng nào thì không xem được

    // Admin bypass tất cả
    if (req.user.role === 'admin') {
      // Admin được xem tất cả, không cần kiểm tra tier
    } else {
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

            await connection.query(
              `INSERT INTO lessons (course_id, chapter_id, title, type, video_url, display_name, duration, content_data, order_index, required_tier)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [newCourseId, newChapterId, l.title, l.type, videoUrl, displayName, l.duration || 0, contentData, j, 'A']
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

    // 2. Chiến lược cập nhật nội dung: XÓA ĐI LÀM LẠI (An toàn nhất cho cấu trúc lồng nhau)
    // Xóa tất cả các CHƯƠNG của khóa học này. 
    // Do đã set ON DELETE CASCADE ở database (giữa chapters và lessons), các bài học sẽ tự động bị xóa theo.
    await connection.query("DELETE FROM chapters WHERE course_id = ?", [courseId]);

    // 3. Insert lại Chapters và Lessons mới
    if (chapters && chapters.length > 0) {
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

            await connection.query(
              `INSERT INTO lessons (course_id, chapter_id, title, type, video_url, display_name, duration, content_data, order_index, required_tier)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [courseId, newChapterId, l.title, l.type, videoUrl, displayName, l.duration || 0, contentData, j, 'A']
            );
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
  try {
    // Nhờ ON DELETE CASCADE ở DB, xóa courses sẽ tự xóa chapters và lessons liên quan
    await db.query("DELETE FROM courses WHERE id = ?", [req.params.id]);
    res.json({ message: "Đã xóa khóa học" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi khi xóa khóa học" });
  }
});

// --- GET: Tải tài liệu (lesson document) ---
router.get("/lessons/:lessonId/download-document", async (req, res) => {
  try {
    const { lessonId } = req.params;

    // Lấy thông tin lesson
    const [rows] = await db.query(
      "SELECT title, video_url, display_name FROM lessons WHERE id = ? AND type = 'document'",
      [lessonId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tài liệu không tồn tại"
      });
    }

    const lesson = rows[0];
    const fileUrl = lesson.video_url;

    if (!fileUrl) {
      return res.status(404).json({
        success: false,
        message: "File không tồn tại"
      });
    }

    // Lấy file từ Cloudinary
    const https = require('https');

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
      https.get(fileUrl, (cloudinaryRes) => {
        // Set headers với tên file UTF-8
        res.setHeader('Content-Type', cloudinaryRes.headers['content-type'] || 'application/octet-stream');

        const filenameUTF8 = Buffer.from(filename, 'utf8').toString('utf8');
        const filenameEncoded = encodeURIComponent(filenameUTF8);

        // RFC 5987 format: filename*=UTF-8''<encoded-filename>
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filenameEncoded}`);

        if (cloudinaryRes.headers['content-length']) {
          res.setHeader('Content-Length', cloudinaryRes.headers['content-length']);
        }

        cloudinaryRes.pipe(res);

        cloudinaryRes.on('error', (err) => {
          console.error("Lỗi Cloudinary:", err);
          res.status(500).json({ success: false, message: "Lỗi tải file" });
          reject(err);
        });

        res.on('finish', () => resolve());
      }).on('error', (err) => {
        console.error("Lỗi download:", err);
        res.status(500).json({ success: false, message: "Lỗi tải file" });
        reject(err);
      });
    });

  } catch (error) {
    console.error("Lỗi download document:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

module.exports = router;