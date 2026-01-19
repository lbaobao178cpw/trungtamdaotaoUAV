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
    console.log("File original name:", req.file?.originalname);
    console.log("Folder:", req.body.folder);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const folder = req.body.folder || 'uav-training';
    const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'auto';

    // Get filename from request body first (if sent by frontend), otherwise from multer
    let displayName = req.body.displayName || req.body.originalFilename || req.file.originalname;
    
    // Fix UTF-8 encoding issue if filename is corrupted
    // If filename has corrupted chars (Ã, º, ü, etc.), it means UTF-8 was misinterpreted as Latin1
    try {
      if (displayName.match(/[Ã¡-ÿ]/g)) {
        const corrected = Buffer.from(displayName, 'latin1').toString('utf8');
        console.log("🔧 Fixed corrupted filename:", displayName, "→", corrected);
        displayName = corrected;
      }
    } catch (e) {
      console.log("⚠️ Encoding fix failed, using original:", displayName);
    }

    // Sanitize for Cloudinary public_id (alphanumeric + dash/underscore only)
    const fileNameWithoutExt = displayName.substring(0, displayName.lastIndexOf('.')) || displayName;
    const fileExt = displayName.includes('.') ? displayName.substring(displayName.lastIndexOf('.')) : '';
    
    const sanitized = fileNameWithoutExt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with dash
      .replace(/-+/g, '-') // Collapse multiple dashes
      .toLowerCase();

    console.log("📤 Uploading to Cloudinary...", {
      folder,
      resourceType,
      displayName,
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
      originalFilename: displayName, // Return corrected display name
      displayName: displayName // Use corrected display name
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
