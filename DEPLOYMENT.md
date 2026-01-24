# 🚀 HƯỚNG DẪN DEPLOY

Hướng dẫn chi tiết để deploy Backend (Render), Frontend & Frontend-Admin (Vercel).

## 📋 Cấu trúc Monorepo

```
trungtamdaotaoUAV/
├── backend/              # Express API (Deploy lên Render)
├── frontend/             # User Frontend (Deploy lên Vercel)
├── frontend-admin/       # Admin Frontend (Deploy lên Vercel)
├── package.json          # Root package.json
└── .env                  # Root environment variables
```

---

## 🔧 BACKEND - DEPLOY LÊN RENDER

### 1. Chuẩn bị

**Yêu cầu:**
- Tài khoản Render (render.com)
- Database MySQL (Aiven hoặc nơi khác)
- Cloudinary account (file upload)
- Brevo account (OTP emails)

### 2. Tạo Render Service

#### Step 1: Tạo Web Service
1. Truy cập [render.com](https://render.com)
2. Click **"New"** → **"Web Service"**
3. Connect GitHub repository của bạn
4. Chọn branch muốn deploy (VD: `main` hoặc `giahuy-dev`)

#### Step 2: Cấu hình Service
- **Name**: `uav-backend` (hoặc tên khác)
- **Environment**: `Node`
- **Build Command**: `npm install --legacy-peer-deps`
- **Start Command**: `npm start` (hoặc `node backend/server.js`)
- **Root Directory**: `backend/` (important!)

#### Step 3: Thêm Environment Variables
Vào **Settings** → **Environment** và thêm các biến sau:

```env
# Database
DB_HOST=your-aiven-host.aivencloud.com
DB_PORT=21321
DB_USER=avnadmin
DB_PASSWORD=your-db-password
DB_NAME=defaultdb
DB_SSL=true

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (Brevo)
BREVO_API_KEY=your-brevo-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=UAV Training

# Frontend URLs (dùng URLs từ Vercel)
FRONTEND_URL=https://your-frontend-domain.vercel.app
ADMIN_URL=https://your-admin-domain.vercel.app

# Node
NODE_ENV=production
PORT=5000
```

#### Step 4: Deploy
- Click **"Create Web Service"**
- Render sẽ tự build và deploy
- Copy URL khi deployed (VD: `https://uav-backend-xxxx.onrender.com`)

⚠️ **Lưu ý**: Render free tier sẽ hibernate nếu không có request. Upgrade lên Starter ($7/month) để chạy 24/7.

---

## 🎨 FRONTEND - DEPLOY LÊN VERCEL

### 1. Chuẩn bị
- Tài khoản Vercel (vercel.com)
- GitHub repository connected

### 2. Import Frontend Project

#### Step 1: Vercel Dashboard
1. Truy cập [vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Import GitHub repository

#### Step 2: Cấu hình Build
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install --legacy-peer-deps`

#### Step 3: Environment Variables
Vào **Settings** → **Environment Variables** thêm:

```env
VITE_API_BASE_URL=https://uav-backend-xxxx.onrender.com/api
VITE_MEDIA_BASE_URL=https://uav-backend-xxxx.onrender.com
```

#### Step 4: Deploy
- Click **"Deploy"**
- Vercel sẽ tự build và deploy
- Copy production URL (VD: `https://your-frontend.vercel.app`)

---

## 👨‍💼 FRONTEND-ADMIN - DEPLOY LÊN VERCEL

### Quy trình tương tự Frontend

#### Step 1: Vercel Dashboard
1. Click **"Add New..."** → **"Project"**
2. Import cùng GitHub repository

#### Step 2: Cấu hình Build
- **Root Directory**: `frontend-admin`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install --legacy-peer-deps`

#### Step 3: Environment Variables
```env
VITE_API_BASE_URL=https://uav-backend-xxxx.onrender.com/api
VITE_MEDIA_BASE_URL=https://uav-backend-xxxx.onrender.com
```

#### Step 4: Deploy
- Vercel sẽ tự deploy
- Copy production URL (VD: `https://your-admin.vercel.app`)

---

## ✅ Kiểm tra sau Deploy

### 1. Backend (Render)
```bash
# Test API
curl https://uav-backend-xxxx.onrender.com/api/health

# Kiểm tra logs
# Vào Render Dashboard → Web Service → Logs
```

### 2. Frontend (Vercel)
- Mở `https://your-frontend.vercel.app`
- Check Network tab để xem API calls

### 3. Frontend-Admin (Vercel)
- Mở `https://your-admin.vercel.app`
- Đăng nhập thử

---

## 🔄 Update Code sau Deploy

### Backend (Render)
```bash
git add .
git commit -m "Update backend"
git push origin main
# Render tự động deploy từ git push
```

### Frontend (Vercel)
```bash
git add .
git commit -m "Update frontend"
git push origin main
# Vercel tự động deploy từ git push
```

---

## 🐛 Troubleshooting

### Backend không kết nối Database
- ✓ Kiểm tra DB_HOST, DB_PORT có đúng không
- ✓ Kiểm tra DB firewall cho phép connection từ Render
- ✓ Xem logs: Render Dashboard → Logs

### Frontend API errors
- ✓ Kiểm tra `VITE_API_BASE_URL` có đúng Render URL không
- ✓ Mở DevTools → Network → check API calls
- ✓ CORS error? Kiểm tra backend `FRONTEND_URL` env var

### CORS Block
- Backend server.js đã cập nhật để đọc từ env
- Thêm Vercel URLs vào `CORS_ORIGINS` trên Render

### Vercel Build Fail
- Thêm `--legacy-peer-deps` ở build command
- Check logs: Vercel Dashboard → Deployments → Build Logs

---

## 💡 Best Practices

✅ **Luôn dùng .env.example**
- Commit `.env.example` (không commit `.env`)
- Document tất cả env vars cần thiết

✅ **Separate Branches**
- `main` → Production deploy
- `dev` → Development
- `giahuy-dev` → Feature branch

✅ **Monitor Logs**
- Render: Settings → Logs
- Vercel: Deployments tab

✅ **Use Custom Domains**
- Render: Settings → Custom Domain
- Vercel: Settings → Domains

✅ **Backup Database**
- Aiven cung cấp automated backups
- Enable daily backups

---

## 📞 Support Links

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MySQL Connection String**: https://dev.mysql.com/doc/
- **Cloudinary Docs**: https://cloudinary.com/documentation

---

**Status**: ✅ Ready for Production Deploy
