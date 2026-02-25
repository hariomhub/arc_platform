import { FILE_LIMITS } from './constants.js';

/**
 * Validate a PDF file for upload.
 * @param {File} file
 * @returns {{ valid: boolean, error: string | null }}
 */
export const validatePDF = (file) => {
    if (!file) return { valid: false, error: 'No file selected.' };

    if (!FILE_LIMITS.ACCEPTED_PDF_TYPES.includes(file.type)) {
        return { valid: false, error: 'Only PDF files are allowed.' };
    }

    if (file.size > FILE_LIMITS.MAX_PDF_SIZE) {
        return { valid: false, error: 'File size must be under 10MB.' };
    }

    return { valid: true, error: null };
};

/**
 * Validate an image file for upload.
 * @param {File} file
 * @returns {{ valid: boolean, error: string | null }}
 */
export const validateImage = (file) => {
    if (!file) return { valid: false, error: 'No file selected.' };

    if (!FILE_LIMITS.ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return { valid: false, error: 'Only image files (JPEG, PNG, WebP, GIF) are allowed.' };
    }

    if (file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
        return { valid: false, error: 'Image size must be under 5MB.' };
    }

    return { valid: true, error: null };
};

/**
 * Format bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
