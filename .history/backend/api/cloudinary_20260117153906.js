const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const verifyToken = require('../middleware/verifyToken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup multer for temporary file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

/**
 * POST /api/cloudinary/upload
 * Upload file lên Cloudinary qua backend
 */
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    console.log("🚀 Upload request received");
    console.log("File:", req.file?.filename);
    console.log("Folder:", req.body.folder);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const folder = req.body.folder || 'uav-training';
    const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'auto';

    // Fix UTF-8 encoding issue in filename
    // Sometimes filenames arrive as Latin1 instead of UTF-8, need to re-encode
    let fileName = req.file.originalname;

    // Try to detect and fix encoding issues
    try {
      // If filename looks corrupted (has Ã, º, etc.), it's likely Latin1 misinterpreted as UTF-8
      if (fileName.match(/[Ã¡-ÿ]/g)) {
        // Re-encode: treat as Latin1, convert back to UTF-8
        const buffer = Buffer.from(fileName, 'latin1');
        fileName = buffer.toString('utf8');
        console.log("🔧 Fixed filename encoding:", fileName);
      }
    } catch (e) {
      console.log("⚠️ Encoding fix failed, using original:", fileName);
    }

    const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    const fileExt = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';

    // Sanitize tên file - bỏ ký tự đặc biệt, chỉ giữ alphanumeric, dấu, gạch dưới
    const sanitized = fileNameWithoutExt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Bỏ diacritics
      .replace(/[^a-zA-Z0-9-_]/g, '-') // Thay ký tự đặc biệt bằng dấu gạch
      .replace(/-+/g, '-') // Gộp dấu gạch liên tiếp
      .toLowerCase();

    console.log("📤 Uploading to Cloudinary...", {
      folder,
      resourceType,
      originalFilename: fileName,
      sanitizedName: sanitized
    });

    // Upload to Cloudinary from buffer
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: folder,
          public_id: `${Date.now()}-${sanitized}`,
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary error:", error);
            reject(error);
          }
          else {
            console.log("✅ Upload success:", result.public_id);
            resolve(result);
          }
        }
      );

      uploadStream.end(req.file.buffer);
    });

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      originalFilename: req.file.originalname, // Tên file gốc từ request (UTF-8)
      displayName: req.file.originalname // Tên hiển thị cho download (UTF-8)
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/cloudinary/delete
 * Xóa file khỏi Cloudinary
 */
router.post('/delete', verifyToken, async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Public ID required'
      });
    }

    const result = await cloudinary.uploader.destroy(publicId);
    res.json({
      success: true,
      message: 'File deleted successfully',
      result
    });
  } catch (err) {
    console.error('Cloudinary delete error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
