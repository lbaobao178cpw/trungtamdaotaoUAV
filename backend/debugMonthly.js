require('dotenv').config();
const db = require('./config/db');

async function debugMonthly() {
    try {
        console.log("=== DEBUG ALL EXAMS ===\n");

        // Check ALL exams 2026
        const [allExams] = await db.query(
            "SELECT id, type, exam_date, is_active FROM exam_schedules WHERE YEAR(exam_date) = 2026 ORDER BY exam_date"
        );

        console.log("📋 All exams in 2026:");
        allExams.forEach(e => {
            const date = new Date(e.exam_date);
            const month = date.getMonth() + 1;
            console.log(`  - ID ${e.id}: ${e.type} | Month: ${month} | Active: ${e.is_active}`);
        });

        // Check only active exams
        const [activeExams] = await db.query(
            "SELECT id, type, exam_date, is_active FROM exam_schedules WHERE YEAR(exam_date) = 2026 AND is_active = 1 ORDER BY exam_date"
        );

        console.log(`\n✅ Total active exams: ${activeExams.length}`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

debugMonthly();
