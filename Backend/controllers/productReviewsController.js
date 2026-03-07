import pool from '../db/connection.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 12));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// ─── Products ─────────────────────────────────────────────────────────────────

// GET /api/product-reviews  — public
export const getProducts = async (req, res, next) => {
    try {
        const { category, search } = req.query;
        const params = [];
        let where = '1=1';

        if (category) {
            where += ' AND p.category = ?';
            params.push(category);
        }
        if (search) {
            where += ' AND (p.name LIKE ? OR p.vendor LIKE ? OR p.short_description LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM products p WHERE ${where}`,
            params
        );
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        const [rows] = await pool.query(
            `SELECT p.id, p.name, p.vendor, p.category, p.short_description, p.portal_url, p.created_at,
                    ROUND(COALESCE(AVG(r.rating), 0), 1) AS avg_rating,
                    COUNT(r.id) AS review_count
             FROM products p
             LEFT JOIN product_user_reviews r ON r.product_id = p.id
             WHERE ${where}
             GROUP BY p.id
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return res.json({ success: true, data: rows, total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// GET /api/product-reviews/:id  — public
export const getProductById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [[product]] = await pool.query(
            `SELECT p.*,
                    ROUND(COALESCE(AVG(r.rating), 0), 1) AS avg_rating,
                    COUNT(r.id) AS review_count
             FROM products p
             LEFT JOIN product_user_reviews r ON r.product_id = p.id
             WHERE p.id = ?
             GROUP BY p.id`,
            [id]
        );
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        const [media] = await pool.query(
            'SELECT * FROM product_media WHERE product_id = ? ORDER BY display_order ASC, id ASC',
            [id]
        );
        const [featureTests] = await pool.query(
            'SELECT * FROM product_feature_tests WHERE product_id = ? ORDER BY display_order ASC, id ASC',
            [id]
        );
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

        // Parse key_features JSON if stored as string
        if (product.key_features && typeof product.key_features === 'string') {
            try { product.key_features = JSON.parse(product.key_features); } catch { /* keep as string */ }
        }

        return res.json({
            success: true,
            data: { ...product, media, featureTests, evidences, userReviews },
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/product-reviews  — admin only
export const createProduct = async (req, res, next) => {
    try {
        const { name, vendor, category, portal_url, short_description, overview, version_tested, key_features } = req.body;
        const kf = key_features
            ? (typeof key_features === 'string' ? key_features : JSON.stringify(key_features))
            : null;

        const [result] = await pool.query(
            `INSERT INTO products (name, vendor, category, portal_url, short_description, overview, version_tested, key_features)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name.trim(), vendor.trim(), category || null, portal_url || null,
             short_description || null, overview || null, version_tested || null, kf]
        );
        const [[row]] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
        return res.status(201).json({ success: true, data: row });
    } catch (err) {
        next(err);
    }
};

// PUT /api/product-reviews/:id  — admin only
export const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, vendor, category, portal_url, short_description, overview, version_tested, key_features } = req.body;

        const [[check]] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
        if (!check) return res.status(404).json({ success: false, message: 'Product not found.' });

        const kf = key_features
            ? (typeof key_features === 'string' ? key_features : JSON.stringify(key_features))
            : null;

        await pool.query(
            `UPDATE products SET name=?, vendor=?, category=?, portal_url=?,
             short_description=?, overview=?, version_tested=?, key_features=?
             WHERE id=?`,
            [name.trim(), vendor.trim(), category || null, portal_url || null,
             short_description || null, overview || null, version_tested || null, kf, id]
        );
        const [[row]] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
        return res.json({ success: true, data: row });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/product-reviews/:id  — admin only
export const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [[check]] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
        if (!check) return res.status(404).json({ success: false, message: 'Product not found.' });

        // Remove physical files before DB delete
        const [mediaFiles] = await pool.query('SELECT url FROM product_media WHERE product_id = ?', [id]);
        const [evidenceFiles] = await pool.query('SELECT file_url FROM product_evidences WHERE product_id = ?', [id]);
        [...mediaFiles.map((m) => m.url), ...evidenceFiles.map((e) => e.file_url)].forEach((fileUrl) => {
            if (fileUrl && fileUrl.startsWith('/uploads/')) {
                const fp = path.join(__dirname, '..', fileUrl);
                if (fs.existsSync(fp)) fs.unlinkSync(fp);
            }
        });

        await pool.query('DELETE FROM products WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Product deleted.' });
    } catch (err) {
        next(err);
    }
};

// ─── Feature Tests ────────────────────────────────────────────────────────────

// POST /api/product-reviews/:id/feature-tests  — admin
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

// PUT /api/product-reviews/:productId/feature-tests/:testId  — admin
export const updateFeatureTest = async (req, res, next) => {
    try {
        const { productId, testId } = req.params;
        const { feature_name, test_method, result, score, comments, display_order } = req.body;

        const [[check]] = await pool.query(
            'SELECT id FROM product_feature_tests WHERE id = ? AND product_id = ?',
            [testId, productId]
        );
        if (!check) return res.status(404).json({ success: false, message: 'Feature test not found.' });

        await pool.query(
            `UPDATE product_feature_tests SET feature_name=?, test_method=?, result=?, score=?, comments=?, display_order=?
             WHERE id=?`,
            [feature_name.trim(), test_method || null, result || null,
             score != null && score !== '' ? parseFloat(score) : null,
             comments || null, display_order || 0, testId]
        );
        const [[row]] = await pool.query('SELECT * FROM product_feature_tests WHERE id = ?', [testId]);
        return res.json({ success: true, data: row });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/product-reviews/:productId/feature-tests/:testId  — admin
export const deleteFeatureTest = async (req, res, next) => {
    try {
        const { productId, testId } = req.params;
        const [[check]] = await pool.query(
            'SELECT id FROM product_feature_tests WHERE id = ? AND product_id = ?',
            [testId, productId]
        );
        if (!check) return res.status(404).json({ success: false, message: 'Feature test not found.' });
        await pool.query('DELETE FROM product_feature_tests WHERE id = ?', [testId]);
        return res.json({ success: true, message: 'Feature test deleted.' });
    } catch (err) {
        next(err);
    }
};

// ─── Media ────────────────────────────────────────────────────────────────────

// POST /api/product-reviews/:id/media  — admin, multipart
export const uploadMedia = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [[check]] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
        if (!check) return res.status(404).json({ success: false, message: 'Product not found.' });
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded.' });

        const inserted = [];
        for (const file of req.files) {
            const url = `/uploads/products/media/${file.filename}`;
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

// DELETE /api/product-reviews/:productId/media/:mediaId  — admin
export const deleteMedia = async (req, res, next) => {
    try {
        const { productId, mediaId } = req.params;
        const [[row]] = await pool.query(
            'SELECT * FROM product_media WHERE id = ? AND product_id = ?',
            [mediaId, productId]
        );
        if (!row) return res.status(404).json({ success: false, message: 'Media not found.' });

        if (row.url && row.url.startsWith('/uploads/')) {
            const fp = path.join(__dirname, '..', row.url);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await pool.query('DELETE FROM product_media WHERE id = ?', [mediaId]);
        return res.json({ success: true, message: 'Media deleted.' });
    } catch (err) {
        next(err);
    }
};

// ─── Evidences ────────────────────────────────────────────────────────────────

// POST /api/product-reviews/:id/evidences  — admin, multipart
export const uploadEvidence = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [[check]] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
        if (!check) return res.status(404).json({ success: false, message: 'Product not found.' });
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded.' });

        const { feature_test_id } = req.body;
        const ftId = feature_test_id ? parseInt(feature_test_id, 10) || null : null;
        // Validate feature_test_id belongs to this product if provided
        if (ftId) {
            const [[ftCheck]] = await pool.query(
                'SELECT id FROM product_feature_tests WHERE id = ? AND product_id = ?',
                [ftId, id]
            );
            if (!ftCheck) return res.status(400).json({ success: false, message: 'Invalid feature test.' });
        }

        const inserted = [];
        for (const file of req.files) {
            const file_url = `/uploads/products/evidences/${file.filename}`;
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

// DELETE /api/product-reviews/:productId/evidences/:evidenceId  — admin
export const deleteEvidence = async (req, res, next) => {
    try {
        const { productId, evidenceId } = req.params;
        const [[row]] = await pool.query(
            'SELECT * FROM product_evidences WHERE id = ? AND product_id = ?',
            [evidenceId, productId]
        );
        if (!row) return res.status(404).json({ success: false, message: 'Evidence not found.' });

        if (row.file_url && row.file_url.startsWith('/uploads/')) {
            const fp = path.join(__dirname, '..', row.file_url);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await pool.query('DELETE FROM product_evidences WHERE id = ?', [evidenceId]);
        return res.json({ success: true, message: 'Evidence deleted.' });
    } catch (err) {
        next(err);
    }
};

// ─── User Reviews ─────────────────────────────────────────────────────────────

// POST /api/product-reviews/:id/user-reviews  — any authenticated user
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

        // Upsert: update if already reviewed, insert otherwise
        const [[existing]] = await pool.query(
            'SELECT id FROM product_user_reviews WHERE product_id = ? AND user_id = ?',
            [id, userId]
        );
        if (existing) {
            await pool.query(
                'UPDATE product_user_reviews SET rating=?, comment=?, updated_at=NOW() WHERE product_id=? AND user_id=?',
                [parsedRating, comment || null, id, userId]
            );
        } else {
            await pool.query(
                'INSERT INTO product_user_reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
                [id, userId, parsedRating, comment || null]
            );
        }

        const [[stats]] = await pool.query(
            'SELECT ROUND(COALESCE(AVG(rating),0),1) AS avg_rating, COUNT(id) AS review_count FROM product_user_reviews WHERE product_id = ?',
            [id]
        );
        return res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/product-reviews/:id/user-reviews/:reviewId  — own review or admin
export const deleteUserReview = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const [[row]] = await pool.query('SELECT * FROM product_user_reviews WHERE id = ?', [reviewId]);
        if (!row) return res.status(404).json({ success: false, message: 'Review not found.' });

        if (req.user.role !== 'admin' && row.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only delete your own reviews.' });
        }
        await pool.query('DELETE FROM product_user_reviews WHERE id = ?', [reviewId]);
        return res.json({ success: true, message: 'Review deleted.' });
    } catch (err) {
        next(err);
    }
};
