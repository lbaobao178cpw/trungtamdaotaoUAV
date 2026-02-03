const fs = require("fs-extra");
const path = require("path");
const multer = require("multer");

// --- TỐI ƯU CHO MẮT BÃO ---
// Ưu tiên lấy đường dẫn từ biến môi trường (cấu hình trong .env)
// Nếu không có thì mới dùng đường dẫn mặc định trong folder code
const UPLOAD_ROOT = process.env.UPLOAD_DIR 
  ? path.resolve(process.env.UPLOAD_DIR) 
  : path.join(__dirname, "../uploads");

const THUMB_ROOT = path.join(UPLOAD_ROOT, "thumbs");

// Kiểm tra thư viện Sharp
let sharp;
try {
  sharp = require("sharp");
} catch (e) {
  // sharp not available — silently continue (thumbnail feature disabled)
}

// Tạo thư mục nếu chưa có
try {
    fs.ensureDirSync(UPLOAD_ROOT);
    fs.ensureDirSync(THUMB_ROOT);
} catch (error) {
  // fail silently — directory creation errors handled by upstream
}

const resolvePath = (clientPath = "") => {
  const safeRel = clientPath
    .replace(/(\.\.(\/|\\|$))+/g, "")
    .replace(/^(\/|\\)+/, "");
  const fullPath = path.join(UPLOAD_ROOT, safeRel);
  
  if (!fullPath.startsWith(UPLOAD_ROOT))
    return { fullPath: UPLOAD_ROOT, relativePath: "" };
    
  return { fullPath, relativePath: safeRel.replace(/\\/g, "/") };
};

const getThumbPath = (relativePath) => path.join(THUMB_ROOT, relativePath);

const getFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) return "image";
  if ([".mp4", ".webm", ".mov", ".avi"].includes(ext)) return "video";
  return "unknown";
};

const generateThumbnail = async (fileFullPath, relativeFolder) => {
  if (!sharp) return;
  try {
    const filename = path.basename(fileFullPath);
    if (getFileType(filename) !== "image") return;

    const targetThumbFolder = path.join(THUMB_ROOT, relativeFolder);
    await fs.ensureDir(targetThumbFolder);

    await sharp(fileFullPath)
      .resize(250, 250, { fit: "cover" })
      .jpeg({ quality: 50 })
      .toFile(path.join(targetThumbFolder, filename));
  } catch (e) {
    // ignore thumbnail generation errors
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folderPath || "";
    const { fullPath } = resolvePath(folder);
    
    // Dùng ensureDir (async) thay vì Sync để tránh chặn luồng trên server yếu
    fs.ensureDir(fullPath)
      .then(() => cb(null, fullPath))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

module.exports = {
  UPLOAD_ROOT,
  THUMB_ROOT,
  resolvePath,
  getThumbPath,
  getFileType,
  generateThumbnail,
  upload
};