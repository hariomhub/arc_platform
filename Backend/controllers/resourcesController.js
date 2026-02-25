import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed roles for framework download
const DOWNLOAD_ROLES = ['admin', 'executive', 'paid_member', 'product_company'];

const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// GET /api/resources
export const getResources = async (req, res, next) => {
    try {
        const { type } = req.query;

        let countSql = `
      SELECT COUNT(*) AS total FROM resources r
      LEFT JOIN users u ON r.uploader_id = u.id
      WHERE 1=1
    `;
        let dataSql = `
      SELECT r.*, u.name AS uploader_name, u.organization_name AS uploader_org
      FROM resources r
      LEFT JOIN users u ON r.uploader_id = u.id
      WHERE 1=1
    `;
        const params = [];

        if (type) {
            const clause = ' AND r.type = ?';
            countSql += clause;
            dataSql += clause;
            params.push(type);
        }

        const [[{ total }]] = await pool.query(countSql, params);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        dataSql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
        const [rows] = await pool.query(dataSql, [...params, limit, offset]);

        // Strip file_url from response — clients must use the download endpoint
        const sanitized = rows.map(({ file_url, ...rest }) => rest);

        return res.json({ success: true, data: sanitized, total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// GET /api/resources/:id
export const getResourceById = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT r.*, u.name AS uploader_name, u.organization_name AS uploader_org
       FROM resources r LEFT JOIN users u ON r.uploader_id = u.id
       WHERE r.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }
        // Remove file_url from public detail view
        const { file_url, ...rest } = rows[0];
        return res.json({ success: true, data: rest });
    } catch (err) {
        next(err);
    }
};

// GET /api/resources/:id/download  (RBAC enforced)
export const downloadResource = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM resources WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }

        const resource = rows[0];

        // All downloads require role-based access
        if (!DOWNLOAD_ROLES.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Upgrade your plan to access this resource.' });
        }

        if (!resource.file_url) {
            return res.status(404).json({ success: false, message: 'No file attached to this resource.' });
        }

        // Serve the file from the uploads directory
        const filePath = path.join(__dirname, '..', resource.file_url);
        return res.download(filePath, (err) => {
            if (err) {
                return res.status(404).json({ success: false, message: 'File not found on server.' });
            }
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/resources  (whitepaper: university only | product: product_company only | framework: admin only)
export const createResource = async (req, res, next) => {
    try {
        const { title, description, abstract, demo_url, type } = req.body;
        const uploaderRole = req.user.role;

        // RBAC for upload type
        if (type === 'whitepaper' && uploaderRole !== 'university' && uploaderRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only university members can upload whitepapers.' });
        }
        if (type === 'product' && uploaderRole !== 'product_company' && uploaderRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only product companies can upload products.' });
        }
        if (type === 'framework' && uploaderRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only admins can upload frameworks.' });
        }

        const file_url = req.file ? `/uploads/${req.file.filename}` : null;

        const [result] = await pool.query(
            `INSERT INTO resources (title, description, abstract, file_url, demo_url, type, uploader_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                description ? description.trim() : null,
                abstract ? abstract.trim() : null,
                file_url,
                demo_url ? demo_url.trim() : null,
                type,
                req.user.id,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM resources WHERE id = ?', [result.insertId]);
        const { file_url: _f, ...rest } = rows[0];
        return res.status(201).json({ success: true, data: rest });
    } catch (err) {
        next(err);
    }
};

// PUT /api/resources/:id  (admin only)
export const updateResource = async (req, res, next) => {
    try {
        const { title, description, abstract, demo_url, type } = req.body;

        const [check] = await pool.query('SELECT id, file_url FROM resources WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }

        const file_url = req.file ? `/uploads/${req.file.filename}` : check[0].file_url;

        await pool.query(
            `UPDATE resources SET title=?, description=?, abstract=?, file_url=?, demo_url=?, type=? WHERE id=?`,
            [
                title.trim(),
                description ? description.trim() : null,
                abstract ? abstract.trim() : null,
                file_url,
                demo_url ? demo_url.trim() : null,
                type,
                req.params.id,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM resources WHERE id = ?', [req.params.id]);
        const { file_url: _f, ...rest } = rows[0];
        return res.json({ success: true, data: rest });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/resources/:id
// admin: delete any | university/product_company: only their own
export const deleteResource = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id, uploader_id FROM resources WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }

        if (req.user.role !== 'admin' && check[0].uploader_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only delete resources you have uploaded.' });
        }

        await pool.query('DELETE FROM resources WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: { message: 'Resource deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};
