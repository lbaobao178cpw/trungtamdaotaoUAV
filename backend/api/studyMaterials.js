const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyAdmin } = require('../middleware/verifyToken');

/**
 * GET /api/study-materials
 * Lấy danh sách tài liệu ôn thi (giống /api/display/forms)
 */
router.get('/', async (req, res) => {
    try {
        // ===== 1. LẤY & PARSE QUERY =====
        const {
            is_active = true,
            search,
            page = 1,
            limit = 20
        } = req.query;

        const pageNum = Number.parseInt(page, 10) || 1;
        const limitNum = Number.parseInt(limit, 10) || 20;
        const offset = (pageNum - 1) * limitNum;

        // ===== 2. BUILD WHERE CLAUSE =====
        let conditions = [];
        let params = [];

        // is_active
        conditions.push("is_active = ?");
        params.push(is_active === "false" || is_active === false ? 0 : 1);

        // search
        if (search) {
            conditions.push(`(title LIKE ? OR description LIKE ?)`);
            const keyword = `%${search}%`;
            params.push(keyword, keyword);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // ===== 3. COUNT QUERY =====
        const countQuery = `SELECT COUNT(*) AS total FROM study_materials ${whereClause}`;
        const [countRows] = await db.execute(countQuery, params);
        const total = countRows[0].total;
        const totalPages = Math.ceil(total / limitNum);

        // ===== 4. MAIN QUERY =====
        const mainQuery = `
            SELECT id, title, description, file_url, file_size, file_type, 
                   display_name, download_count, is_active, created_at, updated_at
            FROM study_materials
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ${limitNum} OFFSET ${offset}
        `;

        const [rows] = await db.execute(mainQuery, params);

        // ===== 5. RESPONSE =====
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

        const [rows] = await db.execute(
            `SELECT id, title, description, file_url, file_size, file_type, 
                    display_name, download_count, is_active, created_at, updated_at
             FROM study_materials
             WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tài liệu"
            });
        }

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
 * GET /api/study-materials/:id/download
 * Tải xuống tài liệu và cập nhật số lần tải
 */
router.get('/:id/download', async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin tài liệu
        const [rows] = await db.execute(
            'SELECT file_url, title, display_name, file_type FROM study_materials WHERE id = ? AND is_active = 1',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tài liệu không tồn tại'
            });
        }

        const material = rows[0];
        if (!material.file_url) {
            return res.status(404).json({
                success: false,
                message: 'File không tồn tại'
            });
        }

        // Tăng download count
        await db.execute(
            'UPDATE study_materials SET download_count = download_count + 1 WHERE id = ?',
            [id]
        );

        // Fix UTF-8 encoding issue in display_name if it exists
        let displayName = material.display_name || material.title || 'download';
        try {
            if (displayName.match(/[Ã¡-ÿ]/g)) {
                displayName = Buffer.from(displayName, 'latin1').toString('utf8');
                
            }
        } catch (e) {
            
        }

        // Get file from Cloudinary using native https module
        const https = require('https');
        const filename = displayName;

        return new Promise((resolve, reject) => {
            https.get(material.file_url, (cloudinaryRes) => {
                // Set headers with proper filename encoding (RFC 5987)
                res.setHeader('Content-Type', cloudinaryRes.headers['content-type'] || 'application/octet-stream');

                // For filename with Vietnamese characters, use proper RFC 5987 encoding
                const filenameUTF8 = Buffer.from(filename, 'utf8').toString('utf8');
                const filenameEncoded = encodeURIComponent(filenameUTF8);

                // Use RFC 5987 format: filename*=UTF-8''<encoded-filename>
                res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filenameEncoded}`);

                if (cloudinaryRes.headers['content-length']) {
                    res.setHeader('Content-Length', cloudinaryRes.headers['content-length']);
                }

                // Stream file to response
                cloudinaryRes.pipe(res);
                cloudinaryRes.on('error', reject);
                res.on('error', reject);
                res.on('finish', resolve);
            }).on('error', reject);
        });
    } catch (error) {
        console.error('Lỗi tải xuống:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/study-materials (ADMIN)
 * Thêm tài liệu ôn thi mới (giống /api/display/forms POST)
 */
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const {
            title,
            description,
            file_url,
            file_size,
            file_type,
            display_name,
            is_active = true
        } = req.body;

        // Kiểm tra required fields
        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Tiêu đề là bắt buộc"
            });
        }

        const sql = `
            INSERT INTO study_materials 
            (title, description, file_url, file_size, file_type, display_name, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const values = [
            title,
            description || null,
            file_url || null,
            file_size || null,
            file_type || null,
            display_name || null,
            is_active ? 1 : 0
        ];

        const [result] = await db.execute(sql, values);

        res.status(201).json({
            success: true,
            message: "Thêm tài liệu thành công",
            id: result.insertId
        });
    } catch (error) {
        console.error('Lỗi thêm tài liệu:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PUT /api/study-materials/:id (ADMIN)
 * Cập nhật tài liệu ôn thi (giống /api/display/forms PUT)
 */
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        let {
            title,
            description,
            file_url,
            file_size,
            file_type,
            display_name,
            is_active
        } = req.body;

        // ===== CHUẨN HÓA DỮ LIỆU =====
        const normalizeInt = (v) => v === "" || v === undefined ? null : Number(v);
        const normalizeStr = (v) => v === "" ? null : v;

        title = normalizeStr(title);
        description = normalizeStr(description);
        file_url = normalizeStr(file_url);
        file_type = normalizeStr(file_type);
        display_name = normalizeStr(display_name);
        file_size = normalizeInt(file_size);

        // ===== KIỂM TRA TỒN TẠI =====
        const [existing] = await db.execute(
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

        addField("title", title);
        addField("description", description);
        addField("file_url", file_url);
        addField("file_size", file_size);
        addField("file_type", file_type);
        addField("display_name", display_name);

        if (is_active !== undefined) {
            updateFields.push("is_active = ?");
            values.push(is_active ? 1 : 0);
        }

        updateFields.push("updated_at = NOW()");
        values.push(id);

        const sql = `
            UPDATE study_materials
            SET ${updateFields.join(", ")}
            WHERE id = ?
        `;

        await db.execute(sql, values);

        res.json({
            success: true,
            message: "Cập nhật tài liệu thành công"
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
 * Xóa tài liệu ôn thi
 */
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.execute(
            "DELETE FROM study_materials WHERE id = ?",
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
            message: "Xóa tài liệu thành công"
        });
    } catch (error) {
        console.error('Lỗi xóa tài liệu:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
