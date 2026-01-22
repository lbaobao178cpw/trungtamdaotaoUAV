const fetch = require('node-fetch');

async function testPut() {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NDAsInVzZXJuYW1lIjoiaGF5aDAyIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3Mzc1NTAwMjcsImV4cCI6MTczODI3NjAyN30.d45g0A0h4OhE9mUgN1nR7V6vSpS2WqKFxyO1HrTyDPo";

    try {
        const res = await fetch('http://localhost:5000/api/comments/39', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: 'updated test comment' })
        });

        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Error:", error.message);
    }
    process.exit(0);
}

testPut();
