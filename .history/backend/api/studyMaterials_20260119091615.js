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
 * Lấy danh sách tài liệu ôn thi
 */
router.get('/', async (req, res) => {
    try {
        const [materials] = await db.query(
            `SELECT id, title, description, file_url, file_size, file_type, 
              certificate_type, created_at, download_count 
       FROM study_materials 
       WHERE is_active = 1 
       ORDER BY created_at DESC`
        );

        // Chuyển đổi file_size từ bytes sang MB/KB
        const materialsWithFormatted = materials.map(m => ({
            ...m,
            file_size_formatted: formatFileSize(m.file_size)
        }));

        res.json({
            success: true,
            data: materialsWithFormatted
        });
    } catch (error) {
        console.error('Lỗi lấy tài liệu ôn thi:', error);
        res.status(500).json({ success: false, error: 'Lỗi lấy dữ liệu' });
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
router.post('/', verifyAdmin, upload.single('file'), async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { title, description, certificateType } = req.body;

        if (!title || !req.file) {
            return res.status(400).json({ error: 'Tiêu đề và file không được để trống' });
        }

        console.log('📤 Uploading study material to Cloudinary...');

        // Upload file lên Cloudinary
        const uploadResponse = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'auto',
                    folder: 'uav-study-materials',
                    public_id: `${title}-${Date.now()}`.replace(/\s+/g, '-').toLowerCase(),
                    overwrite: true
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            uploadStream.end(req.file.buffer);
        });

        console.log('✅ File uploaded:', uploadResponse.secure_url);

        // Lưu vào database
        const [result] = await connection.query(
            `INSERT INTO study_materials (title, description, file_url, file_size, file_type, certificate_type, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
                title,
                description || null,
                uploadResponse.secure_url,
                uploadResponse.bytes || req.file.size,
                req.file.mimetype,
                certificateType || null
            ]
        );

        res.json({
            success: true,
            message: 'Tài liệu ôn thi được tạo thành công',
            id: result.insertId,
            file_url: uploadResponse.secure_url
        });
    } catch (error) {
        console.error('Lỗi tạo tài liệu:', error);
        res.status(500).json({ success: false, error: 'Lỗi tạo tài liệu' });
    } finally {
        connection.release();
    }
});

/**
 * PUT /api/study-materials/:id (ADMIN)
 * Cập nhật tài liệu ôn thi
 */
router.put('/:id', verifyAdmin, upload.single('file'), async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { title, description, certificateType } = req.body;

        // Lấy tài liệu cũ
        const [materials] = await db.query(
            'SELECT file_url FROM study_materials WHERE id = ?',
            [id]
        );

        if (materials.length === 0) {
            return res.status(404).json({ error: 'Tài liệu không tồn tại' });
        }

        let fileUrl = materials[0].file_url;
        let fileSize = null;
        let fileType = null;

        // Nếu có file mới, upload lên Cloudinary
        if (req.file) {
            console.log('📤 Uploading new file to Cloudinary...');

            const uploadResponse = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'auto',
                        folder: 'uav-study-materials',
                        public_id: `${title}-${Date.now()}`.replace(/\s+/g, '-').toLowerCase(),
                        overwrite: true
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );

                uploadStream.end(req.file.buffer);
            });

            fileUrl = uploadResponse.secure_url;
            fileSize = uploadResponse.bytes || req.file.size;
            fileType = req.file.mimetype;
        }

        // Cập nhật database
        const query = fileSize
            ? `UPDATE study_materials SET title = ?, description = ?, certificate_type = ?, file_url = ?, file_size = ?, file_type = ? WHERE id = ?`
            : `UPDATE study_materials SET title = ?, description = ?, certificate_type = ? WHERE id = ?`;

        const params = fileSize
            ? [title, description || null, certificateType || null, fileUrl, fileSize, fileType, id]
            : [title, description || null, certificateType || null, id];

        await connection.query(query, params);

        res.json({
            success: true,
            message: 'Tài liệu ôn thi được cập nhật thành công'
        });
    } catch (error) {
        console.error('Lỗi cập nhật tài liệu:', error);
        res.status(500).json({ success: false, error: 'Lỗi cập nhật tài liệu' });
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
