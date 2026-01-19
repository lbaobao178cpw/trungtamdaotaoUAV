const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'uav_training',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function fixStatusColumn() {
  try {
    // Check current column type
    console.log("Checking legal_documents table structure...");
    const [rows] = await pool.execute(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'legal_documents' AND TABLE_SCHEMA = DATABASE()"
    );

    const statusColumn = rows.find(r => r.COLUMN_NAME === 'status');
    if (statusColumn) {
      console.log("Current status column:", statusColumn);
    }

    // Try to change column type to VARCHAR(20) with ENUM values
    console.log("\nAttempting to modify status column...");
    
    // First, try to see what values are currently in the table
    const [currentValues] = await pool.execute(
      "SELECT DISTINCT status FROM legal_documents"
    );
    console.log("Current status values in database:", currentValues);

    // Modify the column to be VARCHAR(20) instead of ENUM if needed
    await pool.execute(
      `ALTER TABLE legal_documents 
       MODIFY COLUMN status VARCHAR(20) 
       DEFAULT 'active' 
       NOT NULL`
    );

    console.log("✓ Successfully modified status column to VARCHAR(20)");

    // Add check constraint to ensure valid values
    try {
      await pool.execute(
        `ALTER TABLE legal_documents 
         ADD CONSTRAINT check_status 
         CHECK (status IN ('active', 'expired', 'amended', 'draft'))`
      );
      console.log("✓ Added CHECK constraint for status values");
    } catch (err) {
      if (err.message.includes('Duplicate key name')) {
        console.log("✓ CHECK constraint already exists");
      } else {
        console.log("! Could not add CHECK constraint:", err.message);
      }
    }

    console.log("\nDone! Status column is now fixed.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

fixStatusColumn();
