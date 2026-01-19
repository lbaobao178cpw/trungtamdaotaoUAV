# 🔐 Hướng dẫn Token Refresh - Giải quyết Token Hết Hạn

## ❌ **Vấn đề Ban Đầu**

Token của bạn hết hạn sau **1 giờ** vì:
- Backend cấu hình `TOKEN_EXPIRY = '1h'` (xem `backend/middleware/verifyToken.js`)
- Frontend **không implement** cơ chế refresh token
- Khi token hết hạn, người dùng phải đăng nhập lại

**Kết quả**: Người dùng đang dùng web thì bị kick ra, phải đăng nhập lại → **trải nghiệm xấu**

---

## ✅ **Giải Pháp Đã Thực Hiện**

### **1. Tạo API Interceptor (Frontend & Frontend-Admin)**

**File mới:**
- `frontend/src/lib/apiInterceptor.js`
- `frontend-admin/src/lib/apiInterceptor.js`

**Cách hoạt động:**
```
1. User gọi API → Interceptor thêm access_token vào header
2. Server trả 401 Token Expired
3. Interceptor tự động gọi /api/auth/refresh-token
4. Lấy token mới → Retry request cũ
5. Request thành công ✅
```

### **2. Cập nhật LoginPage - Lưu Refresh Token**

**Trước:**
```javascript
localStorage.setItem('user_token', data.token);
```

**Sau:**
```javascript
localStorage.setItem('user_token', data.token);
localStorage.setItem('refresh_token', data.refreshToken); // ← THÊM
```

### **3. Cập nhật AuthContext - Xóa Refresh Token Khi Logout**

```javascript
const logout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('refresh_token'); // ← THÊM
    localStorage.removeItem('user');
    setIsAuthenticated(false);
};
```

### **4. Khởi Tạo Interceptor Từ Main.jsx**

**Trước:**
```javascript
import App from './App.jsx'
```

**Sau:**
```javascript
import App from './App.jsx'
import './lib/apiInterceptor.js' // ← THÊM (Chạy ngay khi app khởi động)
```

---

## 🔄 **Quy Trình Token Refresh**

```
┌─────────────────────────────┐
│   User Đang Dùng Web        │
└────────────┬────────────────┘
             │
             ↓ (1 giờ sau)
    ┌────────────────┐
    │ Access Token   │
    │ Expires        │
    └────┬───────────┘
         │
         ↓
    ┌────────────────────────┐
    │ Gọi API (401)          │
    │ Interceptor Catch      │
    └────┬───────────────────┘
         │
         ↓
    ┌──────────────────────┐
    │ POST /refresh-token  │
    │ (Gửi refresh_token)  │
    └────┬─────────────────┘
         │
         ↓ ✅ Thành công
    ┌──────────────────┐
    │ Nhận token mới   │
    │ Lưu localStorage │
    └────┬─────────────┘
         │
         ↓
    ┌──────────────────┐
    │ Retry Request    │
    │ Gốc              │
    └────┬─────────────┘
         │
         ↓
    ┌──────────────────┐
    │ ✅ Hoàn thành    │
    └──────────────────┘
```

---

## 📋 **Backend Requirements**

Backend của bạn **đã có**:
- ✅ `/api/auth/refresh-token` endpoint (backend/api/auth.js line 238)
- ✅ Refresh token generation (7 ngày hạn)
- ✅ Token verification logic

**Không cần sửa backend!**

---

## 🚀 **Cách Sử Dụng**

### **Cho các API call thông thường:**
```javascript
// Sử dụng apiClient từ apiInterceptor
import apiClient from './lib/apiInterceptor';

// Gọi API bình thường - interceptor tự xử lý
apiClient.get('/faqs')
    .then(res => console.log(res.data))
    .catch(err => console.error(err));
```

### **Hoặc dùng fetch thông thường:**
```javascript
// Frontend sẽ tự động thêm token qua interceptor
fetch('/api/faqs', {
    headers: { 'Authorization': `Bearer ${token}` }
})
```

---

## ⏱️ **Thời Gian Token**

| Token | Thời Hạn | Khi Nào Dùng |
|-------|----------|------------|
| **Access Token** | 1 giờ | Xác thực request |
| **Refresh Token** | 7 ngày | Tạo access token mới |

**Ưu điểm:** Bảo mật cao (access token ngắn hạn) + UX tốt (refresh token dài hạn)

---

## 🔒 **Bảo Mật**

✅ **Đã implement:**
- Refresh token lưu an toàn trong localStorage
- Access token ngắn hạn (1h) giảm rủi ro
- Auto-refresh khi token hết → không cần user intervention
- Logout xóa cả 2 token

---

## 📝 **Lưu Ý**

1. **Token vẫn hết hạn sau 7 ngày** (refresh token expiry)
   - Lúc đó cần đăng nhập lại → **bình thường**

2. **Nếu muốn tăng thời gian refresh token:**
   - Sửa `backend/middleware/verifyToken.js` line 7
   - `const REFRESH_TOKEN_EXPIRY = '30d';` (30 ngày)

3. **Nếu muốn tăng access token:**
   - `const TOKEN_EXPIRY = '24h';`
   - ⚠️ Cảnh báo: Bảo mật kém hơn

---

## ✨ **Kết Quả**

✅ User không bị kick ra giữa chừng  
✅ Web hoạt động liên tục 7 ngày  
✅ Tự động refresh token ở backend  
✅ Bảo mật cao  

---

**Chúc mừng! Token refresh đã được setup! 🎉**
