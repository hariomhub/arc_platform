/**
 * awardPanelController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Jury & Presenters — separate from the generic team_members roster (which is
 * strictly the About Us / leadership page). A panel member with no rows in
 * award_panel_assignments applies to every award ("global"); one or more
 * assignment rows scopes them to specific awards only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import { uploadToBlob, deleteFromBlob } from '../services/azureBlobService.js';

const parseAwardIds = (raw) => {
    if (!raw) return [];
    return String(raw).split(',').map((s) => s.trim()).filter(Boolean).map(Number).filter((n) => Number.isInteger(n));
};

const setAssignments = async (panelMemberId, awardIds) => {
    await pool.query('DELETE FROM award_panel_assignments WHERE panel_member_id = ?', [panelMemberId]);
    if (!awardIds.length) return; // no rows = global
    const values = awardIds.map((id) => [panelMemberId, id]);
    await pool.query('INSERT INTO award_panel_assignments (panel_member_id, award_id) VALUES ?', [values]);
};

// ── GET /api/panel-members ─────────────────────────────────────────────────
// Public: ?award_id=X (returns global members + members assigned to award X)
//         ?type=jury,presenter (optional filter)
// Admin:  ?all=true — every member (active + inactive) with their award_ids
export const getPanelMembers = async (req, res, next) => {
    try {
        const { award_id, type } = req.query;
        const showAll = req.query.all === 'true';

        if (showAll) {
            const [rows] = await pool.query(`
                SELECT m.*, GROUP_CONCAT(a.award_id) AS award_ids
                FROM award_panel_members m
                LEFT JOIN award_panel_assignments a ON a.panel_member_id = m.id
                GROUP BY m.id
                ORDER BY m.created_at DESC
            `);
            const data = rows.map((r) => ({ ...r, award_ids: r.award_ids ? r.award_ids.split(',').map(Number) : [] }));
            return res.json({ success: true, data });
        }

        let sql = `SELECT * FROM award_panel_members m WHERE m.is_active = 1`;
        const params = [];

        if (type) {
            const types = String(type).split(',').map((t) => t.trim()).filter(Boolean);
            if (types.length) { sql += ` AND m.panel_type IN (${types.map(() => '?').join(',')})`; params.push(...types); }
        }

        if (award_id) {
            sql += ` AND (
                NOT EXISTS (SELECT 1 FROM award_panel_assignments a WHERE a.panel_member_id = m.id)
                OR EXISTS (SELECT 1 FROM award_panel_assignments a WHERE a.panel_member_id = m.id AND a.award_id = ?)
            )`;
            params.push(award_id);
        } else {
            // No award context — only show members that apply globally.
            sql += ` AND NOT EXISTS (SELECT 1 FROM award_panel_assignments a WHERE a.panel_member_id = m.id)`;
        }

        sql += ' ORDER BY m.created_at ASC';
        const [rows] = await pool.query(sql, params);
        return res.json({ success: true, data: rows });
    } catch (err) { next(err); }
};

// ── POST /api/panel-members  (admin, multipart) ────────────────────────────
export const createPanelMember = async (req, res, next) => {
    try {
        const { name, role, panel_type, bio, linkedin_url, is_active = true, award_ids } = req.body;

        let photo_url = null;
        if (req.file) {
            photo_url = await uploadToBlob('panel/photos', req.file.originalname, req.file.buffer, req.file.mimetype);
        }

        const [r] = await pool.query(
            `INSERT INTO award_panel_members (name, role, panel_type, photo_url, linkedin_url, bio, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name.trim(), role?.trim() || null, panel_type, photo_url, linkedin_url?.trim() || null, bio?.trim() || null, String(is_active) !== 'false']
        );

        await setAssignments(r.insertId, parseAwardIds(award_ids));

        const [[row]] = await pool.query('SELECT * FROM award_panel_members WHERE id = ?', [r.insertId]);
        return res.status(201).json({ success: true, data: { ...row, award_ids: parseAwardIds(award_ids) } });
    } catch (err) { next(err); }
};

// ── PUT /api/panel-members/:id  (admin, multipart) ─────────────────────────
export const updatePanelMember = async (req, res, next) => {
    try {
        const { name, role, panel_type, bio, linkedin_url, is_active, award_ids } = req.body;

        const [[existing]] = await pool.query('SELECT id, photo_url FROM award_panel_members WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ success: false, message: 'Panel member not found.' });

        let photo_url = existing.photo_url;
        if (req.file) {
            await deleteFromBlob(photo_url);
            photo_url = await uploadToBlob('panel/photos', req.file.originalname, req.file.buffer, req.file.mimetype);
        }

        await pool.query(
            `UPDATE award_panel_members SET name=?, role=?, panel_type=?, photo_url=?, linkedin_url=?, bio=?, is_active=? WHERE id=?`,
            [name.trim(), role?.trim() || null, panel_type, photo_url, linkedin_url?.trim() || null, bio?.trim() || null, String(is_active) !== 'false', req.params.id]
        );

        await setAssignments(req.params.id, parseAwardIds(award_ids));

        const [[row]] = await pool.query('SELECT * FROM award_panel_members WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: { ...row, award_ids: parseAwardIds(award_ids) } });
    } catch (err) { next(err); }
};

// ── DELETE /api/panel-members/:id  (admin) ─────────────────────────────────
export const deletePanelMember = async (req, res, next) => {
    try {
        const [[row]] = await pool.query('SELECT photo_url FROM award_panel_members WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ success: false, message: 'Panel member not found.' });

        await deleteFromBlob(row.photo_url);
        await pool.query('DELETE FROM award_panel_members WHERE id = ?', [req.params.id]);
        return res.json({ success: true, message: 'Panel member removed.' });
    } catch (err) { next(err); }
};
