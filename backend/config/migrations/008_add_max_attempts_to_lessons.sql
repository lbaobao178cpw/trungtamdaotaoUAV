-- Migration: Thêm cột max_attempts vào bảng lessons để giới hạn số lần làm quiz
-- 0 = Không giới hạn số lần làm quiz

ALTER TABLE lessons ADD COLUMN max_attempts INT DEFAULT 0;
ALTER TABLE lessons ADD COLUMN pass_score INT DEFAULT 0;

-- Index để tối ưu truy vấn
CREATE INDEX idx_lessons_max_attempts ON lessons(max_attempts);
