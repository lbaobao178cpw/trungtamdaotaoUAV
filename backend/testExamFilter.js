const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = 'your-super-secret-key-change-in-production';

// Test 1: Fetch exams WITHOUT token (should show all)
async function testPublicView() {
    console.log('\n🌐 TEST 1: PUBLIC VIEW (No token) ');
    console.log('─'.repeat(50));
    try {
        const response = await axios.get(`${API_BASE}/exams`);
        console.log(`✅ Fetched ${response.data.length} exams`);
        const types = [...new Set(response.data.map(e => e.type))];
        console.log(`📊 Types found:`, types);
    } catch (err) {
        console.error(`❌ Error:`, err.response?.data || err.message);
    }
}

// Test 2: Fetch exams WITH Tier A token (should show only Hạng A)
async function testTierA() {
    console.log('\n🔒 TEST 2: TIER A USER (user_id 40)');
    console.log('─'.repeat(50));
    try {
        const token = jwt.sign({ id: 40 }, JWT_SECRET, { expiresIn: '1h' });
        console.log(`📝 Token created for user_id 40`);

        const response = await axios.get(`${API_BASE}/exams?user_id=40`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ Fetched ${response.data.length} exams`);
        const types = [...new Set(response.data.map(e => e.type))];
        console.log(`📊 Types found:`, types);

        // Verify only Hạng A
        const hasOnlyA = response.data.every(e => e.type.includes('Hạng A'));
        if (hasOnlyA) {
            console.log(`✅ PASS: Only Hạng A exams shown`);
        } else {
            console.log(`❌ FAIL: Found non-Hạng A exams`);
        }
    } catch (err) {
        console.error(`❌ Error:`, err.response?.data || err.message);
    }
}

// Test 3: Fetch exams WITH Tier B token (should show Hạng A & B)
async function testTierB() {
    console.log('\n🔓 TEST 3: TIER B USER (simulated)');
    console.log('─'.repeat(50));
    try {
        // Create a fake user with Tier B level
        const token = jwt.sign({ id: 999 }, JWT_SECRET, { expiresIn: '1h' });
        console.log(`📝 Token created for user_id 999 (Tier B)`);

        const response = await axios.get(`${API_BASE}/exams?user_id=999`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ Fetched ${response.data.length} exams`);
        const types = [...new Set(response.data.map(e => e.type))];
        console.log(`📊 Types found:`, types);
    } catch (err) {
        console.error(`❌ Error:`, err.response?.data || err.message);
    }
}

// Test 4: Fetch with user_id but NO token (should show all)
async function testPublicViewWithUserId() {
    console.log('\n🌐 TEST 4: PUBLIC WITH USER_ID (No token) ');
    console.log('─'.repeat(50));
    try {
        const response = await axios.get(`${API_BASE}/exams?user_id=40`);
        console.log(`✅ Fetched ${response.data.length} exams`);
        const types = [...new Set(response.data.map(e => e.type))];
        console.log(`📊 Types found:`, types);
        console.log(`ℹ️  Note: Should show ALL exams when no token provided`);
    } catch (err) {
        console.error(`❌ Error:`, err.response?.data || err.message);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🧪 EXAM FILTER TEST SUITE');
    console.log('═'.repeat(50));

    await testPublicView();
    await testPublicViewWithUserId();
    await testTierA();
    await testTierB();

    console.log('\n' + '═'.repeat(50));
    console.log('✅ All tests completed!');
}

runAllTests();
