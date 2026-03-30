/**
 * azureBlobService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised Azure Blob Storage helper for the ARC platform.
 *
 * Supports two .env configurations:
 *   Option A (Connection String — preferred):
 *     AZURE_STORAGE_ACCOUNT_KEY=DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=...
 *   Option B (Account Name + bare Key):
 *     AZURE_STORAGE_ACCOUNT_NAME=racstorage
 *     AZURE_STORAGE_ACCOUNT_KEY=<base64 key only>
 *
 * Container layout:
 *   PUBLIC  (arc-uploads)  → events/banners, nominees/photos, products/media,
 *                            products/evidences, framework/templates, team/photos, profiles/avatars
 *   PRIVATE (arc-private)  → resources/ (served via 1-hour SAS URL)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
    BlobServiceClient,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
} from '@azure/storage-blob';

const RAW_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';
const PUBLIC_CONTAINER = process.env.AZURE_STORAGE_CONTAINER_NAME || 'arc-uploads';
const PRIVATE_CONTAINER = process.env.AZURE_STORAGE_PRIVATE_CONTAINER_NAME || 'arc-private';
const SAS_EXPIRY_HOURS = parseInt(process.env.AZURE_SAS_EXPIRY_HOURS, 10) || 1;

// Detect whether the key env var is a connection string or a bare base64 key
const IS_CONNECTION_STRING = RAW_KEY.startsWith('DefaultEndpointsProtocol=') ||
    RAW_KEY.startsWith('AccountName=');

// Parse account name + bare key from connection string (needed for SAS generation)
const parseConnectionString = (cs) => {
    const accountName = cs.match(/AccountName=([^;]+)/)?.[1] || '';
    const accountKey = cs.match(/AccountKey=([^;]+)/)?.[1] || '';
    return { accountName, accountKey };
};

const ACCOUNT_NAME = IS_CONNECTION_STRING
    ? parseConnectionString(RAW_KEY).accountName
    : (process.env.AZURE_STORAGE_ACCOUNT_NAME || '');

const ACCOUNT_KEY_BARE = IS_CONNECTION_STRING
    ? parseConnectionString(RAW_KEY).accountKey
    : RAW_KEY;

// ── Lazy-init clients ─────────────────────────────────────────────────────────
let _blobServiceClient = null;
let _sharedKeyCredential = null;

const getBlobServiceClient = () => {
    if (_blobServiceClient) return _blobServiceClient;

    if (!RAW_KEY) {
        throw new Error('Azure Storage credentials not configured. Set AZURE_STORAGE_ACCOUNT_KEY in .env');
    }

    if (IS_CONNECTION_STRING) {
        _blobServiceClient = BlobServiceClient.fromConnectionString(RAW_KEY);
    } else {
        _sharedKeyCredential = new StorageSharedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY_BARE);
        _blobServiceClient = new BlobServiceClient(
            `https://${ACCOUNT_NAME}.blob.core.windows.net`,
            _sharedKeyCredential
        );
    }
    return _blobServiceClient;
};

const getSharedKeyCredential = () => {
    if (_sharedKeyCredential) return _sharedKeyCredential;
    // force init
    getBlobServiceClient();
    // if connection string was used, create one now for SAS generation
    if (!_sharedKeyCredential && ACCOUNT_NAME && ACCOUNT_KEY_BARE) {
        _sharedKeyCredential = new StorageSharedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY_BARE);
    }
    return _sharedKeyCredential;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract container + blob name from a full Blob URL */
const parseBlobUrl = (url) => {
    try {
        const u = new URL(url);
        const parts = u.pathname.replace(/^\//, '').split('/');
        const containerName = parts.shift();
        const blobName = parts.join('/');
        return { containerName, blobName };
    } catch {
        return null;
    }
};

/** Generate a unique blob name: folder/timestamp-random-filename.ext */
const buildBlobName = (folder, originalName) => {
    const sanitised = originalName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
    return `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitised}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a file buffer to Azure Blob Storage.
 *
 * @param {string}  folder       Blob name prefix, e.g. 'events/banners'
 * @param {string}  originalName Original file name (used to derive extension)
 * @param {Buffer}  buffer       File bytes (from multer memoryStorage)
 * @param {string}  mimeType     MIME type, e.g. 'image/png'
 * @param {object}  [opts]
 * @param {boolean} [opts.private=false]  If true, upload to private container
 * @returns {Promise<string>} Full Blob URL
 */
export const uploadToBlob = async (folder, originalName, buffer, mimeType, opts = {}) => {
    const isPrivate = opts.private === true;
    const containerName = isPrivate ? PRIVATE_CONTAINER : PUBLIC_CONTAINER;
    const blobName = buildBlobName(folder, originalName);

    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(containerName);

    // Create container if it doesn't exist.
    // Public access level is managed via Azure portal (account-level setting).
    // Setting access:'blob' here throws 403 on accounts with AllowBlobPublicAccess=false.
    await containerClient.createIfNotExists();

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: mimeType },
    });

    return blockBlobClient.url;
};

/**
 * Delete a blob given its full URL.  Safe to call with null/undefined.
 * @param {string|null} blobUrl
 */
export const deleteFromBlob = async (blobUrl) => {
    if (!blobUrl || !blobUrl.startsWith('https://')) return;
    const parsed = parseBlobUrl(blobUrl);
    if (!parsed) return;
    try {
        const client = getBlobServiceClient();
        await client
            .getContainerClient(parsed.containerName)
            .getBlockBlobClient(parsed.blobName)
            .deleteIfExists();
    } catch (err) {
        console.warn(`[BlobService] Could not delete blob ${blobUrl}:`, err.message);
    }
};

/**
 * Generate a short-lived SAS URL for a private blob (RBAC resource downloads).
 * @param {string} blobUrl
 * @param {number} [expiryHours]
 * @returns {string} SAS URL
 */
export const getBlobSasUrl = (blobUrl, expiryHours = SAS_EXPIRY_HOURS) => {
    if (!blobUrl || !blobUrl.startsWith('https://')) return blobUrl;
    const parsed = parseBlobUrl(blobUrl);
    if (!parsed) return blobUrl;

    const cred = getSharedKeyCredential();
    if (!cred) {
        console.warn('[BlobService] Cannot generate SAS — SharedKeyCredential not available');
        return blobUrl;
    }

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiryHours * 60 * 60 * 1000);

    const sasQuery = generateBlobSASQueryParameters(
        {
            containerName: parsed.containerName,
            blobName: parsed.blobName,
            permissions: BlobSASPermissions.parse('r'),
            startsOn,
            expiresOn,
        },
        cred
    );

    return `${blobUrl}?${sasQuery.toString()}`;
};
