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

// --- CẤU HÌNH CORS ---
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
      return callback(null, true);
    }
    const allowedOrigins = [
      "https://trungtamdaotaouav.vn",
      "https://www.trungtamdaotaouav.vn"
    ];
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true,
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

// --- KHỞI ĐỘNG SERVER & KIỂM TRA DB ---
const startServer = async () => {
  try {
    // Test connection
    const [result] = await db.execute("SELECT 1");


    // === FIX STATUS COLUMN ===
    try {

      await db.execute(`
        ALTER TABLE legal_documents 
        MODIFY COLUMN status VARCHAR(20) 
        DEFAULT 'a' 
        NOT NULL
      `);
    } catch (alterErr) {
      if (alterErr.message.includes("Syntax error")) {

      } else {

      }
    }

    // === FIX FILE_URL COLUMN ===
    try {

      await db.execute(`
        ALTER TABLE forms 
        MODIFY COLUMN file_url LONGTEXT 
        NULL
      `);

    } catch (alterErr) {
      if (alterErr.message.includes("Syntax error")) {

      } else {

      }
    }

    // === FIX FORM_CODE COLUMN SIZE ===
    try {

      await db.execute(`
        ALTER TABLE forms 
        MODIFY COLUMN form_code VARCHAR(255) 
        NOT NULL UNIQUE
      `);
    } catch (alterErr) {
      if (alterErr.message.includes("Syntax error")) {

      } else {

      }
    }

    // === ADD DISPLAY_NAME COLUMN ===
    try {

      await db.execute(`
        ALTER TABLE forms 
        ADD COLUMN display_name VARCHAR(500)
      `);

    } catch (alterErr) {
      if (alterErr.message.includes("Duplicate")) {

      } else if (alterErr.message.includes("Syntax error")) {

      } else {

      }
    }

    // === CREATE MISSING TABLES ===
    // Create footer_config table if not exists
    try {

      await db.execute(`
        CREATE TABLE IF NOT EXISTS footer_config (
          id INT PRIMARY KEY,
          company_name VARCHAR(255),
          branch_name VARCHAR(255),
          address TEXT,
          email VARCHAR(255),
          working_hours VARCHAR(255),
          copyright_text TEXT,
          legal_documents LONGTEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

    } catch (err) {
      console.error("⚠️  Error creating footer_config:", err.message);
    }

    // Create notifications table if not exists
    try {

      await db.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          date DATE,
          description TEXT,
          link VARCHAR(500),
          is_new TINYINT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

    } catch (err) {
      console.error("⚠️  Error creating notifications:", err.message);
    }

    // Create privacy_policy table if not exists
    try {

      await db.execute(`
        CREATE TABLE IF NOT EXISTS privacy_policy (
          id INT PRIMARY KEY,
          content LONGTEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

    } catch (err) {
      console.error("⚠️  Error creating privacy_policy:", err.message);
    }

    // Create terms_of_service table if not exists
    try {

      await db.execute(`
        CREATE TABLE IF NOT EXISTS terms_of_service (
          id INT PRIMARY KEY,
          content LONGTEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

    } catch (err) {
      console.error("⚠️  Error creating terms_of_service:", err.message);
    }

    app.listen(PORT, () => {


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