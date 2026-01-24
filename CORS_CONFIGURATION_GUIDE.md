# 🔧 Cấu hình CORS để Vercel Frontend kết nối Backend

## Vấn đề
Frontend trên Vercel gửi request tới backend nhưng bị chặn do **CORS policy** - Backend không cho phép request từ domain Vercel.

## Giải pháp: Thêm CORS Configuration

### 1️⃣ Lấy Vercel Frontend Domain

**Bước 1:** Vào [Vercel Dashboard](https://vercel.com/dashboard)
**Bước 2:** Chọn project frontend
**Bước 3:** Copy domain (ví dụ: `https://your-app-abc123.vercel.app`)

### 2️⃣ Cập nhật Backend `.env` trên Render

**Trên Vercel, không cần cập nhật `.env.local` frontend nữa** - chỉ cần CORS được config ở backend!

**Trên Render Dashboard:**

1. Vào project backend
2. Click **Environment**
3. Thêm/cập nhật 2 biến:

| Variable | Value |
|----------|-------|
| `FRONTEND_URL` | `https://your-vercel-domain.vercel.app` |
| `CORS_ORIGINS` | `https://your-vercel-domain.vercel.app,https://your-admin-domain.vercel.app` |

Hoặc nếu bạn có admin dashboard khác:
```
CORS_ORIGINS=https://your-app.vercel.app,https://your-admin.vercel.app
```

**4.** Click **Save Changes**
**5.** Render sẽ tự động redeploy backend

### 3️⃣ Kiểm tra

Sau khi redeploy (3-5 phút):

```bash
# Trong DevTools của Vercel frontend (F12):
- Network tab
- Kiểm tra request tới https://uav-test.onrender.com/api/...
- Nếu thành công: HTTP 200 ✅
- Nếu CORS error: Kiểm tra lại CORS_ORIGINS value
```

## Cấu hình Local Development

Để test local, file `.env` backend đã có:
```
FRONTEND_URL=https://your-vercel-domain.vercel.app
CORS_ORIGINS=https://your-vercel-domain.vercel.app,...
```

Nhưng khi chạy local:
```
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000,...
```

## Hệ thống hoàn chỉnh

```
┌─────────────────┐
│  Vercel Frontend │ (https://your-app.vercel.app)
│  using VITE_*    │
└────────┬────────┘
         │
         │ CORS check
         ▼
┌─────────────────┐
│  Render Backend  │ (https://uav-test.onrender.com)
│  using CORS_*    │
└──────────────────┘
```

---

**💡 Mẹo:** Nếu còn lỗi CORS, hãy thêm dấu `*` cụ thể trong value, không dùng wildcard `*`.
