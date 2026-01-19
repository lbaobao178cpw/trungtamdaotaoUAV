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
 * GET /api/study-materials/:id
 * Lấy chi tiết tài liệu ôn thi
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT id, title, description, file_url, file_size, file_type,
                    display_name, created_at, updated_at, download_count
             FROM study_materials
             WHERE id = ? AND is_active = 1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tài liệu"
            });
        }

        // Tăng download count
        await db.query(
            "UPDATE study_materials SET download_count = download_count + 1 WHERE id = ?",
            [id]
        );

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Lỗi lấy chi tiết tài liệu:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/study-materials (ADMIN)
 * Tạo tài liệu ôn thi mới (giống như Forms API)
 */
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const {
            title,
            description,
            file_url,
            display_name
        } = req.body;

        // Kiểm tra required fields
        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Tiêu đề là bắt buộc"
            });
        }

        if (!file_url) {
            return res.status(400).json({
                success: false,
                message: "File URL là bắt buộc"
            });
        }

        const sql = `
            INSERT INTO study_materials 
            (title, description, file_url, display_name, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const values = [
            title,
            description || null,
            file_url,
            display_name || title
        ];

        const [result] = await db.query(sql, values);

        res.status(201).json({
            success: true,
            message: "Tài liệu ôn thi được tạo thành công",
            id: result.insertId
        });
    } catch (error) {
        console.error('Lỗi tạo tài liệu:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PUT /api/study-materials/:id (ADMIN)
 * Cập nhật tài liệu ôn thi (giống như Forms API)
 */
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            file_url,
            display_name
        } = req.body;

        // ===== CHUẨN HÓA DỮ LIỆU =====
        const normalizeStr = (v) =>
            v === "" ? null : v;

        let normalizedTitle = normalizeStr(title);
        let normalizedDescription = normalizeStr(description);
        let normalizedFileUrl = normalizeStr(file_url);
        let normalizedDisplayName = normalizeStr(display_name);

        // ===== KIỂM TRA TỒN TẠI =====
        const [existing] = await db.query(
            "SELECT id FROM study_materials WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tài liệu"
            });
        }

        // ===== BUILD UPDATE =====
        const updateFields = [];
        const values = [];

        const addField = (field, value) => {
            if (value !== undefined) {
                updateFields.push(`${field} = ?`);
                values.push(value);
            }
        };

        if (normalizedTitle !== undefined) addField("title", normalizedTitle);
        if (normalizedDescription !== undefined) addField("description", normalizedDescription);
        if (normalizedFileUrl !== undefined) addField("file_url", normalizedFileUrl);
        if (normalizedDisplayName !== undefined) addField("display_name", normalizedDisplayName);

        updateFields.push("updated_at = NOW()");
        values.push(id);

        const sql = `
            UPDATE study_materials
            SET ${updateFields.join(", ")}
            WHERE id = ?
        `;

        await db.query(sql, values);

        res.json({
            success: true,
            message: "Tài liệu ôn thi được cập nhật thành công"
        });
    } catch (error) {
        console.error('Lỗi cập nhật tài liệu:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * DELETE /api/study-materials/:id (ADMIN)
 * Xóa tài liệu ôn thi (soft delete)
 */
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'UPDATE study_materials SET is_active = 0 WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tài liệu"
            });
        }

        res.json({
            success: true,
            message: "Tài liệu ôn thi được xóa thành công"
        });
    } catch (error) {
        console.error('Lỗi xóa tài liệu:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa tài liệu' });
    }
});

/**
 * GET /api/study-materials/:id/download
 * Tải xuống tài liệu với tên file đúng
 */
router.get('/:id/download', async (req, res) => {
    try {
        const { id } = req.params;

        // Get material info
        const [rows] = await db.query(
            "SELECT id, file_url, display_name, title FROM study_materials WHERE id = ? AND is_active = 1",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tài liệu"
            });
        }

        const material = rows[0];
        if (!material.file_url) {
            return res.status(404).json({
                success: false,
                message: "File không tồn tại"
            });
        }

        // Redirect to Cloudinary URL with filename
        const https = require('https');
        const displayName = material.display_name || material.title || 'download';

        return new Promise((resolve, reject) => {
            https.get(material.file_url, (cloudinaryRes) => {
                res.setHeader('Content-Type', cloudinaryRes.headers['content-type'] || 'application/octet-stream');

                const filenameUTF8 = Buffer.from(displayName, 'utf8').toString('utf8');
                const filenameEncoded = encodeURIComponent(filenameUTF8);
                res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filenameEncoded}`);

                if (cloudinaryRes.headers['content-length']) {
                    res.setHeader('Content-Length', cloudinaryRes.headers['content-length']);
                }

                cloudinaryRes.pipe(res);

                cloudinaryRes.on('error', (err) => {
                    console.error('Lỗi download từ Cloudinary:', err);
                    res.status(500).json({ success: false, message: 'Lỗi tải file' });
                    reject(err);
                });

                res.on('finish', () => resolve());
            }).on('error', (err) => {
                console.error('Lỗi kết nối Cloudinary:', err);
                res.status(500).json({ success: false, message: 'Lỗi kết nối' });
                reject(err);
            });
        });
    } catch (error) {
        console.error('Lỗi tải xuống:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
