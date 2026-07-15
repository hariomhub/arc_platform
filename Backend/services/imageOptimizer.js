/**
 * imageOptimizer.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side image compression, applied automatically before any image buffer
 * reaches Azure Blob Storage (wired into azureBlobService.uploadToBlob).
 *
 * Only images above COMPRESS_THRESHOLD_BYTES are touched — already-small images
 * are left alone to avoid needless CPU work. Format is preserved (JPEG stays
 * JPEG, PNG stays PNG) so nothing downstream that assumes the original
 * mimetype/extension breaks. GIFs are skipped (re-encoding would drop animation).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import sharp from 'sharp';

const COMPRESS_THRESHOLD_BYTES = 500 * 1024; // 500KB
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const PNG_COMPRESSION_LEVEL = 9;

/**
 * Compress an image buffer if it's above the size threshold. Falls back to the
 * original buffer on any failure (corrupt image, unsupported subtype, etc.) so
 * an optimization error never blocks an upload.
 *
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @returns {Promise<{ buffer: Buffer, mimetype: string }>}
 */
export const optimizeImage = async (buffer, mimetype) => {
    if (!mimetype || !mimetype.startsWith('image/') || mimetype === 'image/gif') {
        return { buffer, mimetype };
    }
    if (buffer.length <= COMPRESS_THRESHOLD_BYTES) {
        return { buffer, mimetype };
    }

    try {
        let pipeline = sharp(buffer)
            .rotate() // normalize EXIF orientation before resizing
            .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });

        if (mimetype === 'image/jpeg') {
            pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
        } else if (mimetype === 'image/png') {
            pipeline = pipeline.png({ compressionLevel: PNG_COMPRESSION_LEVEL });
        } else if (mimetype === 'image/webp') {
            pipeline = pipeline.webp({ quality: WEBP_QUALITY });
        } else {
            return { buffer, mimetype }; // unrecognized image subtype — leave untouched
        }

        const output = await pipeline.toBuffer();
        // Only use the compressed version if it actually saved space
        return output.length < buffer.length ? { buffer: output, mimetype } : { buffer, mimetype };
    } catch (err) {
        console.warn('[imageOptimizer] compression failed, using original:', err.message);
        return { buffer, mimetype };
    }
};
