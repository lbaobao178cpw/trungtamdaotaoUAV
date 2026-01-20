require('dotenv').config();
const mysql = require('mysql2/promise');

async function verify() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    const [rows] = await conn.query('SHOW TABLES LIKE "study_materials"');
    if (rows.length) {
        

        // Also check structure
        const [columns] = await conn.query('DESCRIBE study_materials');
        
        columns.forEach(col => {
            
        });
    } else {
        
    }

    await conn.end();
}

verify().catch(console.error);
