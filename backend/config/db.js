require('dotenv').config();
const mysql = require("mysql2/promise");

// Cấu hình Pool kết nối
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost', 
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // TẮT SSL hoàn toàn để khớp với cấu hình server Mắt Bão
    ssl: false, 
    charset: 'utf8mb4'
});

// Kiểm tra kết nối ngay khi khởi chạy (giúp bạn debug nhanh)
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully!');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

module.exports = pool;