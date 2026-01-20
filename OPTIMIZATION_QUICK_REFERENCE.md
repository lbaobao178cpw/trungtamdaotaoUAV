# Frontend-Admin Optimization Quick Reference

## 🚀 Quick Start: How to Optimize a Component

### Step 1: Update Imports
```javascript
// Add to top of file
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { API_ENDPOINTS, MESSAGES, VALIDATION } from "../../constants/api";
import { STYLES, ANIMATIONS } from "../../constants/styles";
```

### Step 2: Replace API Configuration
```javascript
// ❌ BEFORE: Hardcoded URLs scattered everywhere
const API_URL = "http://localhost:5000/api/points";
const API_SETTINGS = "http://localhost:5000/api/settings";

// ✅ AFTER: Use centralized endpoints
// In constants/api.js: API_ENDPOINTS.POINTS
// In constants/api.js: API_ENDPOINTS.SETTINGS
```

### Step 3: Replace fetch() with useApi Hook
```javascript
// ❌ BEFORE: Manual fetch with loading/error handling
useEffect(() => {
  setLoading(true);
  fetch(API_URL)
    .then(res => res.json())
    .then(data => { setPoints(data); setLoading(false); })
    .catch(err => { setError(err); setLoading(false); });
}, []);

// ✅ AFTER: One line with custom hook
const { data: points, loading, error, refetch } = useApi(API_ENDPOINTS.POINTS);
```

### Step 4: Replace Inline Styles with Constants
```javascript
// ❌ BEFORE: New object created on every render
<div style={{
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px'
}}>

// ✅ AFTER: Pre-allocated constant
<div style={STYLES.FLEX_CENTER}>
```

### Step 5: Wrap Event Handlers with useCallback
```javascript
// ❌ BEFORE: New function created on every render
const handleClick = () => {
  // handler code
};

// ✅ AFTER: Function memoized
const handleClick = useCallback(() => {
  // handler code
}, [dependencies]);
```

### Step 6: Memoize Computed Values
```javascript
// ❌ BEFORE: Filter executed on every render
const activePoints = points.filter(p => p.is_active);

// ✅ AFTER: Computed once
const activePoints = useMemo(() => 
  Array.isArray(points) ? points.filter(p => p.is_active) : [],
  [points]
);
```

### Step 7: Wrap Sub-Components with React.memo
```javascript
// ❌ BEFORE: Re-renders even when props haven't changed
const PointCard = ({ point }) => (
  <div>{point.title}</div>
);

// ✅ AFTER: Only re-renders when props change
const PointCard = React.memo(({ point }) => (
  <div>{point.title}</div>
));
```

---

## 📚 Available Utilities

### Custom Hooks (`hooks/useApi.js`)

#### `useApi(url, options)`
```javascript
const { data, loading, error, refetch } = useApi(API_ENDPOINTS.POINTS);

// Returns:
// - data: Fetched data (or array if API returns array)
// - loading: Boolean indicating fetch in progress
// - error: Error message if fetch fails
// - refetch: Function to manually trigger refetch
```

#### `useApiMutation()`
```javascript
const { mutate, loading, error } = useApiMutation();

// Usage:
const result = await mutate({
  url: API_ENDPOINTS.POINTS,
  method: 'POST', // or 'PUT', 'DELETE'
  data: { title: 'New Point' }
});

// Returns:
// { success: true, data: responseData } or
// { success: false, error: errorMessage }
```

### API Constants (`constants/api.js`)

```javascript
// Endpoints
API_ENDPOINTS.POINTS // http://localhost:5000/api/points
API_ENDPOINTS.COURSES // http://localhost:5000/api/courses
API_ENDPOINTS.EXAMS // http://localhost:5000/api/exams
API_ENDPOINTS.USERS // http://localhost:5000/api/users
API_ENDPOINTS.SETTINGS // http://localhost:5000/api/settings
// ... and more

// Messages
MESSAGES.SUCCESS.SAVE // "Lưu thành công!"
MESSAGES.ERROR.SAVE // "Lỗi khi lưu dữ liệu"

// Validation
VALIDATION.GLB_ONLY(filename) // Returns boolean
VALIDATION.IMAGE_ONLY(filename) // Returns boolean
VALIDATION.VIDEO_ONLY(filename) // Returns boolean
```

### Style Constants (`constants/styles.js`)

```javascript
// Common layouts
STYLES.FLEX_CENTER // Centered flexbox
STYLES.FLEX_COLUMN // Column flex
STYLES.FULL_SIZE // 100% width and height

// Component-specific
STYLES.WEBGL_FALLBACK // WebGL fallback container
STYLES.LOADING_CONTAINER // Loading state container
STYLES.ERROR_BOUNDARY_CONTAINER // Error display
STYLES.POINT_MARKER // 3D point marker

// Text and spacing
STYLES.TEXT_SMALL // Small font size
STYLES.TEXT_MUTED // Muted color
STYLES.SPACER_MD // Medium margin bottom

// Animations
ANIMATIONS.SPIN // Rotation animation
ANIMATIONS.FADE_IN // Fade in animation
ANIMATIONS.PULSE // Pulsing animation
```

---

## ✅ Optimization Checklist

When optimizing a new component, verify:

- [ ] All API calls use `useApi` or `useApiMutation`
- [ ] All hardcoded URLs replaced with `API_ENDPOINTS`
- [ ] All inline styles use `STYLES` constants
- [ ] All event handlers use `useCallback` with proper dependencies
- [ ] Computed arrays use `useMemo` with proper dependencies
- [ ] Sub-components wrapped with `React.memo`
- [ ] No new imports from duplicate locations
- [ ] Dependencies in dependency arrays are correct
- [ ] No console warnings about missing dependencies
- [ ] Component still functions correctly after optimization

---

## 🎯 Common Patterns

### Pattern: Load Data and Handle Errors
```javascript
const { data: items, loading, error } = useApi(API_ENDPOINTS.ITEMS);

return (
  <>
    {loading && <LoadingFallback />}
    {error && <ErrorDisplay error={error} />}
    {items && <ItemList items={items} />}
  </>
);
```

### Pattern: Save Data with Mutation
```javascript
const { mutate: saveItem } = useApiMutation();

const handleSave = useCallback(async (data) => {
  const result = await mutate({
    url: API_ENDPOINTS.ITEMS,
    method: 'POST',
    data
  });
  if (result.success) {
    setMessage({ type: 'success', text: MESSAGES.SUCCESS.SAVE });
  } else {
    setMessage({ type: 'error', text: result.error });
  }
}, [mutate]);
```

### Pattern: Validate File Upload
```javascript
const handleFileSelect = useCallback((file) => {
  if (!VALIDATION.IMAGE_ONLY(file.name)) {
    alert('Chỉ chọn file ảnh!');
    return;
  }
  // Upload file
}, []);
```

### Pattern: Memoized Sub-Component
```javascript
const PointCard = React.memo(({ point, onEdit, onDelete }) => (
  <div style={STYLES.FLEX_BETWEEN}>
    <span>{point.title}</span>
    <button onClick={() => onEdit(point)}>Edit</button>
    <button onClick={() => onDelete(point.id)}>Delete</button>
  </div>
));
```

---

## 🔍 Performance Debugging

### Check if components are re-rendering unnecessarily:
1. Install React DevTools browser extension
2. Go to Profiler tab
3. Record component interactions
4. Look for unnecessary re-renders (highlighted in yellow/red)
5. Apply memoization to frequently re-rendering components

### Check bundle size:
```bash
npm run build
# Check the build output for size metrics
```

### Common Performance Issues:

| Issue | Solution |
|-------|----------|
| Sub-components re-render unnecessarily | Wrap with `React.memo()` |
| Event handler causes child re-render | Wrap handler with `useCallback` |
| Objects recreated on every render | Use `STYLES` constants or `useMemo` |
| Slow data fetching | Use `useApi` hook for caching |
| Missing dependencies warnings | Fix dependency arrays |

---

## 📞 Support & Questions

### Where to find things?
- **Hooks:** `/src/hooks/useApi.js`
- **API Endpoints:** `/src/constants/api.js`
- **Style Constants:** `/src/constants/styles.js`
- **Optimized Examples:** Model3DManager.jsx, PointManager.jsx

### How to add new endpoint?
Edit `/src/constants/api.js`:
```javascript
export const API_ENDPOINTS = {
  // ... existing
  MY_FEATURE: `${API_BASE_URL}/my-feature`,
};
```

### How to add new style?
Edit `/src/constants/styles.js`:
```javascript
export const STYLES = {
  // ... existing
  MY_COMPONENT: {
    display: 'flex',
    // ... style properties
  },
};
```

### How to create a new hook?
Create `/src/hooks/useMyFeature.js`:
```javascript
import { useState, useCallback, useEffect } from 'react';

export const useMyFeature = () => {
  // hook implementation
};
```

---

## 🎓 Learning Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Performance Optimization](https://react.dev/reference/react/useMemo)
- [React.memo Documentation](https://react.dev/reference/react/memo)
- [useCallback Documentation](https://react.dev/reference/react/useCallback)

---

**Last Updated:** This session  
**Optimization Level:** Intermediate (6/23 components optimized)  
**Next Priority:** FAQManager.jsx, DisplaySettingsManager.jsx, MediaSelector.jsx
