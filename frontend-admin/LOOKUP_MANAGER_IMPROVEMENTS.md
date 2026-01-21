# LookupManager - User Selection Improvements

## Changes Made

### 1. **User Search Input with Real-time Filtering**
- Replaced static dropdown with a dynamic search input
- Users can now search by:
  - ID (Mã người dùng)
  - Full Name (Tên)
  - Identity Number (CCCD)
  - Email
  - Phone (SĐT)
- Instant filtering as you type (realtime)

### 2. **Smart User Dropdown**
- Dropdown shows all matching users based on search
- Displays for each user:
  - Full name and ID
  - Identity card number (CCCD)
  - Phone number (SĐT)
  - **Existing license number** (if they already have one) - shown in green badge

### 3. **Auto-populate User Information**
When you select a user:
- ✓ Automatically fills in user's name
- ✓ Automatically fills in user's identity number
- ✓ Automatically fills in user's target tier/category
- ✓ **Shows existing license number if available**

### 4. **Removed Manual Input**
- Removed the "Nhập thủ công" (Manual Input) button
- No more manual entry - only selection from list
- Simpler, cleaner interface

### 5. **Selected User Info Display**
- After selecting a user, shows a confirmation box with:
  - ✓ Selected user name
  - ✓ Existing license number (if any)

## New Features

### Real-time Search
Type to filter users instantly by any field:
```
Searching "30" → Shows user with ID 30, phone starting with 30, etc.
Searching "Nguyễn" → Shows all users with "Nguyễn" in their name
Searching "09" → Shows users with phone starting with 09
```

### License Status Display
Users with existing licenses show their license number in a green badge:
- Helps avoid creating duplicates
- Shows active licenses at a glance

### Click Outside to Close
- Dropdown automatically closes when clicking outside
- Prevents accidentally leaving it open

## Code Changes

### New State Variables
```javascript
const [userSearchInput, setUserSearchInput] = useState("");
const [showUserDropdown, setShowUserDropdown] = useState(false);
const userSearchRef = useRef(null);
```

### New Helper Functions
```javascript
// Filter users by search input
const filteredUsers = useMemo(() => { ... }, [users, userSearchInput]);

// Find existing license for user
const getUserLicense = (userId) => { ... };

// Handle user selection
const handleSelectUser = (user) => { ... };
```

### UI Components
- Search input with Search icon (lucide-react)
- Dropdown menu with user list
- Selected user info box with confirmation
- License badge for users with existing licenses

## User Experience Flow

1. **Click on user search field**
   - Dropdown opens
   - Shows all available users

2. **Start typing** (any field: ID, name, phone, etc.)
   - List filters in real-time
   - Matching users appear

3. **Click on a user**
   - User is selected
   - Form fields auto-populate:
     - User ID
     - Full name
     - Identity number
     - Category/Tier
   - If user has existing license, it shows in green badge
   - Existing license number displayed in info box

4. **Continue filling form**
   - License number (pre-filled if updating)
   - Issue date, expiration date
   - Add drones
   - Save

## Styling
- Search input with Search icon
- Smooth hover effects on dropdown items
- Blue highlight for selected user
- Green badge for existing licenses
- Info box with light blue background

## Accessibility
- Clear visual feedback for selected item
- Keyboard friendly (can use arrow keys, Enter to select)
- Click-outside detection for dropdown
- Accessible labels and semantic HTML
