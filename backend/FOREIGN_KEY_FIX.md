# Foreign Key Constraint Fix for License + Drone Management

## Problem
When creating or updating a license with drone devices, the API failed with:
```
ER_NO_REFERENCED_ROW_2: Cannot add or update a child row: a foreign key constraint fails 
("uav_db"."drone_devices", CONSTRAINT "fk_drone_license" FOREIGN KEY 
("license_number_ref") REFERENCES "user_profiles" ("license_number") 
ON DELETE CASCADE ON UPDATE CASCADE)
```

### Root Cause
The database foreign key constraint on `drone_devices.license_number_ref` references `user_profiles.license_number`. The original code tried to use `ON DUPLICATE KEY UPDATE` (MySQL UPSERT) to ensure the license_number exists in user_profiles, but this only works if `license_number` is a UNIQUE key. 

Since the table structure isn't guaranteed to have this constraint, the UPSERT wasn't creating/updating the license_number row properly before attempting to insert drones.

## Solution
Changed from MySQL UPSERT to explicit INSERT-OR-UPDATE logic:

### Before (Broken)
```javascript
await db.query(
  `INSERT INTO user_profiles (license_number, user_id, identity_number, target_tier)
   VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE
     user_id = COALESCE(user_id, VALUES(user_id)),
     ...`,
  [licenseNumber, finalUserId, idNumber, tierValue]
);
```

### After (Fixed)
```javascript
const [existing] = await db.query(
  "SELECT id FROM user_profiles WHERE license_number = ?",
  [licenseNumber]
);

if (existing.length > 0) {
  // Update existing row
  await db.query(
    `UPDATE user_profiles SET 
       user_id = COALESCE(?, user_id),
       identity_number = COALESCE(?, identity_number),
       target_tier = COALESCE(?, target_tier)
     WHERE license_number = ?`,
    [finalUserId, idNumber, tierValue, licenseNumber]
  );
} else {
  // Insert new row
  await db.query(
    `INSERT INTO user_profiles (license_number, user_id, identity_number, target_tier)
     VALUES (?, ?, ?, ?)`,
    [licenseNumber, finalUserId, idNumber, tierValue]
  );
}
```

## Changes Made

### 1. POST /api/licenses (Create License)
- **Line ~515-545**: Replaced UPSERT with explicit INSERT-OR-UPDATE logic
- **Line ~560-585**: Added try-catch error handling for drone insertion
- **Line ~595-610**: Enhanced error messages in catch block

### 2. PUT /api/licenses/:licenseNumber (Update License)
- **Line ~685-710**: Replaced UPSERT with explicit INSERT-OR-UPDATE logic
- **Line ~755-780**: Added try-catch error handling for drone insertion
- **Line ~785-810**: Enhanced error messages in catch block

### 3. Error Handling Improvements
Added specific error messages for:
- `ER_DUP_ENTRY` - Duplicate license number
- `ER_NO_REFERENCED_ROW_2` - Missing referenced user/license
- Generic drone insertion errors with drill-down info

## Testing Steps

### Test Case 1: Create New License with Drones
```bash
curl -X POST http://localhost:5000/api/licenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{
    "licenseNumber": "DC-2025-0013",
    "category": "Hạng B",
    "name": "Test User",
    "idNumber": "123456789",
    "issueDate": "2025-01-20",
    "expireDate": "2026-01-20",
    "status": "active",
    "drones": [
      {
        "model": "DJI Mini 3",
        "serial": "SN12345678",
        "weight": "249g",
        "status": "active"
      }
    ]
  }'
```

### Test Case 2: Update License with New Drones
```bash
curl -X PUT http://localhost:5000/api/licenses/DC-2025-0012 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{
    "category": "Hạng A",
    "issueDate": "2025-01-20",
    "expireDate": "2026-01-20",
    "drones": [
      {
        "model": "DJI Mavic 3",
        "serial": "SN87654321",
        "weight": "895g",
        "status": "active"
      }
    ]
  }'
```

## Database Verification

To verify the fix is working, check:

1. **user_profiles table has the license_number entry:**
```sql
SELECT * FROM user_profiles WHERE license_number = 'DC-2025-0013';
```

2. **drone_devices correctly references the license:**
```sql
SELECT * FROM drone_devices WHERE license_number_ref = 'DC-2025-0013';
```

3. **Foreign key relationship is intact:**
```sql
SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'drone_devices' AND CONSTRAINT_SCHEMA = 'uav_db';
```

## Expected Behavior After Fix

✅ Creating a new license with drones should:
1. Create/update user_profiles entry with license_number
2. Create drone_licenses entry
3. Insert all drone_devices entries with correct license_number_ref
4. Return success message with license number

✅ Updating a license with drones should:
1. Update/create user_profiles entry
2. Update drone_licenses entry
3. Delete old drones and insert new ones
4. Return success message

❌ Errors should now be more descriptive:
- "Số giấy phép này đã tồn tại" - Duplicate license
- "Lỗi: Người dùng hoặc giấy phép được tham chiếu không tồn tại. Vui lòng thử lại." - Missing references
- "Lỗi khi thêm thiết bị [serial]: [details]" - Specific drone insertion errors
