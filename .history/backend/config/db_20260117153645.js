require('dotenv').config(); // Load file .env
const mysql = require("mysql2/promise");
const fs = require('fs');
const path = require('path');

// Đường dẫn tới file chứng chỉ: backend/certs/ca.pem
const caCertPath = path.join(__dirname, '../certs/ca.pem');

let sslOptions = { rejectUnauthorized: false }; // Mặc định

try {
    if (fs.existsSync(caCertPath)) {
        sslOptions = {
            ca: fs.readFileSync(caCertPath),
            rejectUnauthorized: true // Có chứng chỉ -> Bảo mật cao
        };
        console.log("🔒 Đã tìm thấy chứng chỉ SSL (ca.pem).");
    } else {
        console.log("⚠️ Không tìm thấy file ca.pem, đang chạy chế độ không an toàn.");
    }
} catch (err) {
    console.error("Lỗi đọc file cert:", err.message);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,   // Lấy từ .env
  user: process.env.DB_USER,   // Lấy từ .env
  password: process.env.DB_PASS, // Lấy từ .env
  database: process.env.DB_NAME, // Lấy từ .env
  port: process.env.DB_PORT,     // Lấy từ .env (16538)
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: sslOptions, // Dùng SSL cấu hình ở trên
  charset: 'utf8mb4', // Hỗ trợ emoji và ký tự Unicode đầy đủ
  collation: 'utf8mb4_unicode_ci' // Collation hỗ trợ UTF-8
});

module.exports = pool;