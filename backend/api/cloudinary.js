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

    console.log("📤 Uploading to Cloudinary...", { folder, resourceType });

    // Upload to Cloudinary from buffer
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: folder,
          public_id: `${Date.now()}-${req.file.originalname.split('.')[0]}`,
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
      originalFilename: result.original_filename,
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
