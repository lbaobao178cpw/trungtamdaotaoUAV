const express = require("express");
const router = express.Router();
const fs = require("fs-extra");
const path = require("path");
const {
  UPLOAD_ROOT,
  resolvePath,
  getThumbPath,
  getFileType,
  generateThumbnail,
  upload,
  THUMB_ROOT
} = require("../utils/fileHelpers");

const findFileRecursively = async (rootDir, matcher, maxDepth = 4) => {
  const queue = [{ dir: rootDir, depth: 0 }];

  while (queue.length > 0) {
    const { dir, depth } = queue.shift();
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      continue;
    }

    for (const entry of entries) {
      if (entry.name === "thumbs") continue;
      const full = path.join(dir, entry.name);

      if (entry.isFile() && matcher(entry.name, full)) {
        return full;
      }

      if (entry.isDirectory() && depth < maxDepth) {
        queue.push({ dir: full, depth: depth + 1 });
      }
    }
  }

  return null;
};

// GET /api/files
router.get("/files", async (req, res) => {
  try {
    // Xác định base URL dựa vào environment
    let baseUrl;
    if (process.env.BACKEND_URL) {
      baseUrl = process.env.BACKEND_URL.replace(/\/$/, ''); // Remove trailing slash
    } else {
      // Use request protocol and host as fallback (works for both localhost and production)
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:5000';
      baseUrl = `${protocol}://${host}`;
    }

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
          url: isDir ? null : `${baseUrl}/uploads/${itemRelPath}`,
          thumbUrl: hasThumb ? `${baseUrl}/uploads/thumbs/${itemRelPath}` : null,
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

// GET /api/files/raw?path=<relative_path>
router.get("/files/raw", async (req, res) => {
  try {
    const relativePath = (req.query.path || "").toString().trim();
    if (!relativePath) {
      return res.status(404).json({ message: "File không tồn tại" });
    }

    const normalizedPath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
    const candidateRelativePaths = [normalizedPath];

    // Backward compatibility: older settings may store only filename without folder.
    if (!normalizedPath.includes("/")) {
      candidateRelativePaths.push(`model-3d/${normalizedPath}`);
      candidateRelativePaths.push(`course-uploads/${normalizedPath}`);
      candidateRelativePaths.push(`Solutions/${normalizedPath}`);
      candidateRelativePaths.push(`panorama/${normalizedPath}`);
      candidateRelativePaths.push(`Documents/${normalizedPath}`);
    }

    let fullPath = null;
    for (const candidate of candidateRelativePaths) {
      const resolved = resolvePath(candidate);
      if (await fs.pathExists(resolved.fullPath)) {
        fullPath = resolved.fullPath;
        break;
      }
    }

    if (!fullPath) {
      // Last fallback: search one level deep under uploads root for filename-only paths.
      if (!normalizedPath.includes("/")) {
        try {
          const entries = await fs.readdir(UPLOAD_ROOT, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isDirectory() || entry.name === "thumbs") continue;
            const candidatePath = path.join(UPLOAD_ROOT, entry.name, normalizedPath);
            if (await fs.pathExists(candidatePath)) {
              fullPath = candidatePath;
              break;
            }
          }
        } catch (e) {
          // ignore and return 404 below
        }
      }
    }

    // Fallback for renamed files with extra timestamp suffix.
    // Example requested: model-3d/a-123.glb, actual file: model-3d/a-123-999.glb
    if (!fullPath) {
      const dirRel = path.posix.dirname(normalizedPath);
      const fileName = path.posix.basename(normalizedPath);
      const ext = path.extname(fileName);
      const baseName = path.basename(fileName, ext);

      if (dirRel && dirRel !== "." && ext) {
        const { fullPath: dirFullPath } = resolvePath(dirRel);
        if (await fs.pathExists(dirFullPath)) {
          try {
            const dirEntries = await fs.readdir(dirFullPath, { withFileTypes: true });
            const directMatch = dirEntries.find((entry) =>
              entry.isFile() && entry.name === fileName
            );

            if (directMatch) {
              fullPath = path.join(dirFullPath, directMatch.name);
            } else {
              const fuzzyMatch = dirEntries.find((entry) => {
                if (!entry.isFile()) return false;
                const entryExt = path.extname(entry.name);
                if (entryExt.toLowerCase() !== ext.toLowerCase()) return false;
                const entryBase = path.basename(entry.name, entryExt);
                return entryBase === baseName || entryBase.startsWith(`${baseName}-`);
              });

              if (fuzzyMatch) {
                fullPath = path.join(dirFullPath, fuzzyMatch.name);
              }
            }
          } catch (e) {
            // ignore and return 404 below
          }
        }
      }
    }

    // Final fallback: recursive search under uploads by exact filename first, then fuzzy match.
    if (!fullPath) {
      const requestedFileName = path.posix.basename(normalizedPath);
      const requestedExt = path.extname(requestedFileName).toLowerCase();
      const requestedBase = path.basename(requestedFileName, path.extname(requestedFileName)).toLowerCase();

      fullPath = await findFileRecursively(
        UPLOAD_ROOT,
        (entryName) => entryName.toLowerCase() === requestedFileName.toLowerCase(),
        5
      );

      if (!fullPath && requestedExt) {
        fullPath = await findFileRecursively(
          UPLOAD_ROOT,
          (entryName) => {
            const entryExt = path.extname(entryName).toLowerCase();
            if (entryExt !== requestedExt) return false;
            const entryBase = path.basename(entryName, path.extname(entryName)).toLowerCase();
            return entryBase === requestedBase || entryBase.startsWith(`${requestedBase}-`) || requestedBase.startsWith(`${entryBase}-`);
          },
          5
        );
      }
    }

    if (!fullPath) {
      return res.status(404).json({ message: "File không tồn tại" });
    }

    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      return res.status(400).json({ message: "Path phải là file" });
    }

    // Let Express infer the proper content-type by extension (.glb, .jpg, ...)
    return res.sendFile(fullPath);
  } catch (e) {
    return res.status(500).json({ message: "Lỗi đọc file" });
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

    // Xác định base URL dựa vào environment
    let baseUrl;
    if (process.env.BACKEND_URL) {
      baseUrl = process.env.BACKEND_URL.replace(/\/$/, ''); // Remove trailing slash
    } else {
      // Use request protocol and host as fallback (works for both localhost and production)
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:5000';
      baseUrl = `${protocol}://${host}`;
    }

    res.json({
      success: true,
      filename: req.file.filename,
      path: filePath,
      url: `${baseUrl}/uploads/${filePath}`,
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