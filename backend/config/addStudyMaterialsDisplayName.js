/**
 * Script thêm cột display_name vào bảng study_materials
 * Chạy: node backend/config/addStudyMaterialsDisplayName.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addDisplayNameColumn() {
    let connection;

    try {
        // Kết nối database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'uav_training'
        });

        

        // Kiểm tra bảng study_materials có tồn tại không
        const [tables] = await connection.query(
            "SHOW TABLES LIKE 'study_materials'"
        );

        if (tables.length === 0) {
            // Tạo bảng mới
            

            await connection.query(`
                CREATE TABLE study_materials (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(500) NOT NULL,
                    description TEXT,
                    file_url VARCHAR(1000),
                    file_size INT,
                    file_type VARCHAR(50),
                    display_name VARCHAR(500),
                    download_count INT DEFAULT 0,
                    is_active TINYINT(1) DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_is_active (is_active),
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            
        } else {
            // Kiểm tra cột display_name có tồn tại không
            const [columns] = await connection.query(
                "SHOW COLUMNS FROM study_materials LIKE 'display_name'"
            );

            if (columns.length === 0) {
                // Thêm cột display_name
                

                await connection.query(`
                    ALTER TABLE study_materials
                    ADD COLUMN display_name VARCHAR(500) AFTER file_type
                `);

                
            } else {
                
            }
        }

        

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            
        }
    }
}

addDisplayNameColumn();
