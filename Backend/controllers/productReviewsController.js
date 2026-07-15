import pool from '../db/connection.js';
import { uploadToBlob, deleteFromBlob, getBlobSasUrl } from '../services/azureBlobService.js';
import { notifyAllMembers, NOTIF_TYPES } from '../services/notificationService.js';

export const MAX_FEATURE_DESC_LEN = 250;
export const MAX_EVIDENCE_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_EVIDENCE_PER_TEST = 5;

// Normalizes key_features into a consistent [{ name, description }] shape.
// Accepts legacy plain-string entries (pre-description feature) and shims them
// on read so old products don't break.
const normalizeKeyFeatures = (raw) => {
    if (!raw) return [];
    let arr = raw;
    if (typeof raw === 'string') {
        try { arr = JSON.parse(raw); } catch { return []; }
    }
    if (!Array.isArray(arr)) return [];
    return arr
        .map((item) => {
            if (typeof item === 'string') return { name: item.trim(), description: '' };
            const name = (item?.name || '').toString().trim();
            const description = (item?.description || '').toString().trim().slice(0, MAX_FEATURE_DESC_LEN);
            return { name, description };
        })
        .filter((f) => f.name);
};

const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 12));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const getCategories = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT id, name, description FROM product_categories ORDER BY display_order ASC, name ASC');
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

export const createCategory = async (req, res, next) => {
    try {
        const trimmed = (req.body.name || '').toString().trim();
        if (!trimmed) return res.status(422).json({ success: false, message: 'Category name is required.' });

        const [[existing]] = await pool.query('SELECT id, name, description FROM product_categories WHERE LOWER(name) = LOWER(?)', [trimmed]);
        if (existing) return res.status(200).json({ success: true, data: existing }); // idempotent — reuse the existing match

        // New categories slot in just before "Others" (display_order 999), which always stays last.
        const [[{ maxOrder }]] = await pool.query("SELECT COALESCE(MAX(display_order), 0) AS maxOrder FROM product_categories WHERE name <> 'Others'");
        const [ins] = await pool.query('INSERT INTO product_categories (name, display_order) VALUES (?, ?)', [trimmed, maxOrder + 10]);
        return res.status(201).json({ success: true, data: { id: ins.insertId, name: trimmed, description: null } });
    } catch (err) {
        next(err);
    }
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const getProducts = async (req, res, next) => {
    try {
        const { category, search } = req.query;
        const params = [];
        let where = '1=1';

        if (category) { where += ' AND p.category_id = ?'; params.push(parseInt(category, 10) || 0); }
        if (search) {
            where += ' AND (p.name LIKE ? OR p.vendor LIKE ? OR p.short_description LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM products p WHERE ${where}`, params);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        // Reviews and feature-test scores are both one-to-many against products, so each is pre-aggregated
        // in its own subquery rather than joined flat — joining both directly would fan out row counts
        // (e.g. 3 reviews x 4 tests = 12 rows) and silently corrupt every AVG()/COUNT() here.
        const [rows] = await pool.query(
            `SELECT p.id, p.name, p.vendor, p.category_id, pc.name AS category,
                    p.product_logo_url, p.company_logo_url,
                    p.short_description, p.portal_url, p.created_at, p.key_features,
                    COALESCE(rv.avg_rating, 0)  AS avg_rating,
                    COALESCE(rv.review_count, 0) AS review_count,
                    ft.avg_test_score, COALESCE(ft.tested_count, 0) AS tested_count
             FROM products p
             LEFT JOIN product_categories pc ON pc.id = p.category_id
             LEFT JOIN (
                 SELECT product_id, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS review_count
                 FROM product_user_reviews GROUP BY product_id
             ) rv ON rv.product_id = p.id
             LEFT JOIN (
                 SELECT product_id, ROUND(AVG(score), 1) AS avg_test_score, COUNT(*) AS tested_count
                 FROM product_feature_tests WHERE score IS NOT NULL GROUP BY product_id
             ) ft ON ft.product_id = p.id
             WHERE ${where}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        rows.forEach((r) => { r.key_features = normalizeKeyFeatures(r.key_features); });

        return res.json({ success: true, data: rows, total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

export const getProductById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [[product]] = await pool.query(
            `SELECT p.*, pc.name AS category,
                    ROUND(COALESCE(AVG(r.rating), 0), 1) AS avg_rating,
                    COUNT(r.id) AS review_count
             FROM products p
             LEFT JOIN product_categories pc ON pc.id = p.category_id
             LEFT JOIN product_user_reviews r ON r.product_id = p.id
             WHERE p.id = ?
             GROUP BY p.id`,
            [id]
        );
        if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

        const [media] = await pool.query('SELECT * FROM product_media WHERE product_id = ? ORDER BY display_order ASC, id ASC', [id]);
        const [featureTests] = await pool.query('SELECT * FROM product_feature_tests WHERE product_id = ? ORDER BY display_order ASC, id ASC', [id]);
        const [evidences] = await pool.query(
            `SELECT pe.*, pft.feature_name AS feature_test_name
             FROM product_evidences pe
             LEFT JOIN product_feature_tests pft ON pft.id = pe.feature_test_id
             WHERE pe.product_id = ? ORDER BY pft.display_order ASC, pft.id ASC, pe.created_at DESC`,
            [id]
        );
        const [userReviews] = await pool.query(
            `SELECT r.*, u.name AS user_name, u.photo_url AS user_photo
             FROM product_user_reviews r
             JOIN users u ON u.id = r.user_id
             WHERE r.product_id = ?
             ORDER BY r.created_at DESC`,
            [id]
        );

        product.key_features = normalizeKeyFeatures(product.key_features);

        return res.json({ success: true, data: { ...product, media, featureTests, evidences, userReviews } });
    } catch (err) {
        next(err);
    }
};

// Validates a submitted category_id against product_categories; null/empty is allowed (uncategorized).
const resolveCategoryId = async (category_id) => {
    if (category_id === undefined || category_id === null || category_id === '') return null;
    const id = parseInt(category_id, 10);
    if (!id) return null;
    const [[row]] = await pool.query('SELECT id FROM product_categories WHERE id = ?', [id]);
    if (!row) { const err = new Error('Invalid category selected.'); err.status = 422; throw err; }
    return id;
};

const productWithCategory = async (id) => {
    const [[row]] = await pool.query(
        `SELECT p.*, pc.name AS category FROM products p LEFT JOIN product_categories pc ON pc.id = p.category_id WHERE p.id = ?`,
        [id]
    );
    row.key_features = normalizeKeyFeatures(row.key_features);
    return row;
};

export const createProduct = async (req, res, next) => {
    try {
        const { name, vendor, category_id, portal_url, short_description, overview, version_tested, key_features } = req.body;
        const kf = key_features ? JSON.stringify(normalizeKeyFeatures(key_features)) : null;
        const categoryId = await resolveCategoryId(category_id);

        const [result] = await pool.query(
            `INSERT INTO products (name, vendor, category_id, portal_url, short_description, overview, version_tested, key_features)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name.trim(), vendor.trim(), categoryId, portal_url || null,
            short_description || null, overview || null, version_tested || null, kf]
        );
        const row = await productWithCategory(result.insertId);

        // Notify all members — fire and forget
        notifyAllMembers(
            NOTIF_TYPES.PRODUCT_REVIEW_ADDED,
            `New AI Product Review: ${name.trim()}`,
            `${vendor.trim()} — now reviewed on AI Risk Council`,
            { url: '/services/product-reviews', productId: String(result.insertId) }
        );

        return res.status(201).json({ success: true, data: row });
    } catch (err) {
        next(err);
    }
};

export const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, vendor, category_id, portal_url, short_description, overview, version_tested, key_features } = req.body;

        const [[check]] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
        if (!check) return res.status(404).json({ success: false, message: 'Product not found.' });

        const kf = key_features ? JSON.stringify(normalizeKeyFeatures(key_features)) : null;
        const categoryId = await resolveCategoryId(category_id);

        await pool.query(
            `UPDATE products SET name=?, vendor=?, category_id=?, portal_url=?,
             short_description=?, overview=?, version_tested=?, key_features=?
             WHERE id=?`,
            [name.trim(), vendor.trim(), categoryId, portal_url || null,
            short_description || null, overview || null, version_tested || null, kf, id]
        );
        const row = await productWithCategory(id);
        return res.json({ success: true, data: row });
    } catch (err) {
        next(err);
    }
};

export const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [[check]] = await pool.query('SELECT product_logo_url, company_logo_url FROM products WHERE id = ?', [id]);
        if (!check) return res.status(404).json({ success: false, message: 'Product not found.' });

        const [mediaFiles]    = await pool.query('SELECT url FROM product_media WHERE product_id = ?', [id]);
        const [evidenceFiles] = await pool.query('SELECT file_url FROM product_evidences WHERE product_id = ?', [id]);
        await Promise.all([
            ...mediaFiles.map((m) => deleteFromBlob(m.url)),
            ...evidenceFiles.map((e) => deleteFromBlob(e.file_url)),
            deleteFromBlob(check.product_logo_url),
            deleteFromBlob(check.company_logo_url),
        ]);

        await pool.query('DELETE FROM products WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Product deleted.' });
    } catch (err) {
        next(err);
    }
};

// ─── Logos ────────────────────────────────────────────────────────────────────
// Uploaded as a follow-up request against an existing product (same pattern as
// event banners/thumbnails), since createProduct/updateProduct take a JSON body.

const uploadLogo = (column, folder) => async (req, res, next) => {
    try {
        const { id } = req.params;
        const [[check]] = await pool.query(`SELECT id, ${column} FROM products WHERE id = ?`, [id]);
        if (!check) return res.status(404).json({ success: false, message: 'Product not found.' });
        if (!req.file) return res.status(422).json({ success: false, message: 'No image file provided.' });

        await deleteFromBlob(check[column]);
        const url = await uploadToBlob(folder, req.file.originalname, req.file.buffer, req.file.mimetype);

        await pool.query(`UPDATE products SET ${column} = ? WHERE id = ?`, [url, id]);
        const row = await productWithCategory(id);
        return res.json({ success: true, data: row });
    } catch (err) {
        next(err);
    }
};

export const uploadProductLogo = uploadLogo('product_logo_url', 'products/logos');
export const uploadCompanyLogo = uploadLogo('company_logo_url', 'products/company-logos');

// ─── Feature Tests ────────────────────────────────────────────────────────────

export const addFeatureTest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { feature_name, test_method, result, score, comments, display_order } = req.body;

        const [[check]] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
        if (!check) return res.status(404).json({ success: false, message: 'Product not found.' });

        const [ins] = await pool.query(
            `INSERT INTO product_feature_tests (product_id, feature_name, test_method, result, score, comments, display_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, feature_name.trim(), test_method || null, result || null,
                score != null && score !== '' ? parseFloat(score) : null, comments || null, display_order || 0]
        );
        const [[row]] = await pool.query('SELECT * FROM product_feature_tests WHERE id = ?', [ins.insertId]);
        return res.status(201).json({ success: true, data: row });
    } catch (err) {
        next(err);
    }
};

export const updateFeatureTest = async (req, res, next) => {
    try {
        const { productId, testId } = req.params;
        const { feature_name, test_method, result, score, comments, display_order } = req.body;

        const [[check]] = await pool.query('SELECT id FROM product_feature_tests WHERE id = ? AND product_id = ?', [testId, productId]);
        if (!check) return res.status(404).json({ success: false, message: 'Feature test not found.' });

        await pool.query(
            `UPDATE product_feature_tests SET feature_name=?, test_method=?, result=?, score=?, comments=?, display_order=? WHERE id=?`,
            [feature_name.trim(), test_method || null, result || null,
            score != null && score !== '' ? parseFloat(score) : null, comments || null, display_order || 0, testId]
        );
        const [[row]] = await pool.query('SELECT * FROM product_feature_tests WHERE id = ?', [testId]);
        return res.json({ success: true, data: row });
    } catch (err) {
        next(err);
    }
};

export const deleteFeatureTest = async (req, res, next) => {
    try {
        const { productId, testId } = req.params;
        const [[check]] = await pool.query('SELECT id FROM product_feature_tests WHERE id = ? AND product_id = ?', [testId, productId]);
        if (!check) return res.status(404).json({ success: false, message: 'Feature test not found.' });
        await pool.query('DELETE FROM product_feature_tests WHERE id = ?', [testId]);
        return res.json({ success: true, message: 'Feature test deleted.' });
    } catch (err) {
        next(err);
    }
};

// Videos aren't auto-compressed (needs ffmpeg + a job queue this platform doesn't have) —
// so oversized videos are rejected upfront with guidance to embed via YouTube/Vimeo instead.
const oversizedVideo = (files) => files.find((f) => f.mimetype.startsWith('video/') && f.buffer.length > MAX_EVIDENCE_VIDEO_BYTES);

// ─── Media ────────────────────────────────────────────────────────────────────

export const uploadMedia = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [[check]] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
        if (!check) return res.status(404).json({ success: false, message: 'Product not found.' });
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded.' });

        const tooBig = oversizedVideo(req.files);
        if (tooBig) {
            return res.status(422).json({ success: false, message: `"${tooBig.originalname}" exceeds the 50MB video limit. Please compress it or embed via YouTube/Vimeo instead.` });
        }

        const inserted = [];
        for (const file of req.files) {
            const url = await uploadToBlob('products/media', file.originalname, file.buffer, file.mimetype);
            const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
            const [ins] = await pool.query(
                'INSERT INTO product_media (product_id, type, url, label, display_order) VALUES (?, ?, ?, ?, ?)',
                [id, mediaType, url, file.originalname, 0]
            );
            const [[row]] = await pool.query('SELECT * FROM product_media WHERE id = ?', [ins.insertId]);
            inserted.push(row);
        }
        return res.status(201).json({ success: true, data: inserted });
    } catch (err) {
        next(err);
    }
};

export const deleteMedia = async (req, res, next) => {
    try {
        const { productId, mediaId } = req.params;
        const [[row]] = await pool.query('SELECT * FROM product_media WHERE id = ? AND product_id = ?', [mediaId, productId]);
        if (!row) return res.status(404).json({ success: false, message: 'Media not found.' });

        await deleteFromBlob(row.url);
        await pool.query('DELETE FROM product_media WHERE id = ?', [mediaId]);
        return res.json({ success: true, message: 'Media deleted.' });
    } catch (err) {
        next(err);
    }
};

// ─── Evidences ────────────────────────────────────────────────────────────────

export const uploadEvidence = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [[check]] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
        if (!check) return res.status(404).json({ success: false, message: 'Product not found.' });
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded.' });

        const tooBig = oversizedVideo(req.files);
        if (tooBig) {
            return res.status(422).json({ success: false, message: `"${tooBig.originalname}" exceeds the 50MB video limit. Please compress it or embed via YouTube/Vimeo instead.` });
        }

        const { feature_test_id } = req.body;
        const ftId = feature_test_id ? parseInt(feature_test_id, 10) || null : null;
        if (ftId) {
            const [[ftCheck]] = await pool.query('SELECT id FROM product_feature_tests WHERE id = ? AND product_id = ?', [ftId, id]);
            if (!ftCheck) return res.status(400).json({ success: false, message: 'Invalid feature test.' });

            const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM product_evidences WHERE feature_test_id = ?', [ftId]);
            if (count + req.files.length > MAX_EVIDENCE_PER_TEST) {
                return res.status(422).json({ success: false, message: `Each feature test can have at most ${MAX_EVIDENCE_PER_TEST} evidence files (this test already has ${count}).` });
            }
        }

        const inserted = [];
        for (const file of req.files) {
            const file_url = await uploadToBlob('products/evidences', file.originalname, file.buffer, file.mimetype);
            const [ins] = await pool.query(
                'INSERT INTO product_evidences (product_id, feature_test_id, file_url, file_name, file_type) VALUES (?, ?, ?, ?, ?)',
                [id, ftId, file_url, file.originalname, file.mimetype]
            );
            const [[row]] = await pool.query(
                `SELECT pe.*, pft.feature_name AS feature_test_name FROM product_evidences pe LEFT JOIN product_feature_tests pft ON pft.id = pe.feature_test_id WHERE pe.id = ?`,
                [ins.insertId]
            );
            inserted.push(row);
        }
        return res.status(201).json({ success: true, data: inserted });
    } catch (err) {
        next(err);
    }
};

export const deleteEvidence = async (req, res, next) => {
    try {
        const { productId, evidenceId } = req.params;
        const [[row]] = await pool.query('SELECT * FROM product_evidences WHERE id = ? AND product_id = ?', [evidenceId, productId]);
        if (!row) return res.status(404).json({ success: false, message: 'Evidence not found.' });

        await deleteFromBlob(row.file_url);
        await pool.query('DELETE FROM product_evidences WHERE id = ?', [evidenceId]);
        return res.json({ success: true, message: 'Evidence deleted.' });
    } catch (err) {
        next(err);
    }
};

// GET /:productId/evidences/:evidenceId/download — public (evidence isn't role-gated).
// Cross-origin `<a download>` isn't reliably honoured by browsers, so this issues a
// SAS URL with an attachment Content-Disposition set by Azure Storage itself.
export const downloadEvidence = async (req, res, next) => {
    try {
        const { productId, evidenceId } = req.params;
        const [[row]] = await pool.query('SELECT file_url, file_name FROM product_evidences WHERE id = ? AND product_id = ?', [evidenceId, productId]);
        if (!row) return res.status(404).json({ success: false, message: 'Evidence not found.' });

        const url = getBlobSasUrl(row.file_url, 1, false, row.file_name || 'evidence');
        return res.json({ success: true, url });
    } catch (err) {
        next(err);
    }
};

// ─── User Reviews ─────────────────────────────────────────────────────────────

export const submitUserReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user.id;

        const [[check]] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
        if (!check) return res.status(404).json({ success: false, message: 'Product not found.' });

        const parsedRating = parseInt(rating, 10);
        if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
            return res.status(422).json({ success: false, message: 'Rating must be between 1 and 5.' });
        }

        const [[existing]] = await pool.query('SELECT id FROM product_user_reviews WHERE product_id = ? AND user_id = ?', [id, userId]);
        if (existing) {
            await pool.query('UPDATE product_user_reviews SET rating=?, comment=?, updated_at=NOW() WHERE product_id=? AND user_id=?', [parsedRating, comment || null, id, userId]);
        } else {
            await pool.query('INSERT INTO product_user_reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)', [id, userId, parsedRating, comment || null]);
        }

        const [[stats]] = await pool.query('SELECT ROUND(COALESCE(AVG(rating),0),1) AS avg_rating, COUNT(id) AS review_count FROM product_user_reviews WHERE product_id = ?', [id]);
        return res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};

export const deleteUserReview = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const [[row]] = await pool.query('SELECT * FROM product_user_reviews WHERE id = ?', [reviewId]);
        if (!row) return res.status(404).json({ success: false, message: 'Review not found.' });

        if (req.user.role !== 'founding_member' && row.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only delete your own reviews.' });
        }
        await pool.query('DELETE FROM product_user_reviews WHERE id = ?', [reviewId]);
        return res.json({ success: true, message: 'Review deleted.' });
    } catch (err) {
        next(err);
    }
};