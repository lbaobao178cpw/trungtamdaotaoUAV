const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const { verifyToken, verifyAdmin, verifyTokenOptional } = require('../middleware/verifyToken');
const multer = require('multer');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');

// Import local upload helpers
const { resolvePath } = require('../utils/fileHelpers');

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

const TEMP_UPLOAD_TTL_MS = Number(process.env.TEMP_UPLOAD_TTL_MS || 2 * 60 * 60 * 1000);
const TEMP_UPLOAD_TOKEN_SECRET = process.env.TEMP_UPLOAD_TOKEN_SECRET || process.env.CLOUDINARY_API_SECRET || 'uav-temp-upload-secret';

const buildCleanupToken = (publicId, expiresAt) => {
  const raw = `${publicId}.${expiresAt}`;
  return crypto
    .createHmac('sha256', TEMP_UPLOAD_TOKEN_SECRET)
    .update(raw)
    .digest('hex');
};

const verifyCleanupToken = ({ publicId, expiresAt, cleanupToken }) => {
  if (!publicId || !expiresAt || !cleanupToken) return false;
  if (Date.now() > Number(expiresAt)) return false;
  const expected = buildCleanupToken(publicId, Number(expiresAt));
  return expected === cleanupToken;
};

/**
 * POST /api/cloudinary/upload-cccd
 * Upload CCCD lên Cloudinary (không cần token - cho form đăng ký)
 */
router.post('/upload-cccd', upload.single('file'), async (req, res) => {
  try {
    // console.log("CCCD upload request received");
    // console.log("File:", req.file?.originalname, "Size:", req.file?.size);

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

    const resourceType = 'image';
    const folder = 'uav-training/cccd';

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: resourceType,
          timeout: 60000
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.on('error', (error) => {
        reject(error);
      });
      stream.end(req.file.buffer);
    });

    // console.log("✅ CCCD uploaded:", uploadResult.secure_url);

    const cleanupExpiresAt = Date.now() + TEMP_UPLOAD_TTL_MS;
    const cleanupToken = buildCleanupToken(uploadResult.public_id, cleanupExpiresAt);

    res.json({
      success: true,
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
      cleanupToken,
      cleanupExpiresAt
    });
  } catch (error) {
    // console.error('CCCD upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

/**
 * POST /api/cloudinary/delete-temp
 * Xóa ảnh đăng ký đã upload tạm bằng token an toàn (không cần đăng nhập)
 */
router.post('/delete-temp', async (req, res) => {
  try {
    const { publicId, cleanupToken, cleanupExpiresAt } = req.body || {};

    if (!publicId || !cleanupToken || !cleanupExpiresAt) {
      return res.status(400).json({
        success: false,
        error: 'publicId, cleanupToken, cleanupExpiresAt are required'
      });
    }

    const isValid = verifyCleanupToken({
      publicId,
      cleanupToken,
      expiresAt: Number(cleanupExpiresAt)
    });

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired cleanup token'
      });
    }

    const destroyResult = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });

    return res.json({
      success: true,
      result: destroyResult,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Delete temp file failed'
    });
  }
});

/**
 * POST /api/cloudinary/delete-temp-batch
 * Xóa nhiều ảnh upload tạm cùng lúc (dùng cho beforeunload/pagehide)
 */
router.post('/delete-temp-batch', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) {
      return res.json({
        success: true,
        deleted: 0,
        failed: 0,
        results: []
      });
    }

    const results = await Promise.all(items.map(async (item) => {
      const publicId = item?.publicId;
      const cleanupToken = item?.cleanupToken;
      const cleanupExpiresAt = Number(item?.cleanupExpiresAt);

      if (!publicId || !cleanupToken || !cleanupExpiresAt) {
        return { publicId, success: false, error: 'Missing token payload' };
      }

      const isValid = verifyCleanupToken({ publicId, cleanupToken, expiresAt: cleanupExpiresAt });
      if (!isValid) {
        return { publicId, success: false, error: 'Invalid or expired cleanup token' };
      }

      try {
        const destroyResult = await cloudinary.uploader.destroy(publicId, {
          resource_type: 'image',
          invalidate: true,
        });
        return { publicId, success: true, result: destroyResult };
      } catch (err) {
        return { publicId, success: false, error: err.message };
      }
    }));

    const deleted = results.filter((r) => r.success).length;
    const failed = results.length - deleted;

    return res.json({
      success: true,
      deleted,
      failed,
      results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Batch delete temp files failed'
    });
  }
});

/**
 * POST /api/cloudinary/upload
 * Upload file lên Cloudinary qua backend
 */
router.post('/upload', upload.single('file'), verifyTokenOptional, async (req, res) => {
  try {
    // console.log("Upload request received");
    // console.log("File object:", req.file);
    // console.log("File size:", req.file?.size);
    // console.log("File buffer length:", req.file?.buffer?.length);
    // console.log("File original name:", req.file?.originalname);
    // console.log("Folder:", req.body.folder);

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

    // Xác định resource_type dựa trên mimetype
    // - 'video' cho file video
    // - 'raw' cho file document (PDF, Word, Excel, PowerPoint) - QUAN TRỌNG!
    // - 'image' cho hình ảnh
    // - 'auto' cho các loại khác
    let resourceType = 'auto';
    const mimetype = req.file.mimetype;

    if (mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else if (mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else if (
      mimetype === 'application/pdf' ||
      mimetype === 'application/msword' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/vnd.ms-excel' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimetype === 'application/vnd.ms-powerpoint' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      // QUAN TRỌNG: Document files phải dùng 'raw' để Cloudinary không xử lý/transform file
      resourceType = 'raw';
    }

    console.log("📎 File mimetype:", mimetype);
    console.log("📎 Resource type:", resourceType);

    // Get filename from request body first (if sent by frontend), otherwise from multer
    let displayName = req.body.displayName || req.body.originalFilename || req.file.originalname;

    console.log("Raw displayName:", displayName);
    console.log("Raw bytes:", Buffer.from(displayName).toString('hex'));

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
          console.log("Fixed corrupted filename:", displayName, "→", corrected);
          displayName = corrected;
        }
      }
    } catch (e) {
      console.log("Encoding fix failed:", e.message);
    }

    console.log("Final displayName:", displayName);

    // Sanitize for Cloudinary public_id (alphanumeric + dash/underscore only)
    const fileNameWithoutExt = displayName.substring(0, displayName.lastIndexOf('.')) || displayName;
    const fileExt = displayName.includes('.') ? displayName.substring(displayName.lastIndexOf('.')) : '';

    const sanitized = fileNameWithoutExt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with dash
      .replace(/-+/g, '-') // Collapse multiple dashes
      .toLowerCase();

    console.log("Uploading to Cloudinary...", {
      folder,
      resourceType,
      displayName,
      sanitizedName: sanitized,
      bufferLength: req.file.buffer?.length || 0,
      bufferExists: !!req.file.buffer
    });

    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error("Buffer is empty!");
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
            context: `display_name=${displayName}`,
            timeout: 60000, // Add timeout to upload stream
          },
          (error, result) => {
            clearTimeout(timeoutId);
            if (error) {
              console.error("Cloudinary error:", error);
              reject(error);
            }
            else {
              console.log("Upload success:", result.public_id);
              resolve(result);
            }
          }
        );

        console.log("Writing buffer to upload stream, size:", req.file.buffer.length);
        uploadStream.end(req.file.buffer);
      });
    } catch (err) {
      console.warn("❌ Cloudinary upload failed:", err.message);
      uploadError = err;

      // IMPORTANT: Chỉ allow fallback to local storage trên development environment
      // Production (Render, Vercel, etc.) KHÔNG được dùng local storage vì ephemeral filesystem
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.RENDER;

      if (isProduction && !process.env.ALLOW_LOCAL_UPLOAD) {
        console.error("❌ PRODUCTION MODE: Cloudinary is required but failed. Refusing to use local storage (ephemeral filesystem)");
        throw new Error(`Cloudinary upload failed and local storage is disabled in production: ${uploadError.message}`);
      }

      // Fallback: Save to local storage (DEV ONLY or if explicitly enabled)
      try {
        console.warn("⚠️ FALLBACK: Saving to local storage (DEV mode or ALLOW_LOCAL_UPLOAD=true)");

        const uploadFolder = 'course-uploads'; // Local folder
        const { fullPath } = resolvePath(uploadFolder);
        const filename = `${Date.now()}-${sanitized}${fileExt}`;
        const filePath = path.join(fullPath, filename);

        // Ensure directory exists
        await fsExtra.ensureDir(fullPath);

        // Write file
        await fsExtra.writeFile(filePath, req.file.buffer);

        const relPath = `${uploadFolder}/${filename}`;

        console.log("✅ Saved to local storage:", relPath);

        // Xác định URL dựa vào environment
        // Trên production (Render, Vercel): dùng BACKEND_URL env var
        // Trên local: dùng http://localhost:port
        let baseUrl;
        if (process.env.BACKEND_URL) {
          // Production: sử dụng BACKEND_URL từ environment variable
          baseUrl = process.env.BACKEND_URL.replace(/\/$/, ''); // Remove trailing slash
          console.log("Using production BACKEND_URL:", baseUrl);
        } else {
          // Use request protocol and host as fallback (works for both localhost and production)
          const protocol = req.protocol || 'http';
          const host = req.get('host') || 'localhost:5000';
          baseUrl = `${protocol}://${host}`;
          console.log("Using baseUrl from request:", baseUrl);
        }

        uploadResult = {
          secure_url: `${baseUrl}/uploads/${relPath}`,
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
router.post('/delete', verifyAdmin, async (req, res) => {
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

/**
 * GET /api/cloudinary/list-images
 * Lấy danh sách hình ảnh từ Cloudinary
 */
router.get('/list-images', verifyTokenOptional, async (req, res) => {
  try {
    const folder = req.query.folder || 'uav-training/images';
    const resourceType = req.query.resource_type || 'image';
    const maxResults = parseInt(req.query.maxResults) || 100;

    console.log("Listing resources from folder:", folder, "resource_type:", resourceType);

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      resource_type: resourceType,
      max_results: maxResults
    });

    const resources = result.resources.map(r => ({
      url: r.secure_url,
      publicId: r.public_id,
      displayName: r.context?.custom?.display_name || r.public_id.split('/').pop().split('-').slice(1).join('-') || r.public_id.split('/').pop(),
      createdAt: r.created_at,
      bytes: r.bytes,
      resourceType: r.resource_type
    }));

    console.log(`Found ${resources.length} resources`);

    res.json({
      success: true,
      images: resources
    });
  } catch (err) {
    console.error('List resources error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;