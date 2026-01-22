/**
 * Quick diagnostic to check:
 * 1. What exams are in database with what types
 * 2. What level user 40 has
 * 3. Confirm filtering logic
 */

const db = require('./config/db');

async function diagnose() {
    console.log('\n📊 EXAM FILTER DIAGNOSTIC');
    console.log('═'.repeat(50));

    try {
        // Get all exams
        console.log('\n📝 All Exams in Database:');
        console.log('─'.repeat(50));
        const [exams] = await db.query('SELECT id, type, is_active FROM exam_schedules ORDER BY id');
        exams.forEach(e => {
            console.log(`ID ${e.id}: "${e.type}" (active: ${e.is_active})`);
        });

        // Get user 40 level
        console.log('\n👤 User 40 Level:');
        console.log('─'.repeat(50));
        const [users] = await db.query('SELECT id, email, level FROM users WHERE id = 40');
        if (users.length > 0) {
            console.log(`✅ Found:`, users[0]);
        } else {
            console.log(`❌ User 40 not found`);
        }

        // Check what Hạng A exams exist
        console.log('\n🎯 Hạng A Exams (what Tier A should see):');
        console.log('─'.repeat(50));
        const [hangA] = await db.query("SELECT id, type FROM exam_schedules WHERE type LIKE '%Hạng A%' AND is_active = 1");
        console.log(`Found ${hangA.length} Hạng A exams:`, hangA.map(e => e.type));

        // Check what Hạng B exams exist
        console.log('\n🎯 Hạng B Exams (what Tier B should additionally see):');
        console.log('─'.repeat(50));
        const [hangB] = await db.query("SELECT id, type FROM exam_schedules WHERE type LIKE '%Hạng B%' AND is_active = 1");
        console.log(`Found ${hangB.length} Hạng B exams:`, hangB.map(e => e.type));

        console.log('\n' + '═'.repeat(50));
        console.log('✅ Diagnostic complete');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

diagnose();
