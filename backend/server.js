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
  origins.push("http://127.0.0.1:5173");
  origins.push("http://127.0.0.1:5174");

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

console.log('📋 CORS Configuration:');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('CORS_ORIGINS:', process.env.CORS_ORIGINS);
console.log('✅ Allowed Origins:', allowedOrigins);

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

// Set UTF-8 encoding for all responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use("/uploads", express.static(UPLOAD_ROOT, {
  maxAge: "7d",
  immutable: true
}));

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
const startServer = async () => {
  try {
    // Test connection
    const [result] = await db.execute("SELECT 1");
    console.log("✅ Database connected successfully via Aiven!");

    // NOTE: Automatic DB alteration/migration code removed per request.
    // Server will only test DB connection and start; it will not modify schema or seed data.

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on PORT: ${PORT}`);
      console.log(`📂 Upload Storage Path: ${UPLOAD_ROOT}`);
    });

  } catch (error) {
    console.error("❌ Database Connection Failed:");
    console.error("Message:", error.message);
    console.error("Code:", error.code);

    if (error.code === 'HANDSHAKE_SSL_ERROR' || error.code === 'ER_NOT_SUPPORTED_AUTH_MODE') {
      console.warn("⚠️  LƯU Ý: Aiven yêu cầu SSL. Hãy kiểm tra lại file config/db.js.");
    }
  }
};

startServer();