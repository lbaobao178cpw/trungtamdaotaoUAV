const express = require("express");
const router = express.Router();
const fs = require("fs-extra");
const path = require("path");
const { UPLOAD_ROOT, THUMB_ROOT, getFileType, generateThumbnail } = require("../utils/fileHelpers");

router.get("/regenerate-thumbs", async (req, res) => {
  
  let count = 0;
  const errors = [];
  async function scanDir(currentDir, relativeDir = "") {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const entryRelativePath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "thumbs") await scanDir(fullPath, entryRelativePath);
      } else {
        if (getFileType(entry.name) === "image") {
          const thumbPath = path.join(THUMB_ROOT, entryRelativePath);
          if (!await fs.pathExists(thumbPath)) {
            try {
              await generateThumbnail(fullPath, path.dirname(entryRelativePath));
              count++;
            } catch (e) { errors.push(entry.name); }
          }
        }
      }
    }
  }
  try {
    await scanDir(UPLOAD_ROOT);
    res.json({ success: true, message: `Hoàn tất! Tạo ${count} thumbnails.`, errors });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;