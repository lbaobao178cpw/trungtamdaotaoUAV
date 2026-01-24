@echo off
REM Setup Script for Local Development (Windows)

echo 🎯 UAV Training System - Local Setup
echo ====================================
echo.

REM Check if Node.js is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% detected
echo.

REM Copy .env.example files if .env doesn't exist
echo 📋 Setting up environment files...

if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy backend\.env.example backend\.env
        echo ✅ Created backend\.env from .env.example
        echo    ⚠️  Please update backend\.env with your credentials
    )
) else (
    echo ✓ backend\.env already exists
)

if not exist "frontend\.env.local" (
    if exist "frontend\.env.example" (
        copy frontend\.env.example frontend\.env.local
        echo ✅ Created frontend\.env.local
    )
) else (
    echo ✓ frontend\.env.local already exists
)

if not exist "frontend-admin\.env.local" (
    if exist "frontend-admin\.env.example" (
        copy frontend-admin\.env.example frontend-admin\.env.local
        echo ✅ Created frontend-admin\.env.local
    )
) else (
    echo ✓ frontend-admin\.env.local already exists
)

echo.
echo 📦 Installing dependencies...
echo.

REM Install dependencies
call npm run install:all

echo.
echo ✅ Setup Complete!
echo.
echo 🚀 To start development:
echo    npm run dev
echo.
echo 📝 Don't forget to:
echo    1. Update backend\.env with your database credentials
echo    2. Update Cloudinary and Brevo API keys
echo    3. Update JWT secrets (min 32 characters)
echo.
echo 📚 More info: Check DEPLOYMENT.md and ENV_REFERENCE.md
echo.
pause
