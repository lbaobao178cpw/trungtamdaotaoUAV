# 📦 UAV Training System - Project Structure & Deployment

## 🏗️ Project Structure (Monorepo)

```
trungtamdaotaoUAV/
│
├── 📁 backend/                    # Express.js Backend API
│   ├── api/                       # API routes
│   ├── config/                    # Database config
│   ├── middleware/                # Auth & CORS middleware
│   ├── uploads/                   # File uploads
│   ├── .env.example               # Environment template
│   ├── server.js                  # Entry point
│   ├── package.json
│   └── vercel.json                # (Not needed - Render only)
│
├── 📁 frontend/                   # React + Vite (User App)
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/              # AuthContext
│   │   ├── lib/                   # API interceptor
│   │   └── pages/
│   ├── .env.example               # API URL template
│   ├── vite.config.js
│   ├── vercel.json                # ✅ Configured for Vercel
│   ├── index.html
│   └── package.json
│
├── 📁 frontend-admin/             # React + Vite (Admin App)
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   └── pages/
│   ├── .env.example               # API URL template
│   ├── vite.config.js
│   ├── vercel.json                # ✅ Configured for Vercel
│   ├── index.html
│   └── package.json
│
├── 📄 package.json                # Root monorepo config
├── 📄 .gitignore                  # ✅ Updated for security
├── 📄 DEPLOYMENT.md               # ✅ Complete deployment guide
├── 📄 ENV_REFERENCE.md            # ✅ Env variables reference
├── 📄 setup.sh / setup.bat        # ✅ Local setup scripts
└── README.md                      # This file
```

---

## 🚀 Quick Start (Local Development)

### Windows
```bash
# Run setup script
.\setup.bat

# Or manually
npm run install:all
npm run dev
```

### macOS / Linux
```bash
# Run setup script
bash setup.sh

# Or manually
npm run install:all
npm run dev
```

**Servers will start at:**
- 🎨 Frontend: http://localhost:5173
- 👨‍💼 Admin: http://localhost:5174
- 🔌 Backend: http://localhost:5000

---

## 📋 Environment Variables Setup

### Step 1: Copy Examples
Each folder has `.env.example` - use as template

### Step 2: Backend Configuration
Create `backend/.env`:
```env
# Database (Aiven MySQL)
DB_HOST=xxxx.aivencloud.com
DB_PORT=21321
DB_USER=avnadmin
DB_PASSWORD=your-password
DB_NAME=defaultdb
DB_SSL=true

# JWT Keys (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=<generate-32-char-random>
JWT_REFRESH_SECRET=<generate-32-char-random>

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email Service (Brevo)
BREVO_API_KEY=your-brevo-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=UAV Training

# Production URLs (for CORS)
FRONTEND_URL=https://your-frontend.vercel.app
ADMIN_URL=https://your-admin.vercel.app
```

### Step 3: Frontend Configuration
Create `frontend/.env.local`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_MEDIA_BASE_URL=http://localhost:5000
```

### Step 4: Frontend-Admin Configuration
Create `frontend-admin/.env.local`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_MEDIA_BASE_URL=http://localhost:5000
```

---

## 🎯 Deployment Overview

| Service | Platform | Status | Setup |
|---------|----------|--------|-------|
| **Backend** | Render | ✅ Configured | See below |
| **Frontend** | Vercel | ✅ Configured | See below |
| **Admin** | Vercel | ✅ Configured | See below |

---

## 🔧 Backend Deploy (Render)

### Prerequisites
- Render account (render.com)
- MySQL database (Aiven)
- GitHub repository

### Steps
1. Login to [render.com](https://render.com)
2. Create new **Web Service**
3. Connect GitHub repository
4. Configure:
   - **Name**: `uav-backend`
   - **Root Directory**: `backend/`
   - **Build**: `npm install --legacy-peer-deps`
   - **Start**: `npm start`

5. Add all env variables (see ENV_REFERENCE.md)
6. Deploy!

**Result**: `https://uav-backend-xxxx.onrender.com`

---

## 🎨 Frontend Deploy (Vercel)

### Prerequisites
- Vercel account (vercel.com)
- GitHub repository

### Steps
1. Login to [vercel.com](https://vercel.com)
2. Import GitHub project
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: `Vite`
   - **Build**: `npm run build`
   - **Install**: `npm install --legacy-peer-deps`

4. Add env variables:
   ```env
   VITE_API_BASE_URL=https://uav-backend-xxxx.onrender.com/api
   VITE_MEDIA_BASE_URL=https://uav-backend-xxxx.onrender.com
   ```

5. Deploy!

**Result**: `https://your-frontend-xxxx.vercel.app`

---

## 👨‍💼 Admin Deploy (Vercel)

### Same as Frontend
1. Import same repository
2. Set **Root Directory**: `frontend-admin`
3. Add same env variables
4. Deploy!

**Result**: `https://your-admin-xxxx.vercel.app`

---

## 🔐 Security Checklist

- [ ] `.env` is in `.gitignore` ✓
- [ ] `.env.example` has NO secrets ✓
- [ ] JWT secrets are 32+ characters ✓
- [ ] Database password is strong ✓
- [ ] Cloudinary API secret is NEVER in code ✓
- [ ] CORS origins include Vercel domains ✓
- [ ] Node ENV is `production` on Render ✓
- [ ] All sensitive data in platform UI (not code) ✓

---

## 📝 Important Files

| File | Purpose | Commit? |
|------|---------|---------|
| `.env` | Local secrets | ❌ NO |
| `.env.example` | Template | ✅ YES |
| `server.js` | Backend entry | ✅ YES |
| `vite.config.js` | Frontend build | ✅ YES |
| `vercel.json` | Vercel config | ✅ YES |
| `DEPLOYMENT.md` | Deploy guide | ✅ YES |
| `ENV_REFERENCE.md` | Env vars help | ✅ YES |

---

## 🐛 Troubleshooting

### Build fails on Vercel
- Add `npm install --legacy-peer-deps` to build command
- Check Node version (22.x)

### CORS errors
- Backend has updated CORS config (reads from env)
- Add frontend URLs to `CORS_ORIGINS` env var on Render

### Database connection fails
- Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
- Verify Aiven firewall allows Render IP
- Check SSL connection if using `DB_SSL=true`

### API not responding
- Check Render logs: Dashboard → Web Service → Logs
- Verify backend URL in frontend `.env`

---

## 📚 Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Step-by-step deployment guide
- [ENV_REFERENCE.md](./ENV_REFERENCE.md) - Environment variables reference
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)

---

## 🎯 Next Steps

1. **Local Setup**: Run `npm run install:all` then `npm run dev`
2. **Environment**: Set up all `.env` files
3. **Database**: Ensure MySQL is running and accessible
4. **Test Locally**: Check all 3 apps work
5. **Deploy Backend**: Follow Render section
6. **Deploy Frontend**: Follow Vercel section
7. **Monitor**: Check logs after deployment

---

**Status**: ✅ Ready for Production
**Last Updated**: January 24, 2026
