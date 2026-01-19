const db = require('./db');

async function addDisplayNameColumn() {
    try {
        console.log('🔧 Checking study_materials.display_name column...');
        
        // Check if column exists
        const [columns] = await db.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'study_materials' 
             AND COLUMN_NAME = 'display_name'`
        );

        if (columns.length === 0) {
            console.log('➕ Adding display_name column to study_materials...');
            await db.query(
                `ALTER TABLE study_materials ADD COLUMN display_name varchar(255) AFTER file_type`
            );
            console.log('✅ display_name column added successfully');
        } else {
            console.log('ℹ️  display_name column already exists');
        }
    } catch (err) {
        console.error('❌ Error adding display_name column:', err.message);
    }
}

// Run the migration
addDisplayNameColumn().then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
}).catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
