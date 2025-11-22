const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// --- KIỂM TRA THƯ VIỆN SHARP ---
let sharp;
try {
    sharp = require('sharp');
    console.log("✅ Đã tải thư viện Sharp thành công.");
} catch (e) {
    console.error("❌ LỖI: Chưa cài 'sharp'. Hãy chạy lệnh: npm install sharp");
}

const app = express();
const MEDIA_PORT = 5001;

// Đường dẫn tuyệt đối để tránh lỗi thư mục
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const THUMB_DIR = path.join(__dirname, 'uploads/thumbs');

app.use(cors());
app.use(express.json());

// --- TỰ ĐỘNG TẠO THƯ MỤC KHI KHỞI ĐỘNG ---
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log("📁 Đã tạo thư mục uploads");
}
if (!fs.existsSync(THUMB_DIR)) {
    fs.mkdirSync(THUMB_DIR, { recursive: true });
    console.log("📁 Đã tạo thư mục uploads/thumbs");
}

// Cache ảnh 1 ngày
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1d' }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const simpleName = `img-${Date.now()}${ext}`;
        cb(null, simpleName);
    }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// --- HÀM TẠO THUMBNAIL ---
const createThumbnail = async (filename) => {
    if (!sharp) return; // Không có sharp thì bỏ qua

    const originalPath = path.join(UPLOAD_DIR, filename);
    const thumbPath = path.join(THUMB_DIR, filename);

    // Chỉ tạo nếu file gốc tồn tại và thumbnail chưa có
    if (fs.existsSync(originalPath) && !fs.existsSync(thumbPath)) {
        try {
            await sharp(originalPath)
                .resize(250, 250, { fit: 'cover' }) // Resize nhỏ
                .jpeg({ quality: 60 })
                .toFile(thumbPath);
            console.log(`⚡ Created thumb: ${filename}`);
        } catch (err) {
            console.error(`⚠️ Lỗi tạo thumb ${filename}:`, err.message);
        }
    }
};

// API GET FILES (Tự động quét và tạo thumb thiếu)
app.get('/api/files', async (req, res) => {
    try {
        const files = fs.readdirSync(UPLOAD_DIR).filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
        
        // Chạy tạo thumbnail cho tất cả ảnh chưa có (chạy ngầm)
        files.forEach(file => createThumbnail(file));

        const responseData = files.map(file => {
            const hasThumb = fs.existsSync(path.join(THUMB_DIR, file));
            return {
                filename: file,
                // URL gốc
                url: `http://127.0.0.1:${MEDIA_PORT}/uploads/${file}`,
                // Nếu có thumb thì trả về link thumb, không thì trả về link gốc
                thumbUrl: hasThumb 
                    ? `http://127.0.0.1:${MEDIA_PORT}/uploads/thumbs/${file}`
                    : `http://127.0.0.1:${MEDIA_PORT}/uploads/${file}`
            };
        }).reverse();

        res.json(responseData);
    } catch (e) {
        console.error(e);
        res.json([]);
    }
});

// API UPLOAD
app.post('/api/upload', upload.single('mediaFile'), async (req, res) => {
    if (req.file) {
        await createThumbnail(req.file.filename);
        res.json({ filename: req.file.filename });
    } else {
        res.status(400).json({ message: 'Lỗi' });
    }
});

// API DELETE
app.delete('/api/files/:filename', (req, res) => {
    const p1 = path.join(UPLOAD_DIR, req.params.filename);
    const p2 = path.join(THUMB_DIR, req.params.filename);
    if(fs.existsSync(p1)) fs.unlinkSync(p1);
    if(fs.existsSync(p2)) fs.unlinkSync(p2);
    res.status(204).send();
});

app.listen(MEDIA_PORT, () => {
    console.log(`🚀 Media Server đang chạy: http://127.0.0.1:${MEDIA_PORT}`);
    console.log(`📂 Thư mục gốc: ${UPLOAD_DIR}`);
});