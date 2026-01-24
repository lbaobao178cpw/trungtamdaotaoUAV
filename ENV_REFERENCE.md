# 📋 Environment Variables Quick Reference

## 🔐 Sensitive Keys (NEVER commit these!)

### Backend Database
```
DB_HOST=database-host.aivencloud.com
DB_PORT=21321
DB_USER=username
DB_PASSWORD=XXXXXXXX
DB_NAME=defaultdb
```

### JWT Secrets
```
JWT_SECRET=min-32-characters-random-string-xxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_REFRESH_SECRET=another-random-string-for-refresh-tokens-xxxxxxxxxxxxxxx
```

### Cloudinary (File Upload)
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=XXXXXXXXXXXXXXXX
CLOUDINARY_API_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
```

### Email (Brevo)
```
BREVO_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=UAV Training System
```

---

## 🌐 Public URLs (Safe to commit in .env.example)

### Development
```
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000
```

### Production
```
FRONTEND_URL=https://your-frontend-domain.vercel.app
ADMIN_URL=https://your-admin-domain.vercel.app
CORS_ORIGINS=https://your-frontend-domain.vercel.app,https://your-admin-domain.vercel.app
```

---

## 🔧 How to Generate Secret Keys

### JWT Secret (Node.js)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z...
```

### Alternative using OpenSSL
```bash
openssl rand -hex 32
```

---

## 📝 Where to Set Env Vars

### Local Development
- Create `.env` in backend/, frontend/, frontend-admin/
- Add to `.gitignore` ✓

### Render (Backend)
1. Go to Web Service Settings
2. Environment → Add Variable
3. Paste all backend env vars

### Vercel (Frontend & Admin)
1. Go to Project Settings
2. Environment Variables
3. Add for Production/Preview/Development

---

## ✅ Env Vars Checklist

- [ ] Database credentials set in Render
- [ ] JWT secrets generated (min 32 chars)
- [ ] Cloudinary API credentials added
- [ ] Brevo API key configured
- [ ] Frontend URLs set in backend CORS
- [ ] API base URL set in Vercel
- [ ] No secrets in .env.example
- [ ] All .env files in .gitignore
- [ ] Production NODE_ENV=production

---

## 🚨 Security Tips

1. **Rotate secrets regularly** (quarterly)
2. **Use strong keys** (min 32 random characters)
3. **Never share secrets** via email/chat
4. **Store in password manager** (1Password, LastPass)
5. **Use Render/Vercel UI** for secrets, not in code
6. **Audit env vars** before each deploy
7. **Use .env.example** for documentation only

---

## 🔗 Related Files

- Backend config: `backend/.env.example`
- Frontend config: `frontend/.env.example`
- Admin config: `frontend-admin/.env.example`
- Deployment guide: `DEPLOYMENT.md`
