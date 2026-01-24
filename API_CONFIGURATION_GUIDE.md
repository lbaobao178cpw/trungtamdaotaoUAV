# Hướng dẫn Cấu hình API cho Vercel

## Vấn đề
Frontend trên Vercel không thể kết nối tới backend vì:
1. **Hardcode localhost:5000** - Điều này không hoạt động trên production
2. **Missing environment variables** - Không có cách để chỉ định backend URL thực

## Giải pháp

### 1. Tạo Environment Variables trên Vercel Dashboard

**Bước 1:** Đi tới [Vercel Dashboard](https://vercel.com/dashboard)

**Bước 2:** Chọn project `frontend`

**Bước 3:** Vào **Settings** → **Environment Variables**

**Bước 4:** Thêm 2 biến như sau:

| Variable Name | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://your-backend-url.com/api` |
| `VITE_MEDIA_BASE_URL` | `https://your-backend-url.com` |

> **Thay thế `your-backend-url.com` bằng domain thực của backend của bạn!**
> 
> Ví dụ:
> - Nếu dùng Render: `https://uav-api.onrender.com`
> - Nếu dùng Railway: `https://your-app.up.railway.app`
> - Nếu dùng custom domain: `https://api.yourdomain.com`

**Bước 5:** Click **Save** và **Redeploy**

### 2. Trigger Redeploy

Sau khi thêm environment variables:

**Option A - Từ Vercel Dashboard:**
1. Vào project
2. Click **Deployments**
3. Chọn deployment gần đây nhất
4. Click **Redeploy**

**Option B - Từ Git:**
```bash
git push origin main
```

## Kết quả

Sau khi redeploy, frontend sẽ:
- ✅ Lấy API URL từ environment variables
- ✅ Gửi request tới backend thực tế
- ✅ Hiển thị dữ liệu bình thường

## Kiểm tra

Mở DevTools (F12) → **Network** tab → Kiểm tra request đi tới đúng backend domain

## File cấu hình đã thay đổi

- `frontend/src/config/apiConfig.js` - Tập trung quản lý API config
- `frontend/.env.example` - Template environment variables
- Tất cả component files - Sử dụng API_ENDPOINTS từ config thay vì hardcode

---

**Lưu ý:** Đừng commit `.env.local` vào Git! Nó chỉ dùng cho development cục bộ.
