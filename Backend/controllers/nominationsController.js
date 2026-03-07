import pool from '../db/connection.js';
import path from 'path';
import fs from 'fs';
import { verifyRecaptchaToken } from '../middleware/verifyRecaptcha.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const isDupEntry = (err) =>
    err.code === 'ER_DUP_ENTRY' || (err.message && err.message.includes('Duplicate entry'));

// ── GET /api/nominations/awards ───────────────────────────────────────────────
// Returns all active awards with their categories nested
export const getAwards = async (req, res, next) => {
    try {
        const showAll = req.query.all === 'true';
        const [awards] = await pool.query(
            `SELECT * FROM awards ${showAll ? '' : 'WHERE is_active = 1'} ORDER BY created_at DESC`
        );
        const [cats] = await pool.query(`SELECT * FROM award_categories ORDER BY created_at ASC`);

        const result = awards.map((a) => ({
            ...a,
            categories: cats.filter((c) => c.award_id === a.id),
        }));

        return res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/nominations/nominees ─────────────────────────────────────────────
// Filterable by award_id, category_id, timeline, is_winner, search
export const getNominees = async (req, res, next) => {
    try {
        const { award_id, category_id, timeline, search } = req.query;
        const showAll = req.query.all === 'true';

        let sql = `
            SELECT n.*,
                   ac.name     AS category_name,
                   ac.timeline AS category_timeline,
                   a.name      AS award_name
            FROM nominees n
            JOIN award_categories ac ON ac.id = n.category_id
            JOIN awards           a  ON a.id  = n.award_id
            WHERE ${showAll ? '1=1' : 'n.is_active = 1'}
        `;
        const params = [];

        if (award_id)    { sql += ' AND n.award_id    = ?'; params.push(award_id); }
        if (category_id) { sql += ' AND n.category_id = ?'; params.push(category_id); }
        if (timeline)    { sql += ' AND ac.timeline   = ?'; params.push(timeline); }
        if (search)      { sql += ' AND n.name LIKE ?';     params.push(`%${search}%`); }

        // is_winner filter: ?is_winner=true or ?is_winner=false
        if (req.query.is_winner !== undefined) {
            sql += ' AND n.is_winner = ?';
            params.push(req.query.is_winner === 'true' ? 1 : 0);
        }

        sql += ' ORDER BY n.created_at DESC';

        const [rows] = await pool.query(sql, params);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/nominations/nominees/:id ────────────────────────────────────────
export const getNomineeById = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT n.*,
                    ac.name     AS category_name,
                    ac.timeline AS category_timeline,
                    a.name      AS award_name
             FROM nominees n
             JOIN award_categories ac ON ac.id = n.category_id
             JOIN awards           a  ON a.id  = n.award_id
             WHERE n.id = ?`,
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Nominee not found.' });

        // Also attach vote count
        const [[{ vote_count }]] = await pool.query(
            `SELECT COUNT(*) AS vote_count FROM votes WHERE nominee_id = ?`,
            [req.params.id]
        );
        return res.json({ success: true, data: { ...rows[0], vote_count } });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/nominations/nominees/:id/vote ───────────────────────────────────
// Supports both authenticated and anonymous voting
// Anonymous: requires recaptchaToken and anonymousEmail
// Authenticated: uses req.user.id
// One vote per user/email per category
export const castVote = async (req, res, next) => {
    try {
        const nomineeId = parseInt(req.params.id, 10);
        const { isAnonymous, anonymousEmail, recaptchaToken } = req.body;

        // Determine if this is anonymous vote
        const isAnon = Boolean(isAnonymous);
        let userId = null;
        let voterEmail = null;

        if (isAnon) {
            // ── Anonymous Vote Validation ──
            if (!anonymousEmail || !anonymousEmail.trim()) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email is required for anonymous voting.' 
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(anonymousEmail)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Please provide a valid email address.' 
                });
            }

            // Verify reCAPTCHA for anonymous votes
            if (!recaptchaToken) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'reCAPTCHA verification is required for anonymous voting.' 
                });
            }

            const remoteIp = req.ip || req.connection.remoteAddress;
            const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, remoteIp);

            if (!recaptchaResult.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: recaptchaResult.error || 'reCAPTCHA verification failed. Please try again.' 
                });
            }

            voterEmail = anonymousEmail.trim().toLowerCase();
        } else {
            // ── Authenticated Vote ──
            if (!req.user || !req.user.id) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required for non-anonymous voting.' 
                });
            }
            userId = req.user.id;
        }

        // ── Check if nominee exists and is active ──
        const [nomRows] = await pool.query(
            'SELECT id, category_id, award_id, is_active FROM nominees WHERE id = ?',
            [nomineeId]
        );
        if (!nomRows.length || !nomRows[0].is_active) {
            return res.status(404).json({ 
                success: false, 
                message: 'Nominee not found or inactive.' 
            });
        }

        const { category_id, award_id } = nomRows[0];

        // ── Check for existing vote in this category ──
        let existingVoteQuery;
        let existingVoteParams;

        if (isAnon) {
            existingVoteQuery = `
                SELECT id FROM votes 
                WHERE category_id = ? AND is_anonymous = 1 AND anonymous_email = ?
            `;
            existingVoteParams = [category_id, voterEmail];
        } else {
            existingVoteQuery = `
                SELECT id FROM votes 
                WHERE category_id = ? AND user_id = ?
            `;
            existingVoteParams = [category_id, userId];
        }

        const [existingVotes] = await pool.query(existingVoteQuery, existingVoteParams);
        if (existingVotes.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'You have already voted in this category.' 
            });
        }

        // ── Insert the vote ──
        await pool.query(
            `INSERT INTO votes (user_id, nominee_id, category_id, award_id, is_anonymous, anonymous_email) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, nomineeId, category_id, award_id, isAnon, voterEmail]
        );

        return res.status(201).json({ 
            success: true, 
            message: 'Vote cast successfully!' 
        });
    } catch (err) {
        if (isDupEntry(err)) {
            return res.status(409).json({ 
                success: false, 
                message: 'You have already voted in this category.' 
            });
        }
        next(err);
    }
};

// ── GET /api/nominations/my-votes ────────────────────────────────────────────
// Returns array of category_ids the current user has voted in
export const getMyVotes = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT category_id, nominee_id FROM votes WHERE user_id = ?`,
            [req.user.id]
        );
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/nominations/leaderboard  (admin only) ──────────────────────────
export const getLeaderboard = async (req, res, next) => {
    try {
        const [awards] = await pool.query(`SELECT * FROM awards ORDER BY id`);
        const [categories] = await pool.query(`SELECT * FROM award_categories ORDER BY award_id, id`);
        const [nominees] = await pool.query(`
            SELECT n.id AS nominee_id, n.name, n.designation, n.company, n.photo_url,
                   n.linkedin_url, n.category_id, n.award_id,
                   COUNT(v.id) AS vote_count
            FROM nominees n
            LEFT JOIN votes v ON v.nominee_id = n.id
            WHERE n.is_active = 1
            GROUP BY n.id
            ORDER BY n.category_id, vote_count DESC
        `);

        const result = awards.map((a) => ({
            award_id: a.id,
            award_name: a.name,
            categories: categories
                .filter((c) => c.award_id === a.id)
                .map((c) => ({
                    category_id: c.id,
                    category_name: c.name,
                    timeline: c.timeline,
                    nominees: nominees.filter((n) => n.category_id === c.id),
                })),
        }));

        return res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// ── AWARD CRUD (admin) ────────────────────────────────────────────────────────
export const createAward = async (req, res, next) => {
    try {
        const { name, description, is_active = true } = req.body;
        const [r] = await pool.query(
            `INSERT INTO awards (name, description, is_active) VALUES (?, ?, ?)`,
            [name.trim(), description?.trim() || null, Boolean(is_active)]
        );
        const [[row]] = await pool.query(`SELECT * FROM awards WHERE id = ?`, [r.insertId]);
        return res.status(201).json({ success: true, data: row });
    } catch (err) { next(err); }
};

export const updateAward = async (req, res, next) => {
    try {
        const { name, description, is_active } = req.body;
        await pool.query(
            `UPDATE awards SET name=?, description=?, is_active=? WHERE id=?`,
            [name.trim(), description?.trim() || null, Boolean(is_active), req.params.id]
        );
        const [[row]] = await pool.query(`SELECT * FROM awards WHERE id = ?`, [req.params.id]);
        return res.json({ success: true, data: row });
    } catch (err) { next(err); }
};

export const deleteAward = async (req, res, next) => {
    try {
        await pool.query(`DELETE FROM awards WHERE id = ?`, [req.params.id]);
        return res.json({ success: true, message: 'Award deleted.' });
    } catch (err) { next(err); }
};

// ── CATEGORY CRUD (admin) ─────────────────────────────────────────────────────
export const createCategory = async (req, res, next) => {
    try {
        const { award_id, name, timeline } = req.body;
        const [r] = await pool.query(
            `INSERT INTO award_categories (award_id, name, timeline) VALUES (?, ?, ?)`,
            [award_id, name.trim(), timeline]
        );
        const [[row]] = await pool.query(`SELECT * FROM award_categories WHERE id = ?`, [r.insertId]);
        return res.status(201).json({ success: true, data: row });
    } catch (err) { next(err); }
};

export const updateCategory = async (req, res, next) => {
    try {
        const { name, timeline } = req.body;
        await pool.query(
            `UPDATE award_categories SET name=?, timeline=? WHERE id=?`,
            [name.trim(), timeline, req.params.id]
        );
        const [[row]] = await pool.query(`SELECT * FROM award_categories WHERE id = ?`, [req.params.id]);
        return res.json({ success: true, data: row });
    } catch (err) { next(err); }
};

export const deleteCategory = async (req, res, next) => {
    try {
        await pool.query(`DELETE FROM award_categories WHERE id = ?`, [req.params.id]);
        return res.json({ success: true, message: 'Category deleted.' });
    } catch (err) { next(err); }
};

// ── NOMINEE CRUD (admin) ──────────────────────────────────────────────────────
export const createNominee = async (req, res, next) => {
    try {
        const { award_id, category_id, name, designation, company, linkedin_url, achievements, description, is_active = true, is_winner = false } = req.body;
        const [r] = await pool.query(
            `INSERT INTO nominees (award_id, category_id, name, designation, company, linkedin_url, achievements, description, is_active, is_winner)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [award_id, category_id, name.trim(), designation?.trim(), company?.trim(), linkedin_url?.trim() || null, achievements?.trim() || null, description?.trim() || null, Boolean(is_active), Boolean(is_winner)]
        );
        const [[row]] = await pool.query(`SELECT * FROM nominees WHERE id = ?`, [r.insertId]);
        return res.status(201).json({ success: true, data: row });
    } catch (err) { next(err); }
};

export const updateNominee = async (req, res, next) => {
    try {
        const { award_id, category_id, name, designation, company, linkedin_url, achievements, description, is_active, is_winner } = req.body;
        await pool.query(
            `UPDATE nominees SET award_id=?, category_id=?, name=?, designation=?, company=?,
             linkedin_url=?, achievements=?, description=?, is_active=?, is_winner=? WHERE id=?`,
            [award_id, category_id, name.trim(), designation?.trim(), company?.trim(), linkedin_url?.trim() || null, achievements?.trim() || null, description?.trim() || null, Boolean(is_active), Boolean(is_winner ?? false), req.params.id]
        );
        const [[row]] = await pool.query(`SELECT * FROM nominees WHERE id = ?`, [req.params.id]);
        return res.json({ success: true, data: row });
    } catch (err) { next(err); }
};

export const deleteNominee = async (req, res, next) => {
    try {
        const [[nom]] = await pool.query(`SELECT photo_url FROM nominees WHERE id = ?`, [req.params.id]);
        if (nom?.photo_url) {
            const fp = path.resolve(`./${nom.photo_url}`);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await pool.query(`DELETE FROM nominees WHERE id = ?`, [req.params.id]);
        return res.json({ success: true, message: 'Nominee deleted.' });
    } catch (err) { next(err); }
};

// ── POST /api/nominations/nominees/:id/photo  (admin, multipart) ─────────────
export const uploadNomineePhoto = async (req, res, next) => {
    try {
        const [[nom]] = await pool.query(`SELECT id, photo_url FROM nominees WHERE id = ?`, [req.params.id]);
        if (!nom) return res.status(404).json({ success: false, message: 'Nominee not found.' });
        if (!req.file) return res.status(422).json({ success: false, message: 'No image provided.' });

        // Remove old photo
        if (nom.photo_url) {
            const fp = path.resolve(`./${nom.photo_url}`);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }

        const photo_url = `uploads/nominees/${req.file.filename}`;
        await pool.query(`UPDATE nominees SET photo_url = ? WHERE id = ?`, [photo_url, nom.id]);

        const [[updated]] = await pool.query(`SELECT * FROM nominees WHERE id = ?`, [nom.id]);
        return res.json({ success: true, data: updated });
    } catch (err) { next(err); }
};
