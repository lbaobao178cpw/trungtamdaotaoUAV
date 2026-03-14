require('dotenv').config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const compression = require("compression");
const { UPLOAD_ROOT } = require("./utils/fileHelpers");

// --- SỬA ĐƯỜNG DẪN Ở ĐÂY ---
const db = require("./config/db");
// ---------------------------

const app = express();
const PORT = process.env.PORT || 5000;

// === Parse CORS origins từ .env ===
const getCorsOrigins = () => {
  const origins = [];

  // Development origins
  origins.push("http://localhost:5173");
  origins.push("http://localhost:5174");
  origins.push("http://localhost:3000");

  // Production origins từ .env
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  if (process.env.ADMIN_URL) {
    origins.push(process.env.ADMIN_URL);
  }

  // Additional origins từ CORS_ORIGINS env var (comma-separated)
  if (process.env.CORS_ORIGINS) {
    const customOrigins = process.env.CORS_ORIGINS.split(',').map(o => o.trim());
    origins.push(...customOrigins);
  }

  // FALLBACK: Always allow Vercel domains and common frontend hosts
  origins.push('*.vercel.app');
  origins.push('https://testdeploye.vercel.app');
  origins.push('https://localhost:3000');

  return origins;
};

const allowedOrigins = getCorsOrigins();

// --- CẤU HÌNH CORS ---
// Simple CORS: Allow all origins with credentials
// This ensures headers are always sent and frontend can receive data
app.use(cors({
  origin: true,  // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Keep JSON content type only for API responses (do not override static file mime types)
app.use("/api", (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Explicit CORS headers for static assets so admin domain can fetch model/thumbnail files
app.use("/uploads", (req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Range');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use("/uploads", express.static(UPLOAD_ROOT, {
  maxAge: "7d",
  immutable: true
}));
app.get("/", (req, res) => {
  res.json({ 
    status: "success", 
    message: "Chào mừng đến với API của UAV Training Center! Backend đang hoạt động trơn tru 🚀" 
  });
});
// --- ROUTES ---
const filesRoute = require("./api/files");
const pointsRoute = require("./api/points");
const solutionsRoute = require("./api/solutions");
const displayRoute = require("./api/display");
const settingsRoute = require("./api/settings");
const utilsRoute = require("./api/utils");
const examsRouter = require('./api/exams');
const coursesRoute = require("./api/courses");
const authRoute = require("./api/auth");
const usersRouter = require("./api/users");
const commentRoute = require("./api/comment");
const cloudinaryRoute = require("./api/cloudinary");
const locationRoutes = require("./api/location");
const studyMaterialsRoute = require("./api/studyMaterials");
const faqsRoute = require("./api/faqs");
const licensesRoute = require("./api/licenses");
const otpRoute = require("./api/otp");
const nghiepVuHangBRoute = require("./api/nghiepVuHangB");

app.use("/api/users", usersRouter);
app.use("/api", filesRoute);
app.use("/api/points", pointsRoute);
app.use("/api/solutions", solutionsRoute);
app.use("/api/display", displayRoute);
app.use("/api/settings", settingsRoute);
app.use("/api", utilsRoute);
app.use('/api/exams', examsRouter);
app.use("/api/courses", coursesRoute);
app.use("/api/comments", commentRoute);
app.use("/api/auth", authRoute);
app.use("/api/cloudinary", cloudinaryRoute);
app.use("/api/location", locationRoutes);
app.use("/api/study-materials", studyMaterialsRoute);
app.use("/api/faqs", faqsRoute);
app.use("/api/licenses", licensesRoute);
app.use("/api/otp", otpRoute);
app.use("/api/nghiep-vu-hang-b", nghiepVuHangBRoute);

// --- KHỞI ĐỘNG SERVER & KIỂM TRA DB ---

// Tạm thời KHÔNG ẩn console.error để chúng ta biết nó lỗi gì trên hosting
const __origConsoleLog = console.log;
const __origConsoleWarn = console.warn;
const __origConsoleError = console.error;
// console.log = console.warn = console.error = () => {}; // Tạm comment lại

const startServer = async () => {
  // BƯỚC 1: Luôn luôn bật Server lên trước để không bị lỗi 503 của DirectAdmin
  app.listen(PORT, () => {
    __origConsoleLog(`Server is running on PORT: ${PORT}`);
  });

  // BƯỚC 2: Sau khi server đã chạy, mới bắt đầu thử kết nối Database
  try {
    const [result] = await db.execute("SELECT 1");
    __origConsoleLog("✅ Database connected successfully!");
  } catch (error) {
    // In lỗi ra để biết đường sửa cấu hình .env
    __origConsoleError("❌ Lỗi kết nối Database:", error.message);
  }
};

startServer();