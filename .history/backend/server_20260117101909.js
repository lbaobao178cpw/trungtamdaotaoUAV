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
    console.log("Blocked CORS:", origin);
    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true,
}));

app.use(compression());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

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

// --- KHỞI ĐỘNG SERVER & KIỂM TRA DB ---
const startServer = async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ Database connected successfully via Aiven!");
    connection.release();

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