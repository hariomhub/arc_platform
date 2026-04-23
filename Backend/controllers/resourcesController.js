import pool from '../db/connection.js';
import { uploadToBlob, deleteFromBlob, getBlobSasUrl } from '../services/azureBlobService.js';
import { notifyAllMembers, NOTIF_TYPES } from '../services/notificationService.js';

// Allowed roles for resource file downloads
const DOWNLOAD_ROLES = ['founding_member', 'council_member', 'professional'];

const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// GET /api/resources/recent-videos
export const getRecentVideos = async (req, res, next) => {
    try {
        const sql = `
            SELECT r.id, r.title, r.description, r.file_url, r.created_at, u.name AS uploader_name
            FROM resources r
            LEFT JOIN users u ON r.uploader_id = u.id
            WHERE r.status = 'approved' AND r.file_url IS NOT NULL
              AND (r.file_url LIKE '%.mp4' OR r.file_url LIKE '%.webm' OR r.file_url LIKE '%.mov' OR r.file_url LIKE '%.avi' OR r.file_url LIKE '%.ogg')
            ORDER BY r.created_at DESC
            LIMIT 3
        `;
        const [rows] = await pool.query(sql);

        const videos = rows.map(({ file_url, ...rest }) => ({
            ...rest,
            video_url: getBlobSasUrl(file_url, 1),
        }));

        return res.json({ success: true, data: videos });
    } catch (err) {
        next(err);
    }
};

// GET /api/resources
export const getResources = async (req, res, next) => {
    try {
        const { type } = req.query;
        const isAdmin = req.user?.role === 'founding_member';

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

        if (!isAdmin) {
            if (req.user) {
                countSql += " AND (r.status = 'approved' OR r.uploader_id = ?)";
                dataSql  += " AND (r.status = 'approved' OR r.uploader_id = ?)";
                params.push(req.user.id);
            } else {
                countSql += " AND r.status = 'approved'";
                dataSql  += " AND r.status = 'approved'";
            }
        }

        if (type) {
            const clause = ' AND r.type = ?';
            countSql += clause;
            dataSql  += clause;
            params.push(type);
        }

        const [[{ total }]] = await pool.query(countSql, params);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        dataSql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
        const [rows] = await pool.query(dataSql, [...params, limit, offset]);

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
        const { file_url, ...rest } = rows[0];
        return res.json({ success: true, data: rest });
    } catch (err) {
        next(err);
    }
};

// GET /api/resources/:id/download  (RBAC + sub-type + monthly limit enforced)
export const downloadResource = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM resources WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }

        const resource = rows[0];
        const { role, professional_sub_type } = req.user;

        // ── Step 1: Role gate ──────────────────────────────────────────────────
        if (!DOWNLOAD_ROLES.includes(role)) {
            return res.status(403).json({ success: false, message: 'Upgrade your plan to access this resource.' });
        }

        // ── Step 2: Sub-type gate for professional members ─────────────────────
        if (role === 'professional' && professional_sub_type !== 'working_professional') {
            return res.status(403).json({
                success: false,
                message: 'Resource downloads are available to Working Professionals only. Please request an upgrade to unlock downloads.',
                code: 'UPGRADE_REQUIRED',
            });
        }

        // ── Step 3: Monthly limit (founding_member is unlimited) ───────────────
        if (role !== 'founding_member') {
            const MONTHLY_LIMIT = 10;
            const userId = req.user.id;

            // Fetch current counter row
            const [[userRow]] = await pool.query(
                'SELECT monthly_downloads, monthly_downloads_reset FROM users WHERE id = ?',
                [userId]
            );

            // Determine if we need to reset (first download ever, or new calendar month)
            const now = new Date();
            const currentMonthStr = now.toISOString().slice(0, 7); // 'YYYY-MM'
            let needsReset = true;
            if (userRow.monthly_downloads_reset) {
                const lastResetDate = new Date(userRow.monthly_downloads_reset);
                if (!isNaN(lastResetDate)) {
                    const lastResetStr = lastResetDate.toISOString().slice(0, 7);
                    if (lastResetStr === currentMonthStr) needsReset = false;
                }
            }

            let currentCount = needsReset ? 0 : userRow.monthly_downloads;

            if (currentCount >= MONTHLY_LIMIT) {
                // Calculate first day of next month for reset info
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                return res.status(429).json({
                    success: false,
                    message: `You have reached your download limit of ${MONTHLY_LIMIT} per month. Your limit resets on ${nextMonth.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
                    code: 'DOWNLOAD_LIMIT_REACHED',
                    used: currentCount,
                    limit: MONTHLY_LIMIT,
                    resets_on: nextMonth.toISOString(),
                });
            }

            // Increment counter (reset if needed)
            if (needsReset) {
                await pool.query(
                    'UPDATE users SET monthly_downloads = 1, monthly_downloads_reset = ? WHERE id = ?',
                    [now.toISOString().slice(0, 10), userId]
                );
            } else {
                await pool.query(
                    'UPDATE users SET monthly_downloads = monthly_downloads + 1 WHERE id = ?',
                    [userId]
                );
            }
            currentCount++;
        }

        // ── Step 4: File check & return SAS URL ────────────────────────────────
        if (!resource.file_url) {
            return res.status(404).json({ success: false, message: 'No file attached to this resource.' });
        }

        const sasUrl = getBlobSasUrl(resource.file_url, 2);

        // Increment the global download counter for the resource
        await pool.query('UPDATE resources SET download_count = download_count + 1 WHERE id = ?', [req.params.id]);

        return res.json({ success: true, url: sasUrl });
    } catch (err) {
        next(err);
    }
};

// GET /api/resources/my-download-usage  — returns current month usage for the logged-in user
export const getMyDownloadUsage = async (req, res, next) => {
    try {
        const { role, professional_sub_type } = req.user;

        // founding_member = unlimited
        if (role === 'founding_member') {
            return res.json({ success: true, data: { used: 0, limit: null, unlimited: true, can_download: true } });
        }

        // final_year_undergrad = no access
        if (role === 'professional' && professional_sub_type !== 'working_professional') {
            return res.json({ success: true, data: { used: 0, limit: 10, unlimited: false, can_download: false, code: 'UPGRADE_REQUIRED' } });
        }

        const MONTHLY_LIMIT = 10;
        const userId = req.user.id;

        const [[userRow]] = await pool.query(
            'SELECT monthly_downloads, monthly_downloads_reset FROM users WHERE id = ?',
            [userId]
        );

        const now = new Date();
        const currentMonthStr = now.toISOString().slice(0, 7);
        let needsReset = true;
        if (userRow.monthly_downloads_reset) {
            const lastResetDate = new Date(userRow.monthly_downloads_reset);
            if (!isNaN(lastResetDate)) {
                const lastResetStr = lastResetDate.toISOString().slice(0, 7);
                if (lastResetStr === currentMonthStr) needsReset = false;
            }
        }
        
        const used = needsReset ? 0 : (userRow.monthly_downloads || 0);

        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        return res.json({
            success: true,
            data: {
                used,
                limit: MONTHLY_LIMIT,
                unlimited: false,
                can_download: used < MONTHLY_LIMIT,
                resets_on: nextMonth.toISOString(),
            },
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/resources/:id/stream  (public — used for home-page video playback)
export const getStreamUrl = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            "SELECT file_url, status FROM resources WHERE id = ?",
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }

        const resource = rows[0];
        if (resource.status !== 'approved') {
            return res.status(403).json({ success: false, message: 'Resource not available.' });
        }
        if (!resource.file_url) {
            return res.status(404).json({ success: false, message: 'No file attached to this resource.' });
        }

        const sasUrl = getBlobSasUrl(resource.file_url, 2);
        return res.json({ success: true, url: sasUrl });
    } catch (err) {
        next(err);
    }
};

// POST /api/resources
export const createResource = async (req, res, next) => {
    try {
        const { title, description, abstract, demo_url, type } = req.body;
        const uploaderRole = req.user.role;

        // Professional members cannot upload resources
        if (!['founding_member', 'council_member'].includes(uploaderRole)) {
            return res.status(403).json({ success: false, message: 'Only Council Members and Founding Members can upload resources.' });
        }

        const ADMIN_ONLY_TYPES = ['framework', 'homepage_video', 'news'];
        const canUploadAdminTypes = uploaderRole === 'founding_member';
        if (ADMIN_ONLY_TYPES.includes(type) && !canUploadAdminTypes) {
            return res.status(403).json({ success: false, message: `Only Founding Members can upload ${type.replace('_', ' ')}s.` });
        }

        let file_url = null;
        if (req.file) {
            file_url = await uploadToBlob(
                'resources',
                req.file.originalname,
                req.file.buffer,
                req.file.mimetype,
                { private: true }
            );
        }

        // Only founding_member gets auto-approved; council_member resources go to pending
        const assignedStatus = uploaderRole === 'founding_member' ? 'approved' : 'pending';
        const [result] = await pool.query(
            `INSERT INTO resources (title, description, abstract, file_url, demo_url, type, status, uploader_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                description ? description.trim() : null,
                abstract    ? abstract.trim()    : null,
                file_url,
                demo_url    ? demo_url.trim()    : null,
                type,
                assignedStatus,
                req.user.id,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM resources WHERE id = ?', [result.insertId]);
        const { file_url: _f, ...rest } = rows[0];

        // Only notify when auto-approved — pending resources wait for admin approval
        if (assignedStatus === 'approved') {
            notifyAllMembers(
                NOTIF_TYPES.RESOURCE_APPROVED,
                `New Resource: ${title.trim()}`,
                `A new ${type.replace('_', ' ')} has been published on AI Risk Council`,
                { url: '/resources', resourceId: String(result.insertId) }
            );
        }

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

        let file_url = check[0].file_url;
        if (req.file) {
            await deleteFromBlob(file_url);
            file_url = await uploadToBlob(
                'resources',
                req.file.originalname,
                req.file.buffer,
                req.file.mimetype,
                { private: true }
            );
        }

        await pool.query(
            `UPDATE resources SET title=?, description=?, abstract=?, file_url=?, demo_url=?, type=? WHERE id=?`,
            [
                title.trim(),
                description ? description.trim() : null,
                abstract    ? abstract.trim()    : null,
                file_url,
                demo_url    ? demo_url.trim()    : null,
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
export const deleteResource = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id, uploader_id, file_url FROM resources WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }

        if (req.user.role !== 'founding_member' && check[0].uploader_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only delete resources you have uploaded.' });
        }

        await deleteFromBlob(check[0].file_url);

        await pool.query('DELETE FROM resources WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: { message: 'Resource deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};

// GET /api/resources/pending — admin only
export const getPendingResources = async (req, res, next) => {
    try {
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM resources WHERE status = 'pending'`);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        const [rows] = await pool.query(
            `SELECT r.*, u.name AS uploader_name, u.email AS uploader_email, u.role AS uploader_role,
                    u.organization_name AS uploader_org
             FROM resources r
             LEFT JOIN users u ON r.uploader_id = u.id
             WHERE r.status = 'pending'
             ORDER BY r.created_at ASC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const sanitized = rows.map(({ file_url, ...rest }) => rest);
        return res.json({ success: true, data: sanitized, total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/resources/:id/approve — admin only
export const approveResource = async (req, res, next) => {
    try {
        const [check] = await pool.query(
            'SELECT id, title, type FROM resources WHERE id = ?',
            [req.params.id]
        );
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }

        await pool.query("UPDATE resources SET status = 'approved' WHERE id = ?", [req.params.id]);

        // Notify all members — fire and forget
        notifyAllMembers(
            NOTIF_TYPES.RESOURCE_APPROVED,
            `New Resource: ${check[0].title}`,
            `A new ${check[0].type.replace('_', ' ')} has been published on AI Risk Council`,
            { url: '/resources', resourceId: String(check[0].id) }
        );

        return res.json({ success: true, data: { message: 'Resource approved.' } });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/resources/:id/reject — admin only
export const rejectResource = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id FROM resources WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }
        await pool.query("UPDATE resources SET status = 'rejected' WHERE id = ?", [req.params.id]);
        return res.json({ success: true, data: { message: 'Resource rejected.' } });
    } catch (err) {
        next(err);
    }
};