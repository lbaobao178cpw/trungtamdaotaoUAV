const db = require('./db');

const addFaqCategory = async () => {
    try {
        

        // Kiểm tra xem cột đã tồn tại chưa
        const [columns] = await db.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='faqs' AND COLUMN_NAME='category'"
        );

        if (columns.length === 0) {
            await db.execute(`
        ALTER TABLE faqs 
        ADD COLUMN category VARCHAR(50) DEFAULT 'general' COMMENT 'Danh mục: general, exam, course, certificate, etc'
      `);
            
        } else {
            
        }

        await db.end();
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    }
};

addFaqCategory();
