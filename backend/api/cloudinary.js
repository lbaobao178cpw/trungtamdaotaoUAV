const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { verifyToken } = require('../middleware/verifyToken');
const multer = require('multer');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');

// Import local upload helpers
const { resolvePath, getFileType, generateThumbnail } = require('../utils/fileHelpers');

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 60000, // 60 seconds timeout
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
router.post('/upload', upload.single('file'), verifyToken, async (req, res) => {
  try {







    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'File buffer is empty'
      });
    }

    const folder = req.body.folder || 'uav-training';
    const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'auto';

    // Get filename from request body first (if sent by frontend), otherwise from multer
    let displayName = req.body.displayName || req.body.originalFilename || req.file.originalname;



    // Fix UTF-8 encoding issue if filename is corrupted
    // When UTF-8 bytes are misinterpreted as Latin1, Vietnamese chars become garbled
    // Example: "Chào" (UTF-8) → "ChÃ o" (Latin1 misinterpretation)
    try {
      // Check for common UTF-8 mojibake patterns (Ã followed by various chars)
      // This happens when UTF-8 multibyte sequences are read as Latin1
      if (displayName.includes('Ã') || displayName.match(/[\xC0-\xFF][\x80-\xBF]/)) {
        const corrected = Buffer.from(displayName, 'latin1').toString('utf8');
        // Verify the fix worked (should have Vietnamese chars now)
        if (corrected !== displayName && !corrected.includes('�')) {

          displayName = corrected;
        }
      }
    } catch (e) {

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



    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error("❌ Buffer is empty!");
      throw new Error('File buffer is empty - cannot upload');
    }

    // Upload to Cloudinary from buffer with timeout
    let uploadResult = null;
    let uploadError = null;

    try {
      uploadResult = await new Promise((resolve, reject) => {
        // Set timeout để tránh hang kết nối
        const timeoutId = setTimeout(() => {
          reject(new Error('Upload timeout - server took too long to upload to Cloudinary'));
        }, 60000); // 60 giây timeout

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: folder,
            public_id: `${Date.now()}-${sanitized}`,
            timeout: 60000, // Add timeout to upload stream
          },
          (error, result) => {
            clearTimeout(timeoutId);
            if (error) {
              console.error("❌ Cloudinary error:", error);
              reject(error);
            }
            else {

              resolve(result);
            }
          }
        );


        uploadStream.end(req.file.buffer);
      });
    } catch (err) {
      console.warn("⚠️ Cloudinary failed, falling back to local storage:", err.message);
      uploadError = err;

      // Fallback: Save to local storage
      try {
        const uploadFolder = 'course-uploads'; // Local folder
        const { fullPath } = resolvePath(uploadFolder);
        const filename = `${Date.now()}-${sanitized}${fileExt}`;
        const filePath = path.join(fullPath, filename);

        // Ensure directory exists
        await fsExtra.ensureDir(fullPath);

        // Write file
        await fsExtra.writeFile(filePath, req.file.buffer);

        const port = req.socket.localPort || process.env.PORT || 5000;
        const relPath = `${uploadFolder}/${filename}`;



        uploadResult = {
          secure_url: `http://localhost:${port}/uploads/${relPath}`,
          public_id: `local-${sanitized}`,
          resource_type: resourceType,
          display_name: displayName
        };
      } catch (localErr) {
        console.error("❌ Local fallback also failed:", localErr);
        throw new Error(`Both Cloudinary and local upload failed: ${uploadError.message}`);
      }
    }

    res.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      resourceType: uploadResult.resource_type,
      originalFilename: displayName,
      displayName: displayName
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
