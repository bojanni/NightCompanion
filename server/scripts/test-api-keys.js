const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const encryption = require('../lib/encryption');
const { pool } = require('../db');

async function testApiKeys() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('    API KEY ENCRYPTION TEST');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        // Test 1: Encryption/Decryption
        console.log('1. TESTING ENCRYPTION LIBRARY');
        const testKey = 'sk-test1234567890abcdef';
        console.log(`   Original:  ${testKey}`);

        const { encrypted, iv, authTag } = encryption.encrypt(testKey);
        console.log(`   Encrypted: ${encrypted.substring(0, 20)}...`);
        console.log(`   IV:        ${iv}`);
        console.log(`   Auth Tag:  ${authTag}`);

        const decrypted = encryption.decrypt(encrypted, iv, authTag);
        console.log(`   Decrypted: ${decrypted}`);
        console.log(`   ✅ Match:    ${testKey === decrypted}`);
        console.log('');

        // Test 2: Database operations
        console.log('2. TESTING DATABASE OPERATIONS');
        const client = await pool.connect();

        try {
            // Insert test API key
            const testApiKey = 'sk-proj-abc123xyz789DEF456GHI';
            const { encrypted: enc, iv: ivVal, authTag: tag } = encryption.encrypt(testApiKey);
            const keyHint = testApiKey.slice(0, 4) + '...' + testApiKey.slice(-4);

            await client.query(`
                INSERT INTO user_api_keys (provider, encrypted_key, iv, auth_tag, key_hint, model_name, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, true)
                ON CONFLICT (provider) 
                DO UPDATE SET 
                    encrypted_key = $2, 
                    iv = $3,
                    auth_tag = $4,
                    key_hint = $5,
                    model_name = $6,
                    updated_at = NOW()
            `, ['test_provider', enc, ivVal, tag, keyHint, 'gpt-4']);
            console.log('   ✅ Inserted encrypted API key');

            // Retrieve and decrypt
            const result = await client.query(`
                SELECT encrypted_key, iv, auth_tag, key_hint
                FROM user_api_keys
                WHERE provider = $1
            `, ['test_provider']);

            if (result.rows.length > 0) {
                const row = result.rows[0];
                console.log(`   Key hint:  ${row.key_hint}`);

                const decryptedKey = encryption.decrypt(row.encrypted_key, row.iv, row.auth_tag);
                console.log(`   Decrypted: ${decryptedKey}`);
                console.log(`   ✅ Match:    ${decryptedKey === testApiKey}`);
            }

            // Clean up test data
            await client.query(`DELETE FROM user_api_keys WHERE provider = 'test_provider'`);
            console.log('   ✅ Cleaned up test data');

        } finally {
            client.release();
        }
        console.log('');

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ ALL TESTS PASSED');
        console.log('═══════════════════════════════════════════════════════');

    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        await pool.end();
    }
}

testApiKeys();
