/**
 * blogController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Authored long-form blogs for Chapter Leads (and admins).
 *
 *   Workflow:  draft → pending (submitted) → published | rejected
 *   A lead can edit / delete a blog until it is published; after that only an
 *   admin changes it. Only PUBLISHED blogs count toward the quarterly goal and
 *   are visible to the public.
 *
 *   Public:  GET /api/blogs, GET /api/blogs/:slug
 *   Author:  GET /api/blogs/mine, GET /api/blogs/edit/:id, POST /, PUT /:id,
 *            DELETE /:id, POST /upload-cover
 *   Admin:   GET /api/blogs/admin/list, PATCH /api/blogs/admin/:id/review
 *
 *   Body text is stored as plain text (paragraphs separated by blank lines).
 *   The frontend renders it without ever injecting HTML.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import crypto from 'crypto';
import pool from '../db/connection.js';
import { uploadToBlob } from '../services/azureBlobService.js';
import { notifyUser, NOTIF_TYPES } from '../services/notificationService.js';
import { notifyAdmins } from '../services/chapterLeadService.js';
import { slugify, dbDate } from '../utils/chapterLeadRules.js';

// A blog must have real content before it can be submitted for review.
const MIN_BODY_CHARS_TO_SUBMIT = 400;

const isAdmin = (req) => req.user?.role === 'founding_member';

const paginate = (query, total, defaultLimit = 12) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
    return { page, limit, offset: (page - 1) * limit, totalPages: Math.ceil(total / limit) };
};

const viewsSql = `(SELECT COUNT(*) FROM content_views cv
                   WHERE cv.content_type = 'blog' AND cv.content_id = b.id AND cv.metric = 'view')`;

const shape = (row) => row && ({
    ...row,
    published_at: dbDate(row.published_at),
    created_at: dbDate(row.created_at),
    updated_at: dbDate(row.updated_at),
});

const makeUniqueSlug = async (title, excludeId = null) => {
    const base = slugify(title);
    for (let attempt = 0; attempt < 6; attempt += 1) {
        const suffix = crypto.randomBytes(3).toString('hex'); // 6 chars
        const slug = `${base}-${suffix}`;
        const [rows] = await pool.query('SELECT id FROM blog_posts WHERE slug = ? AND id <> ?', [slug, excludeId || 0]);
        if (!rows.length) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
};

// ── Public ───────────────────────────────────────────────────────────────────

// GET /api/blogs
export const listPublished = async (req, res, next) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        const where = ["b.status = 'published'"];
        const params = [];
        if (q) {
            where.push('(b.title LIKE ? OR b.summary LIKE ?)');
            params.push(`%${q}%`, `%${q}%`);
        }
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM blog_posts b WHERE ${where.join(' AND ')}`, params
        );
        const { page, limit, offset, totalPages } = paginate(req.query, total);
        const [rows] = await pool.query(
            // read_minutes: about 6 characters a word, 200 words a minute (the same estimate the editor uses)
            `SELECT b.id, b.title, b.slug, b.summary, b.cover_url, b.published_at,
                    GREATEST(1, CEIL(CHAR_LENGTH(b.body) / 1200)) AS read_minutes,
                    u.name AS author_name, u.photo_url AS author_photo, u.organization_name AS author_org
             FROM blog_posts b
             JOIN users u ON u.id = b.author_id
             WHERE ${where.join(' AND ')}
             ORDER BY b.published_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        return res.json({ success: true, data: rows.map(shape), total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// GET /api/blogs/:slug  (optionalAuth — the author and admins may preview unpublished posts)
export const getBySlug = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT b.*, u.name AS author_name, u.photo_url AS author_photo,
                    u.organization_name AS author_org, u.bio AS author_bio, u.linkedin_url AS author_linkedin
             FROM blog_posts b
             JOIN users u ON u.id = b.author_id
             WHERE b.slug = ?`,
            [req.params.slug]
        );
        const blog = rows[0];
        const mayPreview = blog && req.user && (isAdmin(req) || req.user.id === blog.author_id);
        if (!blog || (blog.status !== 'published' && !mayPreview)) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }
        // Reviewer notes are only for the author and admins.
        if (!mayPreview) delete blog.admin_notes;
        return res.json({ success: true, data: shape(blog) });
    } catch (err) {
        next(err);
    }
};

// ── Author ───────────────────────────────────────────────────────────────────

// GET /api/blogs/mine
export const listMine = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT b.id, b.title, b.slug, b.summary, b.status, b.admin_notes, b.published_at,
                    b.created_at, b.updated_at, ${viewsSql} AS views
             FROM blog_posts b
             WHERE b.author_id = ?
             ORDER BY b.updated_at DESC`,
            [req.user.id]
        );
        return res.json({ success: true, data: rows.map(shape) });
    } catch (err) {
        next(err);
    }
};

// GET /api/blogs/edit/:id  — full record for the editor (author or admin)
export const getForEdit = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM blog_posts WHERE id = ?', [req.params.id]);
        const blog = rows[0];
        if (!blog || (blog.author_id !== req.user.id && !isAdmin(req))) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }
        return res.json({ success: true, data: shape(blog) });
    } catch (err) {
        next(err);
    }
};

const validateForSubmit = (body) => {
    const text = String(body || '').trim();
    if (text.length < MIN_BODY_CHARS_TO_SUBMIT) {
        return `A blog needs at least ${MIN_BODY_CHARS_TO_SUBMIT} characters before it can be submitted for review.`;
    }
    return null;
};

// POST /api/blogs
export const createBlog = async (req, res, next) => {
    try {
        const { title, summary, body, cover_url, submit } = req.body;
        if (submit) {
            const problem = validateForSubmit(body);
            if (problem) return res.status(422).json({ success: false, message: problem });
        }
        const status = submit ? 'pending' : 'draft';
        const slug = await makeUniqueSlug(title);

        const [result] = await pool.query(
            `INSERT INTO blog_posts (author_id, title, slug, summary, body, cover_url, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, title.trim(), slug, summary ? summary.trim() : null, String(body || ''), cover_url || null, status]
        );

        if (submit) {
            notifyAdmins({
                type: NOTIF_TYPES.LEAD_BLOG_SUBMITTED,
                title: 'New blog awaiting review',
                body: `${req.user.name} submitted "${title.trim()}"`,
                data: { url: '/admin-dashboard?tab=chapter_leads' },
            });
        }
        return res.status(201).json({ success: true, data: { id: result.insertId, slug, status } });
    } catch (err) {
        next(err);
    }
};

// PUT /api/blogs/:id
export const updateBlog = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM blog_posts WHERE id = ?', [req.params.id]);
        const blog = rows[0];
        const admin = isAdmin(req);
        if (!blog || (blog.author_id !== req.user.id && !admin)) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }
        if (blog.status === 'published' && !admin) {
            return res.status(409).json({ success: false, message: 'A published blog can only be changed by an admin. Please contact us if it needs an edit.' });
        }

        const { title, summary, body, cover_url, submit } = req.body;
        if (submit) {
            const problem = validateForSubmit(body);
            if (problem) return res.status(422).json({ success: false, message: problem });
        }
        // Editing keeps a published blog published (admin only). Otherwise the author
        // either saves a draft or (re)submits for review.
        const status = blog.status === 'published' ? 'published' : (submit ? 'pending' : 'draft');

        await pool.query(
            `UPDATE blog_posts
             SET title = ?, summary = ?, body = ?, cover_url = ?, status = ?,
                 admin_notes = CASE WHEN ? = 'pending' THEN NULL ELSE admin_notes END
             WHERE id = ?`,
            [title.trim(), summary ? summary.trim() : null, String(body || ''), cover_url || null, status, status, req.params.id]
        );

        if (submit && blog.status !== 'pending' && blog.status !== 'published') {
            notifyAdmins({
                type: NOTIF_TYPES.LEAD_BLOG_SUBMITTED,
                title: 'Blog awaiting review',
                body: `${req.user.name} submitted "${title.trim()}"`,
                data: { url: '/admin-dashboard?tab=chapter_leads' },
            });
        }
        return res.json({ success: true, data: { id: blog.id, slug: blog.slug, status } });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/blogs/:id
export const deleteBlog = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT id, author_id, status FROM blog_posts WHERE id = ?', [req.params.id]);
        const blog = rows[0];
        const admin = isAdmin(req);
        if (!blog || (blog.author_id !== req.user.id && !admin)) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }
        if (blog.status === 'published' && !admin) {
            return res.status(409).json({ success: false, message: 'A published blog has already been counted. Please contact an admin to remove it.' });
        }
        await pool.query('DELETE FROM blog_posts WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: { message: 'Blog deleted.' } });
    } catch (err) {
        next(err);
    }
};

// POST /api/blogs/upload-cover  (multer puts the file on req.file)
export const uploadCover = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(422).json({ success: false, message: 'No image file provided.' });
        }
        const url = await uploadToBlob('blogs/covers', req.file.originalname, req.file.buffer, req.file.mimetype);
        return res.json({ success: true, data: { url } });
    } catch (err) {
        next(err);
    }
};

// ── Admin ────────────────────────────────────────────────────────────────────

// GET /api/blogs/admin/list?status=pending
export const adminList = async (req, res, next) => {
    try {
        const status = ['draft', 'pending', 'published', 'rejected'].includes(req.query.status) ? req.query.status : null;
        const [rows] = await pool.query(
            `SELECT b.id, b.title, b.slug, b.summary, b.status, b.admin_notes, b.published_at,
                    b.created_at, b.updated_at, u.name AS author_name, ${viewsSql} AS views,
                    CHAR_LENGTH(b.body) AS body_chars
             FROM blog_posts b
             JOIN users u ON u.id = b.author_id
             ${status ? 'WHERE b.status = ?' : "WHERE b.status <> 'draft'"}
             ORDER BY (b.status = 'pending') DESC, b.updated_at DESC
             LIMIT 300`,
            status ? [status] : []
        );
        return res.json({ success: true, data: rows.map(shape) });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/blogs/admin/:id/review   body: { status: 'published' | 'rejected', admin_notes }
export const adminReview = async (req, res, next) => {
    try {
        const { status, admin_notes } = req.body;
        const [rows] = await pool.query('SELECT id, author_id, title, slug, status FROM blog_posts WHERE id = ?', [req.params.id]);
        const blog = rows[0];
        if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });

        if (status === 'published') {
            // published_at is set the first time only, so re-approving never moves a blog to a new quarter.
            await pool.query(
                `UPDATE blog_posts
                 SET status = 'published', reviewed_by = ?, admin_notes = ?,
                     published_at = COALESCE(published_at, UTC_TIMESTAMP())
                 WHERE id = ?`,
                [req.user.id, admin_notes || null, blog.id]
            );
        } else {
            await pool.query(
                `UPDATE blog_posts SET status = 'rejected', reviewed_by = ?, admin_notes = ? WHERE id = ?`,
                [req.user.id, admin_notes || null, blog.id]
            );
        }

        const published = status === 'published';
        notifyUser(
            blog.author_id,
            NOTIF_TYPES.LEAD_BLOG_DECIDED,
            published ? 'Your blog is live' : 'Your blog needs changes',
            published
                ? `"${blog.title}" has been published.`
                : `"${blog.title}" was not published${admin_notes ? `: ${admin_notes}` : '. Open it to see the reviewer notes.'}`,
            { url: published ? `/blog/${blog.slug}` : '/user/dashboard?tab=performance' }
        );
        return res.json({ success: true, data: { id: blog.id, status } });
    } catch (err) {
        next(err);
    }
};
