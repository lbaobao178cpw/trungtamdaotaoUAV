require('dotenv').config();
const db = require('./config/db');

async function updateUserLevel() {
    try {
        console.log("Updating user 40 level to 'Nâng cao'...");

        const [result] = await db.query(
            "UPDATE users SET level = 'Nâng cao' WHERE id = 40"
        );

        console.log("✅ Updated:", result.affectedRows, "rows");

        // Verify
        const [userRows] = await db.query(
            "SELECT id, email, level FROM users WHERE id = 40"
        );
        console.log("📋 User 40 after update:", userRows[0]);

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

updateUserLevel();
