-- Script để dọn dẹp dữ liệu học tập của các khóa học đã bị xóa
-- Chạy script này để xóa dữ liệu cũ

-- 1. Xóa quiz_results của các khóa học không còn tồn tại
DELETE FROM quiz_results 
WHERE course_id NOT IN (SELECT id FROM courses);

-- 2. Xóa user_course_progress của các khóa học không còn tồn tại
DELETE FROM user_course_progress 
WHERE course_id NOT IN (SELECT id FROM courses);

-- 3. Xóa lesson_completion của các bài học không còn tồn tại
DELETE FROM lesson_completion 
WHERE lesson_id NOT IN (SELECT id FROM lessons);

-- 4. Xóa course_views của các khóa học không còn tồn tại
DELETE FROM course_views 
WHERE course_id NOT IN (SELECT id FROM courses);

-- Kiểm tra kết quả
SELECT 'quiz_results còn lại:' as info, COUNT(*) as count FROM quiz_results
UNION ALL
SELECT 'user_course_progress còn lại:', COUNT(*) FROM user_course_progress
UNION ALL  
SELECT 'lesson_completion còn lại:', COUNT(*) FROM lesson_completion;
