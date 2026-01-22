require('dotenv').config();
const db = require('./config/db');

async function debugExams() {
    try {
        console.log("=== DEBUG EXAMS ===\n");

        // Check user 40 level
        const [userRows] = await db.query(
            "SELECT id, email, level FROM users WHERE id = 40"
        );
        console.log("👤 User 40:", userRows[0]);

        // Check all exam types
        const [exams] = await db.query(
            "SELECT id, type, exam_date FROM exam_schedules ORDER BY exam_date"
        );
        console.log("\n📋 All exams:");
        exams.forEach(e => console.log(`  - ID ${e.id}: ${e.type} (${e.exam_date})`));

        // Simulate backend filter for user 40
        const userLevel = userRows[0].level;
        console.log(`\n🔍 User level: "${userLevel}"`);

        if (userLevel === "Cơ bản") {
            console.log("✅ Should see: Hạng A only");
            const [filtered] = await db.query(
                "SELECT id, type FROM exam_schedules WHERE type LIKE '%Hạng A%' ORDER BY exam_date"
            );
            console.log(`Found ${filtered.length} exams:`);
            filtered.forEach(e => console.log(`  - ${e.type}`));
        } else if (userLevel === "Nâng cao") {
            console.log("✅ Should see: Hạng A & B");
            const [filtered] = await db.query(
                "SELECT id, type FROM exam_schedules WHERE type LIKE '%Hạng A%' OR type LIKE '%Hạng B%' ORDER BY exam_date"
            );
            console.log(`Found ${filtered.length} exams:`);
            filtered.forEach(e => console.log(`  - ${e.type}`));
        } else {
            console.log(`⚠️ Unknown level: "${userLevel}"`);
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

debugExams();
