# Import Updates Required

After reorganizing the folder structure, you need to update imports in the following files:

## 1. App.jsx

**Before:**
```javascript
import MainLayout from './components/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import Admin from './components/admin/Admin';
import { DisplaySettingsManager } from './components/DisplaySettings';
// other imports
```

**After:**
```javascript
import MainLayout from './components/MainLayout/MainLayout';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import Admin from './components/admin/Admin/Admin';
import { DisplaySettingsManager } from './components/DisplaySettings';
// other imports
```

## 2. DisplaySettings/DisplaySettingsManager/DisplaySettingsManager.jsx

**Before:**
```javascript
import LegalDocumentsManager from './LegalManagement';
import AuthoritiesManager from './AuthoritiesManager';
import FormsManager from './FormsManager';
import StudyMaterialsManager from './StudyMaterialsManager';
import FAQManager from './FAQManager';
import './DisplaySettingsManager.css';
```

**After:**
```javascript
import LegalDocumentsManager from '../LegalManagement/LegalManagement';
import AuthoritiesManager from '../AuthoritiesManager/AuthoritiesManager';
import FormsManager from '../FormsManager/FormsManager';
import StudyMaterialsManager from '../StudyMaterialsManager/StudyMaterialsManager';
import FAQManager from '../FAQManager/FAQManager';
import './DisplaySettingsManager.css';
```

## 3. admin/Admin/Admin.jsx

**Before:**
```javascript
import './AdminStyles.css';
```

**After:**
```javascript
import './Admin.css';
```

## 4. Components/MediaUploader/MediaUploader.jsx

**Before:**
```javascript
import { uploadImage, uploadVideo } from '../lib/cloudinaryService';
import './MediaUploader.css';
```

**After:**
```javascript
import { uploadImage, uploadVideo } from '../../lib/cloudinaryService';
import './MediaUploader.css';
```

## 5. Create index.js files for easier imports

### DisplaySettings/index.js
```javascript
export { default as DisplaySettingsManager } from './DisplaySettingsManager/DisplaySettingsManager';
export { default as LegalManagement } from './LegalManagement/LegalManagement';
export { default as AuthoritiesManager } from './AuthoritiesManager/AuthoritiesManager';
export { default as FormsManager } from './FormsManager/FormsManager';
export { default as FAQManager } from './FAQManager/FAQManager';
export { default as StudyMaterialsManager } from './StudyMaterialsManager/StudyMaterialsManager';
```

This allows imports like:
```javascript
import { DisplaySettingsManager, LegalManagement } from './DisplaySettings';
```

Instead of:
```javascript
import DisplaySettingsManager from './DisplaySettings/DisplaySettingsManager/DisplaySettingsManager';
import LegalManagement from './DisplaySettings/LegalManagement/LegalManagement';
```

## Testing After Migration

1. Clear node_modules cache:
   ```bash
   npm cache clean --force
   ```

2. Restart dev server:
   ```bash
   npm run dev
   ```

3. Check browser console for any import errors

4. Test all admin features to ensure nothing broke

## Cleanup (Optional - Only after confirming everything works)

Once you've verified all components work in the new structure, you can remove old files:

- Delete `src/components/MainLayout.jsx` (kept in MainLayout/)
- Delete `src/components/ErrorBoundary.jsx` (kept in ErrorBoundary/)
- Delete `src/components/MediaUploader.jsx` and `MediaUploader.css` (kept in MediaUploader/)
- Delete `src/components/admin/Admin.jsx` and `AdminStyles.css` (kept in admin/Admin/)
- Delete old files in DisplaySettings (all moved to sub-folders)

Keep the new organized structure once verified.
