import pool from '../db/connection.js';

// FEED (AI Discussions)
export const getFeed = async (req, res) => {
    try {
        const { sort } = req.query;
        const userId = req.user?.id ?? 0;

        const orderBy =
            sort === 'trending'
                ? 'like_count DESC, p.created_at DESC'
                : 'p.created_at DESC';

        const [rows] = await pool.query(`
            SELECT
                p.*,
                u.name AS author_name,
                u.role AS author_role,
                (SELECT COUNT(*) FROM qna_votes v WHERE v.post_id = p.id) AS like_count,
                (SELECT COUNT(*) FROM qna_answers a WHERE a.post_id = p.id) AS comment_count,
                CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS has_user_voted,
                CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS user_vote,
                CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS is_liked,
                CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS liked_by_me
            FROM qna_posts p
            JOIN users u ON p.author_id = u.id
            LEFT JOIN qna_votes uv
                ON uv.post_id = p.id
               AND uv.user_id = ?
            ORDER BY ${orderBy}
        `, [userId]);

        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET SINGLE POST
export const getPostById = async (req, res) => {
    try {
        const userId = req.user?.id ?? 0;

        const [rows] = await pool.query(`
            SELECT
                p.*,
                u.name AS author_name,
                u.role AS author_role,
                (SELECT COUNT(*) FROM qna_votes v WHERE v.post_id = p.id) AS like_count,
                (SELECT COUNT(*) FROM qna_answers a WHERE a.post_id = p.id) AS comment_count,
                CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS has_user_voted,
                CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS user_vote,
                CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS is_liked,
                CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS liked_by_me
            FROM qna_posts p
            JOIN users u ON p.author_id = u.id
            LEFT JOIN qna_votes uv
                ON uv.post_id = p.id
               AND uv.user_id = ?
            WHERE p.id = ?
        `, [userId, req.params.id]);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// CREATE POST (ONLY CHAPTER LEAD)
export const createPost = async (req, res) => {
    try {
        if (req.user.role !== 'council_member') {
            return res.status(403).json({
                success: false,
                message: 'Only Council Members can create posts'
            });
        }

        const { title, body, tags, post_type } = req.body;
        const tagsJson = tags ? JSON.stringify(tags) : null;

        const [result] = await pool.query(`
            INSERT INTO qna_posts (title, body, tags, author_id, post_type)
            VALUES (?, ?, ?, ?, ?)
        `, [
            title.trim(),
            body.trim(),
            tagsJson,
            req.user.id,
            post_type || 'question'
        ]);

        res.status(201).json({
            success: true,
            id: result.insertId
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE POST
export const deletePost = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT author_id FROM qna_posts WHERE id = ?',
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        if (rows[0].author_id !== req.user.id && req.user.role !== 'founding_member') {
            return res.status(403).json({ success: false, message: 'Not allowed' });
        }

        await pool.query('DELETE FROM qna_posts WHERE id = ?', [req.params.id]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// COMMENTS
export const createComment = async (req, res) => {
    try {
        const { body } = req.body;

        const [posts] = await pool.query(
            'SELECT id FROM qna_posts WHERE id = ?',
            [req.params.id]
        );
        if (!posts.length) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        await pool.query(`
            INSERT INTO qna_answers (post_id, author_id, body)
            VALUES (?, ?, ?)
        `, [
            req.params.id,
            req.user.id,
            body.trim()
        ]);

        await pool.query(
            'UPDATE qna_posts SET answer_count = answer_count + 1 WHERE id = ?',
            [req.params.id]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getComments = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                a.*,
                u.name AS author_name,
                u.role AS author_role
            FROM qna_answers a
            JOIN users u ON a.author_id = u.id
            WHERE a.post_id = ?
            ORDER BY a.created_at ASC
        `, [req.params.id]);

        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// LIKE SYSTEM
export const likePost = async (req, res) => {
    try {
        const [result] = await pool.query(`
            INSERT IGNORE INTO qna_votes (post_id, user_id)
            VALUES (?, ?)
        `, [req.params.id, req.user.id]);

        if (result.affectedRows > 0) {
            await pool.query(
                'UPDATE qna_posts SET vote_count = vote_count + 1 WHERE id = ?',
                [req.params.id]
            );
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const unlikePost = async (req, res) => {
    try {
        const [result] = await pool.query(`
            DELETE FROM qna_votes
            WHERE post_id = ? AND user_id = ?
        `, [req.params.id, req.user.id]);

        if (result.affectedRows > 0) {
            await pool.query(
                'UPDATE qna_posts SET vote_count = GREATEST(0, vote_count - 1) WHERE id = ?',
                [req.params.id]
            );
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// SAVE SYSTEM (MAX 10)
export const savePost = async (req, res) => {
    try {
        const userId = req.user.id;

        const [[{ count }]] = await pool.query(`
            SELECT COUNT(*) as count FROM saved_posts WHERE user_id = ?
        `, [userId]);

        if (count >= 10) {
            return res.status(409).json({
                success: false,
                code: 'SAVE_LIMIT_REACHED',
                message: 'Max 10 saved posts allowed'
            });
        }

        await pool.query(`
            INSERT IGNORE INTO saved_posts (post_id, user_id)
            VALUES (?, ?)
        `, [req.params.id, userId]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const unsavePost = async (req, res) => {
    try {
        await pool.query(`
            DELETE FROM saved_posts
            WHERE post_id = ? AND user_id = ?
        `, [req.params.id, req.user.id]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getSavedPosts = async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.query(`
            SELECT
                p.*,
                u.name AS author_name,
                u.role AS author_role,
                1 AS is_saved,
                (SELECT COUNT(*) FROM qna_votes v WHERE v.post_id = p.id) AS like_count,
                (SELECT COUNT(*) FROM qna_answers a WHERE a.post_id = p.id) AS comment_count,
                CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS has_user_voted,
                CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS user_vote,
                CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS is_liked,
                CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS liked_by_me
            FROM saved_posts s
            JOIN qna_posts p ON p.id = s.post_id
            JOIN users u ON p.author_id = u.id
            LEFT JOIN qna_votes uv
                ON uv.post_id = p.id
               AND uv.user_id = ?
            WHERE s.user_id = ?
            ORDER BY p.created_at DESC
        `, [userId, userId]);

        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
