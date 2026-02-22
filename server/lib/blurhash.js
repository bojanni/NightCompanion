const sharp = require('sharp');
const { encode } = require('blurhash');
const { pool } = require('../db');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const path = require('path');
const fs = require('fs');

/**
 * Encodes an image to a BlurHash string.
 * @param {Buffer} imageBuffer - The image buffer.
 * @returns {Promise<string>} The BlurHash string.
 */
async function encodeImageToBlurhash(imageBuffer) {
    try {
        const { data, info } = await sharp(imageBuffer)
            .resize(32, 32, { fit: 'inside' })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
        return blurhash;
    } catch (err) {
        console.error('Error generating BlurHash:', err);
        return null;
    }
}

/**
 * Asynchronously processes an image (URL or local path/buffer), generates a BlurHash, and updates the database.
 * Non-blocking by nature (does not await the DB update to return).
 * 
 * @param {string} galleryItemId - The UUID of the gallery_items record.
 * @param {string|Buffer} imageSource - The remote URL, local file path, or Buffer.
 */
async function processBlurhashAsync(galleryItemId, imageSource) {
    // We intentionally don't await this outer function in the routes
    // so it runs in the background.
    (async () => {
        try {
            let buffer;
            if (Buffer.isBuffer(imageSource)) {
                buffer = imageSource;
            } else if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
                // Fetch remote image
                const res = await fetch(imageSource);
                if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
                buffer = await res.buffer();
            } else if (typeof imageSource === 'string') {
                // Read local file
                const fullPath = path.resolve(__dirname, '../../', imageSource);
                buffer = await fs.promises.readFile(fullPath);
            }

            if (!buffer) return;

            const hash = await encodeImageToBlurhash(buffer);
            if (hash) {
                // Save it into the metadata JSONB column or a dedicated column
                // Assuming we use metadata JSONB to store the blurhash
                await pool.query(
                    `UPDATE gallery_items 
                     SET metadata = jsonb_set(
                       COALESCE(metadata, '{}'::jsonb), 
                       '{blurhash}', 
                       $1::jsonb
                     )
                     WHERE id = $2`,
                    [JSON.stringify(hash), galleryItemId]
                );
                console.log(`BlurHash generated for ${galleryItemId}`);
            }
        } catch (error) {
            console.error(`Failed to process BlurHash for ${galleryItemId}:`, error.message);
        }
    })();
}

module.exports = {
    processBlurhashAsync,
    encodeImageToBlurhash
};
