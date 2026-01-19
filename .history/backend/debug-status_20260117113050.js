const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

async function debugStatusColumn() {
    try {
        console.log("=== DEBUG: Checking legal_documents table structure ===\n");

        // Get table structure
        const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'legal_documents' 
      AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);

        console.log("Table Structure:");
        columns.forEach(col => {
            console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} DEFAULT ${col.COLUMN_DEFAULT}`);
        });

        // Focus on status column
        const statusCol = columns.find(c => c.COLUMN_NAME === 'status');
        if (statusCol) {
            console.log("\n=== STATUS COLUMN DETAILS ===");
            console.log(`Type: ${statusCol.COLUMN_TYPE}`);
            console.log(`Nullable: ${statusCol.IS_NULLABLE}`);
            console.log(`Default: ${statusCol.COLUMN_DEFAULT}`);
        }

        // Check current status values
        const [values] = await pool.execute(`
      SELECT DISTINCT status, LENGTH(status) as status_length 
      FROM legal_documents 
      LIMIT 20
    `);

        console.log("\n=== CURRENT STATUS VALUES IN DATABASE ===");
        values.forEach(row => {
            console.log(`  Status: "${row.status}" (length: ${row.status_length})`);
        });

        // Try to alter column if it's too small
        if (statusCol && (statusCol.COLUMN_TYPE === 'CHAR(1)' || statusCol.COLUMN_TYPE === 'VARCHAR(5)')) {
            console.log("\n⚠️  STATUS COLUMN IS TOO SMALL! Modifying...");

            await pool.execute(`
        ALTER TABLE legal_documents 
        MODIFY COLUMN status VARCHAR(20) 
        DEFAULT 'active' 
        NOT NULL
      `);

            console.log("✅ Successfully modified status column to VARCHAR(20)");
        }

        pool.end();
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        pool.end();
        process.exit(1);
    }
}

debugStatusColumn();
