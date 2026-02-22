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

const RAW_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️ WARNING: ENCRYPTION_KEY not set in .env, using random key (keys will not persist across restarts)');
}

// Derive a secure 32-byte key using PBKDF2 passing the raw key plus the machine-id salt.
const keyBuffer = crypto.pbkdf2Sync(RAW_ENCRYPTION_KEY, machineId, 100000, 32, 'sha256');

/**
 * Encrypt text using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {{encrypted: string, iv: string, authTag: string}}
 */
function encrypt(text) {
    // Generate random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
}

/**
 * Decrypt text using AES-256-GCM
 * @param {string} encrypted - Encrypted text (hex)
 * @param {string} ivHex - Initialization vector (hex)
 * @param {string} authTagHex - Authentication tag (hex)
 * @returns {string} Decrypted plain text
 */
function decrypt(encrypted, ivHex, authTagHex) {
    try {
        // Convert hex strings to buffers
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
        decipher.setAuthTag(authTag);

        // Decrypt
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        throw new Error('Decryption failed: ' + error.message);
    }
}

module.exports = {
    encrypt,
    decrypt
};
