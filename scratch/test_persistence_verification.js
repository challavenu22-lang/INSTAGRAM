import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config({ path: 'backend/.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import backend services
const { authService } = await import('../backend/src/services/authService.js');
const { historyService } = await import('../backend/src/services/historyService.js');
const { settingsService } = await import('../backend/src/services/settingsService.js');
const { persistentAccountService } = await import('../backend/src/services/persistentAccountService.js');
const { authenticateUser } = await import('../backend/src/middleware/auth.js');
const prisma = (await import('../backend/src/config/db.js')).default;

console.log('====================================================');
console.log('STARTING BACKEND PERSISTENCE & MULTI-DEVICE TEST SUITE');
console.log('====================================================\n');

async function runTests() {
  try {
    const timestamp = Date.now();
    const emailShared = `shared_user_${timestamp}@example.com`;

    const user1Id = `user_a_${timestamp}`;
    const user1Pass = `PasswordA123!`;
    const user1Name = `User Account A`;

    const user2Id = `user_b_${timestamp}`;
    const user2Pass = `PasswordB123!`;
    const user2Name = `User Account B`;

    // ----------------------------------------------------
    // TEST 1: Register Account A & Login -> Logout -> Login
    // ----------------------------------------------------
    console.log('[TEST 1] Register Account A -> Login -> Logout -> Login again');
    const regResA = await authService.register(user1Name, user1Id, emailShared, user1Pass);
    console.log('  -> Registration Account A:', regResA.message, '| User ID:', regResA.user?.username, '| ID:', regResA.user?.id);

    const loginResA1 = await authService.login(user1Id, user1Pass);
    console.log('  -> Login 1 Account A:', loginResA1.user ? 'SUCCESS' : 'FAILED', '| Token generated:', !!loginResA1.token);

    await authService.logout(loginResA1.token);
    console.log('  -> Logout Account A: SUCCESS');

    const loginResA2 = await authService.login(user1Id, user1Pass);
    console.log('  -> Login 2 Account A:', loginResA2.user ? 'SUCCESS' : 'FAILED');
    if (!loginResA2.user) throw new Error('TEST 1 FAILED');
    console.log('  [PASS] TEST 1 SUCCESSFUL\n');

    // ----------------------------------------------------
    // TEST 2: Simulate Cold Boot (Wipe Local SQLite) & Re-login
    // ----------------------------------------------------
    console.log('[TEST 2] Cold Restart (Simulate Fresh Container / Wiped Local DB) -> Login');
    // Delete local user record from SQLite to simulate cold boot
    await prisma.session.deleteMany({ where: { userId: regResA.user.id } });
    await prisma.user.deleteMany({ where: { id: regResA.user.id } });
    console.log('  -> Local SQLite database wiped for User A');

    const loginResA3 = await authService.login(user1Id, user1Pass);
    console.log('  -> Login Account A after cold boot:', loginResA3.user ? 'SUCCESS' : 'FAILED');
    if (!loginResA3.user || loginResA3.user.id !== regResA.user.id) throw new Error('TEST 2 FAILED');
    console.log('  [PASS] TEST 2 SUCCESSFUL\n');

    // ----------------------------------------------------
    // TEST 3: Multi-device Session Validation
    // ----------------------------------------------------
    console.log('[TEST 3] Multi-Device Token Authorization Validation');
    const deviceAToken = loginResA3.token;
    
    // Simulate Request on Device B (fresh lambda without local session cache)
    await prisma.session.deleteMany({ where: { userId: regResA.user.id } });
    
    const mockReq = { headers: { authorization: `Bearer ${deviceAToken}` } };
    let authPassed = false;
    const mockRes = {
      status: (code) => ({ json: (data) => console.log('  -> Device B Auth Status:', code, data) })
    };
    const mockNext = (err) => {
      if (!err && mockReq.user && mockReq.user.id === regResA.user.id) {
        authPassed = true;
      }
    };

    await authenticateUser(mockReq, mockRes, mockNext);
    console.log('  -> Device B Session Validation:', authPassed ? 'SUCCESS' : 'FAILED');
    if (!authPassed) throw new Error('TEST 3 FAILED');
    console.log('  [PASS] TEST 3 SUCCESSFUL\n');

    // ----------------------------------------------------
    // TEST 4: Multiple Accounts with SAME Email
    // ----------------------------------------------------
    console.log('[TEST 4] Register Account B with SAME Email Address as Account A');
    const regResB = await authService.register(user2Name, user2Id, emailShared, user2Pass);
    console.log('  -> Registration Account B with shared email:', regResB.message, '| User ID:', regResB.user?.username);

    // Login with Account A User ID
    const loginA = await authService.login(user1Id, user1Pass);
    console.log('  -> Login Account A (shared email):', loginA.user?.username === user1Id ? 'SUCCESS' : 'FAILED');

    // Login with Account B User ID
    const loginB = await authService.login(user2Id, user2Pass);
    console.log('  -> Login Account B (shared email):', loginB.user?.username === user2Id ? 'SUCCESS' : 'FAILED');

    if (loginA.user.id === loginB.user.id) throw new Error('Accounts overwritten! TEST 4 FAILED');
    console.log('  [PASS] TEST 4 SUCCESSFUL\n');

    // ----------------------------------------------------
    // TEST 5: Download History Scoping & Persistence
    // ----------------------------------------------------
    console.log('[TEST 5] Download History Isolation & Persistent Cloud Sync');
    const histA = await historyService.createHistoryItem(regResA.user.id, {
      sourceUrl: 'https://www.instagram.com/reel/C1A2B3/',
      title: 'Account A Video 1',
      status: 'COMPLETED'
    });
    console.log('  -> Added History item for Account A:', histA.title);

    const histB = await historyService.createHistoryItem(regResB.user.id, {
      sourceUrl: 'https://www.instagram.com/reel/C4D5E6/',
      title: 'Account B Video 1',
      status: 'COMPLETED'
    });
    console.log('  -> Added History item for Account B:', histB.title);

    // Wipe local history table to simulate fresh container / device restart
    await prisma.downloadHistory.deleteMany({});
    console.log('  -> Local SQLite download history wiped');

    // Fetch history for Account A
    const historyResA = await historyService.getUserHistory(regResA.user.id);
    const hasOnlyA = historyResA.items.length === 1 && historyResA.items[0].title === 'Account A Video 1';
    console.log('  -> Account A History retrieved from cloud:', historyResA.items.map(i => i.title));

    // Fetch history for Account B
    const historyResB = await historyService.getUserHistory(regResB.user.id);
    const hasOnlyB = historyResB.items.length === 1 && historyResB.items[0].title === 'Account B Video 1';
    console.log('  -> Account B History retrieved from cloud:', historyResB.items.map(i => i.title));

    if (!hasOnlyA || !hasOnlyB) throw new Error('History cross-contamination or data loss! TEST 5 FAILED');
    console.log('  [PASS] TEST 5 SUCCESSFUL\n');

    // ----------------------------------------------------
    // TEST 6: Permanent Account Deletion
    // ----------------------------------------------------
    console.log('[TEST 6] Permanent Account Deletion of Account A');
    await settingsService.deleteAccount(regResA.user.id, user1Pass);
    console.log('  -> Account A deleted successfully');

    let loginDeletedFailed = false;
    try {
      await authService.login(user1Id, user1Pass);
    } catch (e) {
      loginDeletedFailed = true;
    }
    console.log('  -> Login deleted Account A rejected:', loginDeletedFailed ? 'SUCCESS (401/400)' : 'FAILED');

    // Verify Account B is completely unaffected
    const loginResBFinal = await authService.login(user2Id, user2Pass);
    console.log('  -> Account B login unaffected:', loginResBFinal.user ? 'SUCCESS' : 'FAILED');
    
    // Clean up Account B
    await settingsService.deleteAccount(regResB.user.id, user2Pass);
    console.log('  -> Cleaned up Account B');

    if (!loginDeletedFailed || !loginResBFinal.user) throw new Error('TEST 6 FAILED');
    console.log('  [PASS] TEST 6 SUCCESSFUL\n');

    console.log('====================================================');
    console.log('ALL 6 TESTS PASSED PERFECTLY! 100% PERSISTENCE VERIFIED.');
    console.log('====================================================');

  } catch (err) {
    console.error('\nTEST SUITE ERROR:', err);
    process.exit(1);
  }
}

runTests();
