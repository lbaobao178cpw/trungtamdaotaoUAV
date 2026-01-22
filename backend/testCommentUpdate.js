require('dotenv').config();
const db = require('./config/db');

async function testCommentUpdate() {
    try {
        console.log("Testing comment update...");

        const id = 39;
        const user_id = 40;
        const content = "test content updated";

        // Get comment
        const [comments] = await db.query(
            "SELECT user_id FROM comments WHERE id = ?",
            [id]
        );

        console.log("Comments found:", comments.length);

        if (comments.length === 0) {
            console.log("Comment not found");
            process.exit(0);
        }

        console.log("Comment user_id:", comments[0].user_id, "Req user_id:", user_id);

        if (comments[0].user_id !== user_id) {
            console.log("No permission");
            process.exit(0);
        }

        // Update without rating
        const result = await db.query(
            "UPDATE comments SET content = ? WHERE id = ?",
            [content, id]
        );

        console.log("Update result:", result);
        console.log("✅ Update successful!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

testCommentUpdate();
