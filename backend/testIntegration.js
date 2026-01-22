/**
 * INTEGRATION TEST: Simulates complete frontend->backend flow
 * This mimics exactly what happens when:
 * 1. User logs in (token saved to localStorage)
 * 2. User navigates to ExamPage
 * 3. ExamPage fetches exams with token and user_id
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = 'your-super-secret-key-change-in-production';

// Simulate the apiInterceptor behavior
const apiClient = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
});

// Request interceptor: Add Authorization header if token exists
apiClient.interceptors.request.use((config) => {
    // Simulate reading from localStorage
    const token = localStorageSimulation.getItem('user_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log(`📤 [CLIENT] Adding Authorization header with token`);
    }
    return config;
});

// Mock localStorage
const localStorageSimulation = (() => {
    const store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value; },
        removeItem: (key) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    };
})();

// Simulate login flow
async function simulateLogin() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║               SIMULATING USER LOGIN & EXAM FETCH               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    // Step 1: User logs in (in real app, this comes from /auth/login)
    console.log('\n📝 Step 1: User logs in');
    console.log('─'.repeat(50));

    const userId = 40;
    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
    const userObj = { id: userId, email: 'trangiahuy04092018@gmail.com' };

    // Simulate saving to localStorage
    localStorageSimulation.setItem('user_token', token);
    localStorageSimulation.setItem('user', JSON.stringify(userObj));

    console.log(`✅ User logged in with ID: ${userId}`);
    console.log(`🔐 Token stored in localStorage (expires in 1h)`);
    console.log(`👤 User data stored: ${JSON.stringify(userObj)}`);

    // Step 2: User navigates to ExamPage
    console.log('\n📱 Step 2: User navigates to ExamPage');
    console.log('─'.repeat(50));

    const storedUser = localStorageSimulation.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    console.log(`📖 ExamPage reads user from localStorage: ${user ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`👤 User object: ${JSON.stringify(user)}`);

    // Step 3: ExamPage fetches exams
    console.log('\n🔄 Step 3: ExamPage fetches exams');
    console.log('─'.repeat(50));

    try {
        let examEndpoint = "/exams";
        if (user) {
            examEndpoint = `/exams?user_id=${user.id}`;
            console.log(`🔗 Endpoint with user_id: ${examEndpoint}`);
        }

        console.log(`📤 Sending GET request to ${examEndpoint}`);
        const examResponse = await apiClient.get(examEndpoint);
        const exams = examResponse.data;

        console.log(`\n✅ Response received:`);
        console.log(`📊 Total exams: ${exams.length}`);

        const types = [...new Set(exams.map(e => e.type))];
        console.log(`📋 Exam types: ${types.join(', ')}`);

        // Show which exams were returned
        exams.forEach((exam, idx) => {
            console.log(`   ${idx + 1}. ${exam.type} (ID: ${exam.id})`);
        });

        // Verify filtering
        console.log('\n🧪 Verification:');
        console.log('─'.repeat(50));

        const hasHangB = exams.some(e => e.type.includes('Hạng B'));
        const hasHangA = exams.some(e => e.type.includes('Hạng A'));

        if (!hasHangB && hasHangA && exams.length === 4) {
            console.log(`✅ CORRECT: Tier A user sees ONLY 4 Hạng A exams (no Hạng B)`);
        } else if (hasHangB && hasHangA && exams.length === 5) {
            console.log(`⚠️  All exams shown (public view?) - Check if token was sent properly`);
        } else {
            console.log(`❓ Unexpected result: ${exams.length} exams, has Hạng A: ${hasHangA}, has Hạng B: ${hasHangB}`);
        }

    } catch (error) {
        console.error(`❌ Error fetching exams:`, error.response?.data || error.message);
    }

    // Step 4: Test logout
    console.log('\n🚪 Step 4: User logs out');
    console.log('─'.repeat(50));

    localStorageSimulation.removeItem('user_token');
    localStorageSimulation.removeItem('user');

    console.log(`✅ Token and user data removed from localStorage`);

    // Test that public view shows all exams
    try {
        console.log(`\n📤 Sending GET request to /exams (public view)`);
        const publicResponse = await apiClient.get("/exams");
        console.log(`✅ Response: ${publicResponse.data.length} exams (should be all 5)`);

        const types = [...new Set(publicResponse.data.map(e => e.type))];
        console.log(`📋 Exam types: ${types.join(', ')}`);

    } catch (error) {
        console.error(`❌ Error:`, error.message);
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Integration test completed!');
    console.log('═'.repeat(50) + '\n');
}

simulateLogin().catch(console.error).finally(() => process.exit(0));
