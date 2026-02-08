const crypto = require('crypto');

// Ensure ENCRYPTION_KEY is set or use a fallback (WARN: fallback is not persistent across restarts if it involves random generation, 
// but here we use a fixed string for dev convenience if missing, though typically it should be in .env)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'nightcafe-companion-secret-key';
const ALGORITHM = 'aes-256-cbc';

function getCipherKey() {
    // Create a 32-byte key from the string, padding or slicing as needed
    // Ideally ENCRYPTION_KEY is a 32-char string or hex
    return Buffer.from(ENCRYPTION_KEY.padEnd(32, '0')).slice(0, 32);
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
