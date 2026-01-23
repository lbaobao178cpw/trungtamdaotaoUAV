-- Migration: Thêm cột điểm tổng thể vào user_course_progress
-- Công thức: Điểm Tổng = (Trung Bình Quiz × 70%) + (Tiến Độ × 30%)

ALTER TABLE user_course_progress ADD COLUMN (
  quiz_score DECIMAL(5,2) DEFAULT NULL,           -- Trung bình điểm Quiz
  progress_percentage_value INT DEFAULT 0,         -- Tiến độ học (%)
  overall_score DECIMAL(5,2) DEFAULT NULL,         -- Điểm tổng thể (Tính từ công thức)
  score_calculated_at TIMESTAMP DEFAULT NULL       -- Lần tính điểm cuối cùng
);

-- Tạo index cho các truy vấn điểm
CREATE INDEX idx_overall_score ON user_course_progress(overall_score);
CREATE INDEX idx_score_calculated_at ON user_course_progress(score_calculated_at);
