-- Create FAQs table
CREATE TABLE IF NOT EXISTS faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer LONGTEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data (Optional)
INSERT INTO faqs (question, answer, display_order, is_active) VALUES
('Tôi cần chuẩn bị gì khi đi thi sát hạch?', 'Bạn cần mang theo CCCD/CMND, biên lai thanh toán lệ phí thi, giấy xác nhận đủ điều kiện dự thi (được cấp sau khi hoàn thành khóa học), và thiết bị bay (đối với các kỳ thi có phần thực hành).', 1, 1),
('Tôi có thể đăng ký thi lại nếu trượt không?', 'Có, bạn có thể đăng ký thi lại sau 15 ngày kể từ ngày thi trước. Lệ phí thi lại sẽ bằng 50% lệ phí thi ban đầu.', 2, 1),
('Chứng chỉ có hiệu lực trong bao lâu và làm thế nào để gia hạn?', 'Thời hạn hiệu lực tùy thuộc vào từng loại chứng chỉ, từ 1-3 năm. Để gia hạn, bạn cần nộp đơn trực tuyến trước khi chứng chỉ hết hạn 30 ngày, hoàn thành khóa học cập nhật (nếu có) và đóng phí gia hạn.', 3, 1),
('Tôi có thể nâng cấp chứng chỉ từ hạng thấp lên hạng cao hơn không?', 'Có, bạn có thể nâng cấp chứng chỉ bằng cách hoàn thành khóa học bổ sung và tham gia kỳ thi sát hạch cho hạng chứng chỉ mới. Bạn sẽ được giảm một phần lệ phí thi nếu đã có chứng chỉ hạng thấp hơn còn hiệu lực.', 4, 1),
('Tôi cần có chứng chỉ nào nếu sử dụng UAV cho mục đích thương mại?', 'Đối với hoạt động thương mại, bạn cần có ít nhất chứng chỉ hạng C trở lên. Ngoài ra, doanh nghiệp của bạn cũng cần có giấy phép kinh doanh dịch vụ bay không người lái do Cục Hàng không Việt Nam cấp.', 5, 1),
('Có yêu cầu về độ tuổi tối thiểu để tham gia thi sát hạch không?', 'Có, độ tuổi tối thiểu phụ thuộc vào từng loại chứng chỉ: Hạng A (16 tuổi), Hạng B và C (18 tuổi), Hạng D (21 tuổi).', 6, 1),
('Tôi có cần đăng ký UAV của mình không?', 'Có, mọi UAV có trọng lượng trên 250g đều phải đăng ký với Cục Hàng không Việt Nam. Việc đăng ký có thể thực hiện trực tuyến sau khi bạn có chứng chỉ người điều khiển UAV.', 7, 1),
('Có chế độ miễn giảm lệ phí thi không?', 'Học sinh, sinh viên và người có công với cách mạng được giảm 20% lệ phí thi. Người khuyết tật được giảm 50% lệ phí thi. Để được miễn giảm, vui lòng cung cấp giấy tờ chứng minh khi đăng ký.', 8, 1);
