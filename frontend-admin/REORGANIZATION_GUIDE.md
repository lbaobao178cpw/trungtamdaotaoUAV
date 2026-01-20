# Frontend-Admin Restructuring Guide

## New Folder Structure

```
src/
├── components/
│   ├── MainLayout/
│   │   ├── MainLayout.jsx
│   │   └── MainLayout.css
│   ├── ErrorBoundary/
│   │   ├── ErrorBoundary.jsx
│   │   └── ErrorBoundary.css
│   ├── MediaUploader/
│   │   ├── MediaUploader.jsx
│   │   └── MediaUploader.css
│   ├── DisplaySettings/
│   │   ├── index.js (exports all managers)
│   │   ├── DisplaySettingsManager/
│   │   │   ├── DisplaySettingsManager.jsx
│   │   │   └── DisplaySettingsManager.css
│   │   ├── LegalManagement/
│   │   │   ├── LegalManagement.jsx
│   │   │   └── LegalManagement.css
│   │   ├── AuthoritiesManager/
│   │   │   ├── AuthoritiesManager.jsx
│   │   │   └── AuthoritiesManager.css (if needed)
│   │   ├── FormsManager/
│   │   │   ├── FormsManager.jsx
│   │   │   └── FormsManager.css (if needed)
│   │   ├── FAQManager/
│   │   │   ├── FAQManager.jsx
│   │   │   └── FAQManager.css (if needed)
│   │   └── StudyMaterialsManager/
│   │       ├── StudyMaterialsManager.jsx
│   │       └── StudyMaterialsManager.css (if needed)
│   ├── admin/
│   │   ├── Admin/
│   │   │   ├── Admin.jsx
│   │   │   └── Admin.css
│   ├── auth/
│   │   └── (similar structure)
│   ├── course/
│   │   └── (similar structure)
│   ├── exam/
│   │   └── (similar structure)
│   ├── login/
│   │   └── (similar structure)
│   ├── mappicker/
│   │   └── (similar structure)
│   ├── mediaSelector/
│   │   └── (similar structure)
│   ├── Model3D/
│   │   └── (similar structure)
│   ├── points/
│   │   └── (similar structure)
│   ├── pointsPreview/
│   │   └── (similar structure)
│   ├── Solutions/
│   │   └── (similar structure)
│   ├── UIElements/
│   │   └── (similar structure)
│   └── UserManager/
│       └── (similar structure)
├── hooks/
├── lib/
├── App.jsx
├── index.css
└── main.jsx
```

## Benefits

✅ **Better Organization**: Each component has its own folder with CSS
✅ **Easier Maintenance**: Find component files and styles together
✅ **Scalability**: Easy to add new components following the same pattern
✅ **Modularity**: Self-contained components are easier to reuse
✅ **Clear Dependencies**: Component-specific styles stay with their components

## Migration Steps

### Phase 1: Main Components
1. Create `MainLayout/` folder
   - Move `MainLayout.jsx` → `MainLayout/MainLayout.jsx`
   - Create `MainLayout/MainLayout.css` (if needed)

2. Create `ErrorBoundary/` folder
   - Move `ErrorBoundary.jsx` → `ErrorBoundary/ErrorBoundary.jsx`
   - Create `ErrorBoundary/ErrorBoundary.css` (if needed)

3. Create `MediaUploader/` folder
   - Move `MediaUploader.jsx` → `MediaUploader/MediaUploader.jsx`
   - Move `MediaUploader.css` → `MediaUploader/MediaUploader.css`

### Phase 2: DisplaySettings Sub-components
1. Create `DisplaySettings/DisplaySettingsManager/`
   - Move `DisplaySettings/DisplaySettingsManager.jsx` → `DisplaySettings/DisplaySettingsManager/DisplaySettingsManager.jsx`
   - Move `DisplaySettings/DisplaySettingsManager.css` → `DisplaySettings/DisplaySettingsManager/DisplaySettingsManager.css`

2. Create `DisplaySettings/LegalManagement/`
   - Move `DisplaySettings/LegalManagement.jsx` → `DisplaySettings/LegalManagement/LegalManagement.jsx`
   - Move `DisplaySettings/LegalManagement.css` → `DisplaySettings/LegalManagement/LegalManagement.css`

3. Create folders for other managers in DisplaySettings
   - `DisplaySettings/AuthoritiesManager/`
   - `DisplaySettings/FormsManager/`
   - `DisplaySettings/FAQManager/`
   - `DisplaySettings/StudyMaterialsManager/`

4. Create `DisplaySettings/index.js` for exports:
   ```javascript
   export { default as DisplaySettingsManager } from './DisplaySettingsManager/DisplaySettingsManager';
   export { default as LegalManagement } from './LegalManagement/LegalManagement';
   export { default as AuthoritiesManager } from './AuthoritiesManager/AuthoritiesManager';
   export { default as FormsManager } from './FormsManager/FormsManager';
   export { default as FAQManager } from './FAQManager/FAQManager';
   export { default as StudyMaterialsManager } from './StudyMaterialsManager/StudyMaterialsManager';
   ```

### Phase 3: Other Component Folders
Apply the same pattern to:
- `admin/` → `admin/Admin/`
- `auth/` → Organize sub-components similarly
- `course/`, `exam/`, `login/`, etc.

## Import Updates

### Before:
```javascript
import DisplaySettingsManager from './DisplaySettings/DisplaySettingsManager';
import LegalManagement from './DisplaySettings/LegalManagement';
```

### After (Direct Import):
```javascript
import DisplaySettingsManager from './DisplaySettings/DisplaySettingsManager/DisplaySettingsManager';
import LegalManagement from './DisplaySettings/LegalManagement/LegalManagement';
```

### After (Using Index Export - Recommended):
```javascript
import { DisplaySettingsManager, LegalManagement } from './DisplaySettings';
```

## Files Needing Updates

After restructuring, update imports in:
- `App.jsx`
- `admin/Admin.jsx`
- `DisplaySettings/DisplaySettingsManager.jsx` (imports sub-components)
- Any other files importing from moved components

## Notes

- CSS-in-JS styling (inline styles) doesn't need moving
- Keep global styles in `index.css`
- Component-specific styles should go in component folders
- Create `index.js` files in folders containing multiple components for cleaner imports
