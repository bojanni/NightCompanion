const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const encryption = require('../lib/encryption');

console.log('Testing encryption library...\n');

const testKey = 'sk-test1234567890abcdef';
console.log('Original:', testKey);

const { encrypted, iv, authTag } = encryption.encrypt(testKey);
console.log('Encrypted:', encrypted.substring(0, 30) + '...');
console.log('IV:', iv);
console.log('Auth Tag:', authTag);

const decrypted = encryption.decrypt(encrypted, iv, authTag);
console.log('Decrypted:', decrypted);

if (testKey === decrypted) {
    console.log('\n✅ Encryption library works correctly!');
} else {
    console.log('\n❌ Encryption mismatch!');
}
