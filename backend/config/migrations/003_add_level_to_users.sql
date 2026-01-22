-- Migration: Add level column to users table
-- Created: 2026-01-22

ALTER TABLE users ADD COLUMN level VARCHAR(50) DEFAULT 'Cơ bản' COMMENT 'Cấp độ người dùng: Cơ bản hoặc Nâng cao';

-- Set level based on existing certificates if any
UPDATE users u
SET u.level = 'Nâng cao'
WHERE u.id IN (
  SELECT DISTINCT user_id FROM certificates 
  WHERE user_id IS NOT NULL
);
