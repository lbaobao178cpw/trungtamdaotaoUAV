# Tính Năng Đánh Giá Khóa Học

## 📋 Giới Thiệu
Cho phép user đánh giá khóa học từ 1-5 sao, cùng với bình luận. Admin và chính user đó có thể xóa đánh giá.

## 🔧 Cài Đặt

### 1. Database Setup
Chạy SQL script để tạo table:
```sql
-- Trong file: backend/migrations/create_course_ratings_table.sql
CREATE TABLE IF NOT EXISTS course_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_course_rating (course_id, user_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2. Backend APIs
Đã thêm 3 endpoint vào `backend/api/courses.js`:

#### GET /api/courses/:id/ratings
Lấy danh sách đánh giá của khóa học
- **Query params**: `limit=10&page=1`
- **Response**: Danh sách ratings + statistics

```javascript
{
  stats: {
    totalRatings: 25,
    averageRating: "4.60",
    distribution: { 5: 15, 4: 8, 3: 2, 2: 0, 1: 0 }
  },
  ratings: [
    {
      id: 1,
      course_id: 5,
      user_id: 2,
      rating: 5,
      comment: "Khóa học rất tuyệt vời!",
      full_name: "Nguyễn Văn A",
      created_at: "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### POST /api/courses/:id/ratings (yêu cầu đăng nhập)
Thêm hoặc cập nhật đánh giá

```javascript
{
  rating: 5,          // 1-5
  comment: "Text..."  // optional
}
```

#### DELETE /api/courses/:id/ratings/:ratingId (yêu cầu đăng nhập)
Xóa đánh giá của chính mình (hoặc admin)

### 3. Frontend Components

#### Import Component vào CoursedetailPage.jsx
```jsx
import CourseRatings from './CourseRatings';

// Trong render:
<CourseRatings 
  courseId={parseInt(id)}
  token={token}
  currentUserId={user?.id}
/>
```

#### Component Props:
- `courseId` (number): ID của khóa học
- `token` (string): JWT token của user
- `currentUserId` (number): ID của user hiện tại

## 📊 Features

✅ **Hiển thị thống kê**:
- Điểm trung bình
- Số lượng đánh giá theo từng sao
- Biểu đồ phân bố

✅ **Thêm/Cập nhật đánh giá**:
- Chọn 1-5 sao
- Viết bình luận (optional)
- Mỗi user chỉ có 1 đánh giá cho 1 khóa học

✅ **Quản lý đánh giá**:
- User xóa đánh giá của chính mình
- Admin có thể xóa bất kỳ đánh giá nào
- Danh sách đánh giá pagination

## 🎨 Giao Diện
- Star rating input interactif (hover effect)
- Biểu đồ phân bố đánh giá đẹp mắt
- Danh sách bình luận responsive
- Animation smooth khi submit/delete

## 🔐 Bảo Mật
- Yêu cầu token để đánh giá
- Chỉ user tạo hoặc admin mới xóa
- Validate rating (1-5)
- SQL injection protection (prepared statements)

## 📝 Cách Sử Dụng

1. **Xem đánh giá**: Truy cập trang chi tiết khóa học
2. **Thêm đánh giá**: Chọn sao → Viết bình luận → Gửi
3. **Cập nhật**: Chọn sao mới → Gửi (tự động update)
4. **Xóa**: Nhấn icon thùng rác (chỉ đánh giá của mình)

## 📱 Database Schema

```sql
course_ratings:
├── id (INT, Primary Key)
├── course_id (INT, Foreign Key → courses)
├── user_id (INT, Foreign Key → users)
├── rating (INT, 1-5)
├── comment (TEXT, nullable)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

Constraints:
- UNIQUE(course_id, user_id): Mỗi user 1 rating/course
- CHECK(rating >= 1 AND rating <= 5)
- ON DELETE CASCADE
```

## 🚀 Testing

```bash
# Test API
curl -X GET "http://localhost:5000/api/courses/1/ratings?limit=10"

curl -X POST "http://localhost:5000/api/courses/1/ratings" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "comment": "Tuyệt vời!"}'

curl -X DELETE "http://localhost:5000/api/courses/1/ratings/1" \
  -H "Authorization: Bearer TOKEN"
```
