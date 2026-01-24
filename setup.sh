#!/bin/bash

# 🚀 Setup Script for Local Development

echo "🎯 UAV Training System - Local Setup"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Copy .env.example files if .env doesn't exist
echo "📋 Setting up environment files..."

if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo "✅ Created backend/.env from .env.example"
        echo "   ⚠️  Please update backend/.env with your credentials"
    fi
else
    echo "✓ backend/.env already exists"
fi

if [ ! -f "frontend/.env.local" ]; then
    if [ -f "frontend/.env.example" ]; then
        cp frontend/.env.example frontend/.env.local
        echo "✅ Created frontend/.env.local"
    fi
else
    echo "✓ frontend/.env.local already exists"
fi

if [ ! -f "frontend-admin/.env.local" ]; then
    if [ -f "frontend-admin/.env.example" ]; then
        cp frontend-admin/.env.example frontend-admin/.env.local
        echo "✅ Created frontend-admin/.env.local"
    fi
else
    echo "✓ frontend-admin/.env.local already exists"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install dependencies
npm run install:all

echo ""
echo "✅ Setup Complete!"
echo ""
echo "🚀 To start development:"
echo "   npm run dev"
echo ""
echo "📝 Don't forget to:"
echo "   1. Update backend/.env with your database credentials"
echo "   2. Update Cloudinary and Brevo API keys"
echo "   3. Update JWT secrets (min 32 characters)"
echo ""
echo "📚 More info: Check DEPLOYMENT.md and ENV_REFERENCE.md"
