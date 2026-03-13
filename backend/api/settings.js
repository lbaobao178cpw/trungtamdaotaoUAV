const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
const { UPLOAD_ROOT } = require("../utils/fileHelpers");

// Proxy model files via API route so cross-origin admin/frontend can load GLB/GLTF reliably.
router.get("/model-proxy", async (req, res) => {
  try {
    const srcRaw = String(req.query.src || "").trim();
    if (!srcRaw) {
      return res.status(400).json({ message: "Thiếu tham số src" });
    }

    let pathname = srcRaw;
    if (/^https?:\/\//i.test(srcRaw)) {
      const parsed = new URL(srcRaw);
      pathname = parsed.pathname || "";
    }

    if (pathname.startsWith("/api/uploads/")) {
      pathname = pathname.replace(/^\/api/, "");
    }
    if (!pathname.startsWith("/uploads/")) {
      return res.status(400).json({ message: "Đường dẫn model không hợp lệ" });
    }

    const relPath = pathname.replace(/^\/uploads\//, "");
    const safeRelPath = relPath
      .replace(/(\.\.(\/|\\|$))+/g, "")
      .replace(/^(\/|\\)+/, "");
    const fullPath = path.join(UPLOAD_ROOT, safeRelPath);

    if (!fullPath.startsWith(UPLOAD_ROOT)) {
      return res.status(400).json({ message: "Đường dẫn không an toàn" });
    }
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "Không tìm thấy file model" });
    }

    const ext = path.extname(fullPath).toLowerCase();
    if (ext !== ".glb" && ext !== ".gltf") {
      return res.status(400).json({ message: "Chỉ hỗ trợ file .glb/.gltf" });
    }

    const stat = fs.statSync(fullPath);
    if (ext === ".glb") {
      res.setHeader("Content-Type", "model/gltf-binary");
    } else {
      res.setHeader("Content-Type", "model/gltf+json");
    }
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=86400");

    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const [rows] = await pool.execute("SELECT setting_value FROM settings WHERE setting_key = ?", [key]);
    if (rows.length > 0) res.json({ value: rows[0].setting_value });
    else res.status(404).json({ message: "Key not found" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { key, value } = req.body;
    const sql = "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?";
    await pool.execute(sql, [key, value, value]);
    res.json({ success: true, message: "Đã lưu cài đặt" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;