// Script chạy migration thêm cột level vào users table
const db = require('./config/db');

async function runMigration() {
    try {
        console.log("🚀 Bắt đầu migration: Thêm cột level vào users table...");

        // Kiểm tra xem cột level đã tồn tại chưa
        const [existingColumn] = await db.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'level'
    `);

        if (existingColumn.length > 0) {
            console.log("✅ Cột level đã tồn tại. Bỏ qua...");
            process.exit(0);
        }

        // Thêm cột level vào users table
        console.log("⏳ Thêm cột level...");
        await db.query(`
      ALTER TABLE users ADD COLUMN level VARCHAR(50) DEFAULT 'Cơ bản' COMMENT 'Cấp độ người dùng: Cơ bản hoặc Nâng cao'
    `);
        console.log("✅ Thêm cột level thành công!");

        // Cập nhật level dựa trên certificates
        console.log("⏳ Cập nhật level cho users có chứng chỉ...");
        const [result] = await db.query(`
      UPDATE users u
      SET u.level = 'Nâng cao'
      WHERE u.id IN (
        SELECT DISTINCT user_id FROM certificates 
        WHERE user_id IS NOT NULL
      )
    `);
        console.log(`✅ Cập nhật ${result.affectedRows} users`);

        console.log("🎉 Migration hoàn thành!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Lỗi migration:", error.message);
        process.exit(1);
    }
}

runMigration();
