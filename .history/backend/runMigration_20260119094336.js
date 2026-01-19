const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'config', 'migrations', '001_create_study_materials.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Create connection using env variables
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    // Execute migration
    await connection.query(sql);
    console.log('✅ Migration completed successfully!');
    console.log('Table study_materials created.');

    await connection.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Table already exists.');
    } else if (error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    process.exit(1);
  }
}

runMigration();
