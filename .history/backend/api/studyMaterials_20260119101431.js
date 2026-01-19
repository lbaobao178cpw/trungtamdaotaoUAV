const express = require('express');
const router = express.Router();
const db = require('../config/db');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { verifyToken, verifyAdmin } = require('../middleware/verifyToken');

// Config Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

/**
 * GET /api/study-materials
 * Lấy danh sách tài liệu ôn thi (với phân trang & tìm kiếm như Forms)
 */
router.get('/', async (req, res) => {
    try {
        const {
            search,
            page = 1,
            limit = 20
        } = req.query;

        const pageNum = Number.parseInt(page, 10) || 1;
        const limitNum = Number.parseInt(limit, 10) || 20;
        const offset = (pageNum - 1) * limitNum;

        // ===== BUILD WHERE CLAUSE =====
        let conditions = [];
        let params = [];

        // is_active (luôn lấy các tài liệu đang hoạt động)
        conditions.push("s.is_active = ?");
        params.push(1);

        // search
        if (search) {
            conditions.push(`
                (
                    s.title LIKE ?
                    OR s.description LIKE ?
                )
            `);
            const keyword = `%${search}%`;
            params.push(keyword, keyword);
        }

        const whereClause =
            conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // ===== COUNT QUERY =====
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM study_materials s
            ${whereClause}
        `;

        const [countRows] = await db.query(countQuery, params);
        const total = countRows[0].total;
        const totalPages = Math.ceil(total / limitNum);

        // ===== MAIN QUERY =====
        const mainQuery = `
            SELECT s.id, s.title, s.description, s.file_url, s.file_size, s.file_type,
                   s.display_name, s.created_at, s.updated_at, s.download_count
            FROM study_materials s
            ${whereClause}
            ORDER BY s.created_at DESC
            LIMIT ${limitNum} OFFSET ${offset}
        `;

        const [rows] = await db.query(mainQuery, params);

        // ===== RESPONSE =====
        res.json({
            success: true,
            data: rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Lỗi lấy tài liệu ôn thi:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            error: {
                code: error.code,
                sqlMessage: error.sqlMessage
            }
        });
    }
});

/**
 * GET /api/study-materials/:id/download
 * Tải xuống tài liệu và cập nhật số lần tải
 */
router.get('/:id/download', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;

        // Lấy thông tin tài liệu
        const [materials] = await db.query(
            'SELECT file_url, title FROM study_materials WHERE id = ? AND is_active = 1',
            [id]
        );

        if (materials.length === 0) {
            return res.status(404).json({ error: 'Tài liệu không tồn tại' });
        }

        const material = materials[0];

        // Cập nhật số lần tải
        await connection.query(
            'UPDATE study_materials SET download_count = download_count + 1 WHERE id = ?',
            [id]
        );

        // Redirect đến URL file trên Cloudinary
        res.redirect(material.file_url);
    } catch (error) {
        console.error('Lỗi tải xuống:', error);
        res.status(500).json({ error: 'Lỗi tải xuống' });
    } finally {
        connection.release();
    }
});

/**
 * POST /api/study-materials (ADMIN)
 * Tạo tài liệu ôn thi mới
 */
router.post('/', verifyAdmin, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { title, file_url, displayName } = req.body;

        if (!title || !file_url) {
            return res.status(400).json({ success: false, error: 'Tiêu đề và file không được để trống' });
        }

        console.log('📝 Creating study material:', { title, file_url });

        // Lưu vào database
        const [result] = await connection.query(
            `INSERT INTO study_materials (title, file_url, is_active, created_at, updated_at)
       VALUES (?, ?, 1, NOW(), NOW())`,
            [title, file_url]
        );

        res.json({
            success: true,
            message: 'Tài liệu ôn thi được tạo thành công',
            id: result.insertId,
            file_url: file_url
        });
    } catch (error) {
        console.error('Lỗi tạo tài liệu:', error);
        res.status(500).json({ success: false, error: error.message || 'Lỗi tạo tài liệu' });
    } finally {
        connection.release();
    }
});

/**
 * PUT /api/study-materials/:id (ADMIN)
 * Cập nhật tài liệu ôn thi
 */
router.put('/:id', verifyAdmin, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { title, file_url } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: 'Tiêu đề không được để trống' });
        }

        console.log('📝 Updating study material:', { id, title, file_url });

        // Cập nhật database
        if (file_url) {
            // Nếu có file URL mới, cập nhật cả file URL
            await connection.query(
                `UPDATE study_materials SET title = ?, file_url = ?, updated_at = NOW() WHERE id = ?`,
                [title, file_url, id]
            );
        } else {
            // Nếu không có file URL, chỉ cập nhật tiêu đề
            await connection.query(
                `UPDATE study_materials SET title = ?, updated_at = NOW() WHERE id = ?`,
                [title, id]
            );
        }

        res.json({
            success: true,
            message: 'Tài liệu ôn thi được cập nhật thành công'
        });
    } catch (error) {
        console.error('Lỗi cập nhật tài liệu:', error);
        res.status(500).json({ success: false, error: error.message || 'Lỗi cập nhật tài liệu' });
    } finally {
        connection.release();
    }
});

/**
 * DELETE /api/study-materials/:id (ADMIN)
 * Xóa tài liệu ôn thi
 */
router.delete('/:id', verifyAdmin, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;

        // Soft delete - chỉ đánh dấu là không hoạt động
        await connection.query(
            'UPDATE study_materials SET is_active = 0 WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Tài liệu ôn thi được xóa thành công'
        });
    } catch (error) {
        console.error('Lỗi xóa tài liệu:', error);
        res.status(500).json({ success: false, error: 'Lỗi xóa tài liệu' });
    } finally {
        connection.release();
    }
});

/**
 * Helper function
 */
function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

module.exports = router;
