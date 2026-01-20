const express = require("express");
const router = express.Router();
const fs = require("fs-extra");
const path = require("path");
const {
  resolvePath,
  getThumbPath,
  getFileType,
  generateThumbnail,
  upload,
  THUMB_ROOT
} = require("../utils/fileHelpers");

// GET /api/files
router.get("/files", async (req, res) => {
  try {
    const port = req.socket.localPort || process.env.PORT || 5000;
    const currentFolder = req.query.folder || "";
    const { fullPath, relativePath } = resolvePath(currentFolder);

    if (!await fs.pathExists(fullPath)) return res.json([]);

    const files = await fs.readdir(fullPath, { withFileTypes: true });

    const filePromises = files
      .filter((item) => item.name !== "thumbs")
      .map(async (item) => {
        const itemRelPath = path.join(relativePath, item.name).replace(/\\/g, "/");
        const isDir = item.isDirectory();
        let hasThumb = false;

        if (!isDir) {
          hasThumb = await fs.pathExists(getThumbPath(itemRelPath));
        }

        return {
          filename: item.name,
          type: isDir ? "folder" : getFileType(item.name),
          path: itemRelPath,
          url: isDir ? null : `http://localhost:${port}/uploads/${itemRelPath}`,
          thumbUrl: hasThumb ? `http://localhost:${port}/uploads/thumbs/${itemRelPath}` : null,
        };
      });

    const responseData = await Promise.all(filePromises);
    responseData.sort((a, b) => (a.type === "folder" && b.type !== "folder" ? -1 : 1));
    res.json(responseData);
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});

// DELETE /api/files
router.delete("/files", async (req, res) => {
  try {
    const { fullPath, relativePath } = resolvePath(req.query.path);
    if (await fs.pathExists(fullPath)) await fs.remove(fullPath);

    const thumbPath = getThumbPath(relativePath);
    if (await fs.pathExists(thumbPath)) await fs.remove(thumbPath);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Lỗi xóa file" });
  }
});

// POST /api/upload
router.post("/upload", upload.single("mediaFile"), async (req, res) => {
  if (req.file) {
    const folder = req.body.folderPath || "";
    const { relativePath } = resolvePath(folder);

    // Tạo file path trong uploads folder
    const filePath = relativePath ? `${relativePath}/${req.file.filename}` : req.file.filename;

    // Generate thumbnail nếu là ảnh
    await generateThumbnail(req.file.path, relativePath);

    const port = req.socket.localPort || process.env.PORT || 5000;

    res.json({
      success: true,
      filename: req.file.filename,
      path: filePath,
      url: `http://localhost:${port}/uploads/${filePath}`,
      type: getFileType(req.file.filename)
    });
  } else {
    res.status(400).json({ success: false, message: "Lỗi upload" });
  }
});

// POST /api/create-folder
router.post("/create-folder", async (req, res) => {
  try {
    const { folderName, currentPath } = req.body;
    const { fullPath: parentPath } = resolvePath(currentPath);
    const newFolderPath = path.join(parentPath, folderName.replace(/[^a-zA-Z0-9-_]/g, "-"));
    await fs.ensureDir(newFolderPath);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/rename
router.post("/rename", async (req, res) => {
  try {
    const { oldPath, newName } = req.body;
    const { fullPath: oldFullPath, relativePath: oldRelPath } = resolvePath(oldPath);
    const parentDir = path.dirname(oldFullPath);
    const newFullPath = path.join(parentDir, newName);

    if (await fs.pathExists(newFullPath)) return res.status(400).json({ message: "Tên mới đã tồn tại!" });

    await fs.rename(oldFullPath, newFullPath);

    const oldThumbPath = getThumbPath(oldRelPath);
    if (await fs.pathExists(oldThumbPath)) {
      const thumbParent = path.dirname(oldThumbPath);
      const newThumbPath = path.join(thumbParent, newName);
      await fs.rename(oldThumbPath, newThumbPath);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/copy
router.post("/copy", async (req, res) => {
  try {
    const { itemName, oldPath, newFolderPath } = req.body;
    const { fullPath: sourcePath, relativePath: oldRelPath } = resolvePath(oldPath);
    const { fullPath: destParent, relativePath: newRelParent } = resolvePath(newFolderPath);
    let destPath = path.join(destParent, itemName);

    if (await fs.pathExists(destPath)) {
      const ext = path.extname(itemName);
      const name = path.basename(itemName, ext);
      destPath = path.join(destParent, `${name} (copy)${ext}`);
      let i = 1;
      while (await fs.pathExists(destPath)) {
        destPath = path.join(destParent, `${name} (copy ${i})${ext}`);
        i++;
      }
    }
    await fs.copy(sourcePath, destPath);

    const oldThumbPath = getThumbPath(oldRelPath);
    if (await fs.pathExists(oldThumbPath)) {
      const destFileName = path.basename(destPath);
      const newThumbPath = path.join(THUMB_ROOT, newRelParent, destFileName);
      await fs.ensureDir(path.dirname(newThumbPath));
      await fs.copy(oldThumbPath, newThumbPath);
    }
    res.json({ success: true, message: "Sao chép thành công" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/move
router.post("/move", async (req, res) => {
  try {
    const { itemName, oldPath, newFolderPath } = req.body;
    const { fullPath: sourcePath, relativePath: oldRelPath } = resolvePath(oldPath);
    const { fullPath: destParent, relativePath: newRelParent } = resolvePath(newFolderPath);
    const destPath = path.join(destParent, itemName);

    if (!await fs.pathExists(sourcePath)) return res.status(404).json({ message: "File gốc không tồn tại" });
    if (await fs.pathExists(destPath) && sourcePath !== destPath) return res.status(400).json({ message: "File đã tồn tại ở đích" });
    if (sourcePath === destPath) return res.json({ success: true });

    await fs.move(sourcePath, destPath, { overwrite: false });

    const oldThumbPath = getThumbPath(oldRelPath);
    if (await fs.pathExists(oldThumbPath)) {
      const newThumbPath = path.join(THUMB_ROOT, newRelParent, itemName);
      await fs.ensureDir(path.dirname(newThumbPath));
      await fs.move(oldThumbPath, newThumbPath, { overwrite: true });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;