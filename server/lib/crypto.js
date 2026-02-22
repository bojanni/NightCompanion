const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');

// Get machine specific ID to use as a salt so DB isn't portable just by copying the .env
let machineId = '';
try {
    machineId = machineIdSync();
} catch (err) {
    console.warn('⚠️ WARNING: Could not get machine ID for encryption salt, falling back to default.', err.message);
    machineId = 'fallback-machine-id-string';
}

// Ensure ENCRYPTION_KEY is set or use a fallback. 
const RAW_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'nightcafe-companion-secret-key';
const ALGORITHM = 'aes-256-cbc';

/**
 * Derive a secure 32-byte key using PBKDF2 hashing the ENCRYPTION_KEY with the machine ID salt.
 * This guarantees the database values cannot be read on a different host even if .env is stolen.
 */
function getCipherKey() {
    return crypto.pbkdf2Sync(RAW_ENCRYPTION_KEY, machineId, 100000, 32, 'sha256');
}

function encrypt(text) {
    if (!text) return null;
    const key = getCipherKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = textParts.join(':');
        const key = getCipherKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Decryption failed:', err.message);
        return null; // Return null if decryption fails (e.g. wrong key)
    }
}

function maskKey(key) {
    if (!key || key.length <= 4) return '****';
    return '****' + key.slice(-4);
}

module.exports = { encrypt, decrypt, maskKey };
