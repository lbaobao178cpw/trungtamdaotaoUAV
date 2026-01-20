#!/bin/bash
# Frontend-Admin Reorganization Script
# Run this script to automatically reorganize the folder structure

echo "🚀 Starting Frontend-Admin Reorganization..."

# Create main component directories if they don't exist
mkdir -p "src/components/MainLayout"
mkdir -p "src/components/ErrorBoundary"
mkdir -p "src/components/MediaUploader"
mkdir -p "src/components/admin/Admin"

mkdir -p "src/components/DisplaySettings/DisplaySettingsManager"
mkdir -p "src/components/DisplaySettings/LegalManagement"
mkdir -p "src/components/DisplaySettings/AuthoritiesManager"
mkdir -p "src/components/DisplaySettings/FormsManager"
mkdir -p "src/components/DisplaySettings/FAQManager"
mkdir -p "src/components/DisplaySettings/StudyMaterialsManager"

echo "✅ Created directory structure"

# Copy files (these commands assume you're in the project root)
echo "📋 Copying files..."

# Main components
cp src/components/MainLayout.jsx src/components/MainLayout/
cp src/components/ErrorBoundary.jsx src/components/ErrorBoundary/
cp src/components/MediaUploader.jsx src/components/MediaUploader/
cp src/components/MediaUploader.css src/components/MediaUploader/

# Admin components
cp src/components/admin/Admin.jsx src/components/admin/Admin/
cp src/components/admin/AdminStyles.css src/components/admin/Admin/Admin.css

# DisplaySettings components
cp src/components/DisplaySettings/DisplaySettingsManager.jsx src/components/DisplaySettings/DisplaySettingsManager/
cp src/components/DisplaySettings/DisplaySettingsManager.css src/components/DisplaySettings/DisplaySettingsManager/
cp src/components/DisplaySettings/LegalManagement.jsx src/components/DisplaySettings/LegalManagement/
cp src/components/DisplaySettings/LegalManagement.css src/components/DisplaySettings/LegalManagement/
cp src/components/DisplaySettings/AuthoritiesManager.jsx src/components/DisplaySettings/AuthoritiesManager/
cp src/components/DisplaySettings/FormsManager.jsx src/components/DisplaySettings/FormsManager/
cp src/components/DisplaySettings/FAQManager.jsx src/components/DisplaySettings/FAQManager/
cp src/components/DisplaySettings/StudyMaterialsManager.jsx src/components/DisplaySettings/StudyMaterialsManager/

echo "✅ Files copied successfully"

echo "⚠️  Next steps:"
echo "1. Update import paths in all component files"
echo "2. Update imports in App.jsx"
echo "3. Test that everything still works"
echo "4. Delete old files from flat structure once confirmed working"

echo "✨ Done!"
