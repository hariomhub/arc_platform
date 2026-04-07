import pool from '../db/connection.js';
import { notifyUser, NOTIF_TYPES } from '../services/notificationService.js';

const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// Safe JSON parse for tags field
const parseTags = (raw) => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
        return raw.split(',').map((t) => t.trim()).filter(Boolean);
    }
};

const parseTagsInRows = (rows) => rows.map((r) => ({ ...r, tags: parseTags(r.tags) }));

// GET /api/qna
export const getPosts = async (req, res, next) => {
    try {
        const { tags, search, sort } = req.query;
        const orderBy = sort === 'most_voted' ? 'p.vote_count DESC' : 'p.created_at DESC';

        let countSql = `SELECT COUNT(*) AS total FROM qna_posts p WHERE 1=1`;
        let dataSql  = `
            SELECT p.*, u.name AS author_name, u.role AS author_role
            FROM qna_posts p
            JOIN users u ON p.author_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (tags) {
            const clause = ' AND p.tags LIKE ?';
            countSql += clause; dataSql += clause;
            params.push(`%${tags}%`);
        }
        if (search) {
            const clause = ' AND (p.title LIKE ? OR p.body LIKE ?)';
            countSql += clause; dataSql += clause;
            params.push(`%${search}%`, `%${search}%`);
        }

        const [[{ total }]] = await pool.query(countSql, params);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        dataSql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
        const [rows] = await pool.query(dataSql, [...params, limit, offset]);

        return res.json({ success: true, data: parseTagsInRows(rows), total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// GET /api/qna/:id  (with answers)
export const getPostById = async (req, res, next) => {
    try {
        const [posts] = await pool.query(
            `SELECT p.*, u.name AS author_name, u.role AS author_role
             FROM qna_posts p JOIN users u ON p.author_id = u.id
             WHERE p.id = ?`,
            [req.params.id]
        );
        if (posts.length === 0) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        const [answers] = await pool.query(
            `SELECT a.*, u.name AS author_name, u.role AS author_role
             FROM qna_answers a JOIN users u ON a.author_id = u.id
             WHERE a.post_id = ?
             ORDER BY a.created_at ASC`,
            [req.params.id]
        );

        const post = { ...posts[0], tags: parseTags(posts[0].tags) };
        return res.json({ success: true, data: { ...post, answers } });
    } catch (err) {
        next(err);
    }
};

// POST /api/qna  (authenticated users only)
export const createPost = async (req, res, next) => {
    try {
        const { title, body, tags } = req.body;

        let tagsJson = null;
        if (tags) {
            const tagArray = Array.isArray(tags)
                ? tags.map((t) => t.trim()).filter(Boolean)
                : tags.split(',').map((t) => t.trim()).filter(Boolean);
            if (tagArray.length) tagsJson = JSON.stringify(tagArray);
        }

        const [result] = await pool.query(
            'INSERT INTO qna_posts (title, body, tags, author_id) VALUES (?, ?, ?, ?)',
            [title.trim(), body.trim(), tagsJson, req.user.id]
        );

        const [rows] = await pool.query(
            `SELECT p.*, u.name AS author_name, u.role AS author_role
             FROM qna_posts p JOIN users u ON p.author_id = u.id
             WHERE p.id = ?`,
            [result.insertId]
        );

        return res.status(201).json({ success: true, data: { ...rows[0], tags: parseTags(rows[0].tags) } });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/qna/:id  (owner or admin)
export const deletePost = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT author_id FROM qna_posts WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        if (rows[0].author_id !== req.user.id && req.user.role !== 'founding_member') {
            return res.status(403).json({ success: false, message: 'You are not authorised to delete this post.' });
        }

        await pool.query('DELETE FROM qna_posts WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: { message: 'Post deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};

// POST /api/qna/:id/answers  (authenticated users only)
export const createAnswer = async (req, res, next) => {
    try {
        const { body } = req.body;

        // Fetch post — need author_id for notification
        const [posts] = await pool.query(
            'SELECT id, author_id, title FROM qna_posts WHERE id = ?',
            [req.params.id]
        );
        if (posts.length === 0) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        const [result] = await pool.query(
            'INSERT INTO qna_answers (post_id, author_id, body) VALUES (?, ?, ?)',
            [req.params.id, req.user.id, body.trim()]
        );

        // Update denormalized answer_count
        await pool.query('UPDATE qna_posts SET answer_count = answer_count + 1 WHERE id = ?', [req.params.id]);

        const [rows] = await pool.query(
            `SELECT a.*, u.name AS author_name, u.role AS author_role
             FROM qna_answers a JOIN users u ON a.author_id = u.id
             WHERE a.id = ?`,
            [result.insertId]
        );

        // Notify post author — only if answerer is different from post author
        if (posts[0].author_id !== req.user.id) {
            notifyUser(
                posts[0].author_id,
                NOTIF_TYPES.QNA_ANSWERED,
                `${req.user.name} answered your question`,
                posts[0].title,
                { url: `/community-qna/${req.params.id}` }
            );
        }

        return res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/qna/answers/:id  (owner or admin)
export const deleteAnswer = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT author_id, post_id FROM qna_answers WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Answer not found.' });
        }

        if (rows[0].author_id !== req.user.id && req.user.role !== 'founding_member') {
            return res.status(403).json({ success: false, message: 'You are not authorised to delete this answer.' });
        }

        await pool.query('DELETE FROM qna_answers WHERE id = ?', [req.params.id]);
        await pool.query(
            'UPDATE qna_posts SET answer_count = GREATEST(0, answer_count - 1) WHERE id = ?',
            [rows[0].post_id]
        );

        return res.json({ success: true, data: { message: 'Answer deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};

// POST /api/qna/:id/vote  (authenticated users only, one vote per user per post)
export const votePost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const [posts] = await pool.query('SELECT id FROM qna_posts WHERE id = ?', [postId]);
        if (posts.length === 0) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        const [existing] = await pool.query(
            'SELECT id FROM qna_votes WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );

        if (existing.length > 0) {
            await pool.query('DELETE FROM qna_votes WHERE post_id = ? AND user_id = ?', [postId, userId]);
            await pool.query('UPDATE qna_posts SET vote_count = GREATEST(0, vote_count - 1) WHERE id = ?', [postId]);
            return res.json({ success: true, data: { voted: false, message: 'Vote removed.' } });
        }

        await pool.query('INSERT INTO qna_votes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
        await pool.query('UPDATE qna_posts SET vote_count = vote_count + 1 WHERE id = ?', [postId]);

        return res.json({ success: true, data: { voted: true, message: 'Vote added.' } });
    } catch (err) {
        next(err);
    }
};