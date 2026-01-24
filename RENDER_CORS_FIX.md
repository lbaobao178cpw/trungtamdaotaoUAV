# 🚨 URGENT: Fix CORS Error on Render Backend

## Error Message
```
⚠️ Blocked CORS from origin: https://testdeploye.vercel.app
Error: CORS not allowed
```

## Root Cause
**Environment variables `CORS_ORIGINS` không được set trên Render Dashboard!**

Backend đang chạy nhưng không biết domain Vercel nào được phép kết nối.

## ✅ Solution: Set Environment Variables on Render

### Step 1: Go to Render Dashboard
1. Open https://dashboard.render.com
2. Select your **backend project** (uav-test)

### Step 2: Add Environment Variables

**Click**: Settings → Environment

**Add these 2 variables:**

| Variable Name | Value |
|---|---|
| `FRONTEND_URL` | `https://testdeploye.vercel.app` |
| `CORS_ORIGINS` | `https://testdeploye.vercel.app,http://localhost:5173,http://localhost:5174,http://localhost:3000` |

### Step 3: Save & Wait for Redeploy

1. Click **Save** button
2. Render will automatically redeploy the backend
3. ⏳ Wait 3-5 minutes for the service to restart
4. Check the **Events** tab to see deployment progress

### Step 4: Verify in Logs

Go to **Logs** tab and look for:
```
✅ Allowed Origins: [ 'https://testdeploye.vercel.app', ... ]
```

If you see this, CORS is fixed! ✅

## Result After Fix

Frontend can now:
- ✅ Call APIs from `https://testdeploye.vercel.app`
- ✅ Receive data without CORS errors
- ✅ Display courses, exams, etc. normally

---

**Note**: The local `.env` file won't be pushed to Render because it's in `.gitignore`. You MUST set these variables directly on the Render Dashboard!
