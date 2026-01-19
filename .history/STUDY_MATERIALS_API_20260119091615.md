# API Tài liệu Ôn thi - Hướng dẫn sử dụng

## Endpoint API

### 1. Lấy danh sách tài liệu ôn thi
```
GET /api/study-materials
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Đề thi mẫu lý thuyết",
      "description": "Mô tả...",
      "file_url": "https://...",
      "file_size": 2400000,
      "file_size_formatted": "2.3 MB",
      "file_type": "application/pdf",
      "certificate_type": "Hạng A",
      "download_count": 15,
      "created_at": "2026-01-19 10:30:00"
    }
  ]
}
```

### 2. Tải xuống tài liệu
```
GET /api/study-materials/:id/download
```

- Tự động redirect đến URL file trên Cloudinary
- Tự động cập nhật số lần tải xuống

**Example:**
```
GET /api/study-materials/1/download
```

### 3. Tạo tài liệu ôn thi mới (ADMIN)
```
POST /api/study-materials
Headers: Authorization: Bearer {admin_token}
Content-Type: multipart/form-data
```

**Parameters:**
- `title` (string, required) - Tiêu đề tài liệu
- `description` (string, optional) - Mô tả
- `certificateType` (string, optional) - Loại chứng chỉ (Hạng A, Hạng B, ...)
- `file` (file, required) - File tài liệu

**Example:**
```javascript
const formData = new FormData();
formData.append('title', 'Đề thi mẫu lý thuyết');
formData.append('description', 'Đề thi mẫu cho kỳ thi hạng A');
formData.append('certificateType', 'Hạng A');
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:5000/api/study-materials', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  },
  body: formData
});
```

### 4. Cập nhật tài liệu (ADMIN)
```
PUT /api/study-materials/:id
Headers: Authorization: Bearer {admin_token}
Content-Type: multipart/form-data
```

**Parameters:** Giống như tạo mới (file là optional)

### 5. Xóa tài liệu (ADMIN)
```
DELETE /api/study-materials/:id
Headers: Authorization: Bearer {admin_token}
```

---

## Cách sử dụng trong Frontend

### 1. Lấy danh sách tài liệu trong ExamPage
```javascript
useEffect(() => {
  const fetchMaterials = async () => {
    const response = await fetch('http://localhost:5000/api/study-materials');
    const data = await response.json();
    if (data.success) {
      setStudyMaterials(data.data);
    }
  };
  
  fetchMaterials();
}, []);
```

### 2. Hiển thị danh sách tài liệu
```jsx
{studyMaterials.map((doc) => (
  <a 
    key={doc.id}
    href={`http://localhost:5000/api/study-materials/${doc.id}/download`}
    target="_blank"
    rel="noopener noreferrer"
    className="document-item"
  >
    <FileDown className="icon" />
    <div>
      <p className="title">{doc.title}</p>
      <p className="size">{doc.file_type}, {doc.file_size_formatted}</p>
    </div>
  </a>
))}
```

---

## Cách sử dụng Admin Component

### 1. Thêm vào Admin Dashboard
Trong file `AdminDashboard.jsx` hoặc `AdminLayout.jsx`:

```jsx
import StudyMaterialsManager from './components/admin/StudyMaterialsManager';

// Thêm menu item
<a href="#" onClick={() => setCurrentPage('study-materials')}>
  📚 Quản lý Tài liệu Ôn thi
</a>

// Render component
{currentPage === 'study-materials' && <StudyMaterialsManager />}
```

### 2. Tính năng
- ✅ Xem danh sách tài liệu
- ✅ Tìm kiếm tài liệu
- ✅ Thêm tài liệu mới
- ✅ Cập nhật tài liệu
- ✅ Xóa tài liệu
- ✅ Xem số lần tải xuống
- ✅ Upload file lên Cloudinary

---

## Định dạng file được hỗ trợ
- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- PowerPoint (.ppt, .pptx)
- ZIP (.zip)
- RAR (.rar)
- **Kích thước tối đa: 100MB**

---

## Database Schema

```sql
CREATE TABLE study_materials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  certificate_type VARCHAR(50),
  download_count INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Lưu ý

1. **Authentication**: Tất cả thao tác tạo/sửa/xóa cần token admin
2. **File Storage**: Tất cả file được lưu trên Cloudinary
3. **Download Counter**: Số lần tải tự động tăng khi người dùng tải
4. **Soft Delete**: Xóa chỉ đánh dấu `is_active = 0`, không xóa vĩnh viễn
5. **Auto Format**: Kích thước file tự động chuyển thành MB/KB

---

## Troubleshooting

### Token không hợp lệ
```
Error: 401 Unauthorized
```
→ Kiểm tra xem admin_token có được lưu trong localStorage không

### File quá lớn
```
Error: 413 Payload Too Large
```
→ File > 100MB, cần giảm kích thước

### Lỗi upload Cloudinary
```
Error: Cloudinary upload failed
```
→ Kiểm tra config Cloudinary trong .env
