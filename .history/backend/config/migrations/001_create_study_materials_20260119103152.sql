-- Migration: Create study_materials table
-- Giống structure của forms table

-- Tạo bảng study_materials nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS study_materials (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm cột display_name nếu chưa có (cho các database đã tồn tại)
-- Chạy riêng nếu bảng đã tồn tại
-- ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS display_name VARCHAR(500) AFTER file_type;
