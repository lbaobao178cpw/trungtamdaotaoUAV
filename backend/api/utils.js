const express = require("express");
const router = express.Router();
const fs = require("fs-extra");
const path = require("path");
const { UPLOAD_ROOT, THUMB_ROOT, getFileType, generateThumbnail } = require("../utils/fileHelpers");

router.get("/lookup-company-by-tax/:taxCode", async (req, res) => {
  const rawTaxCode = String(req.params.taxCode || "").trim();
  const normalizedTaxCode = rawTaxCode.replace(/\D/g, "");

  if (!normalizedTaxCode || (normalizedTaxCode.length !== 10 && normalizedTaxCode.length !== 13)) {
    return res.status(400).json({ success: false, error: "Mã số thuế không hợp lệ" });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`https://api.vietqr.io/v2/business/${normalizedTaxCode}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    const data = await response.json();
    const companyName = data?.data?.name || "";

    if (!response.ok || !companyName) {
      return res.status(404).json({ success: false, error: "Không tìm thấy doanh nghiệp theo mã số thuế" });
    }

    return res.json({
      success: true,
      taxCode: normalizedTaxCode,
      companyName,
      raw: data?.data || null,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({ success: false, error: "Tra cứu mã số thuế bị timeout" });
    }
    return res.status(500).json({ success: false, error: "Không thể tra cứu mã số thuế" });
  } finally {
    clearTimeout(timeoutId);
  }
});

router.get("/regenerate-thumbs", async (req, res) => {
  console.log("⏳ Bắt đầu tạo lại thumbnail...");
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