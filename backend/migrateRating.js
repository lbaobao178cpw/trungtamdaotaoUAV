require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        const sql = `ALTER TABLE comments MODIFY COLUMN rating INT NULL DEFAULT NULL`;
        await connection.query(sql);
        console.log("✅ Migration completed: rating column is now nullable");
    } catch (error) {
        console.error("❌ Migration failed:", error.message);
    } finally {
        await connection.end();
    }
}

runMigration();
