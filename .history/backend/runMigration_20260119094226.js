const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'config', 'migrations', '001_create_study_materials.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Create connection
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'uav_db'
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
