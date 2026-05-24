/**
 * feedController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Social feed replacing Community Q&A.
 *
 * Access rules (enforced here + in routes):
 *   CREATE post   : council_member, founding_member
 *   EDIT post     : own post only (council_member, founding_member)
 *   DELETE post   : own post (council_member, founding_member) OR founding_member any
 *   HIDE post     : founding_member only
 *   COMMENT       : all logged-in users
 *   LIKE          : all logged-in users (posts + comments)
 *   SAVE          : all logged-in users (max 10)
 *   VIEW feed     : public (no auth required)
 *
 * Ranking algorithm:
 *   score = ((likes×3) + (comments×2) + (saves×1)) / (hours_since_posted + 2)^1.5
 *   Posts older than 30 days: score × 0.1
 *   Hidden posts excluded entirely from feed
 *   Score recalculated by feedScoreJob cron every 30 minutes
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import { uploadToBlob, deleteFromBlob } from '../services/azureBlobService.js';
import axios from 'axios';
import { notifyUser, NOTIF_TYPES } from '../services/notificationService.js';
import multer from 'multer';

// ── Multer — memory storage for Azure Blob upload ─────────────────────────────
export const feedUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.'));
    },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

const parseTags = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
};

const sanitizeTags = (tags) => {
    if (!tags) return null;
    const arr = Array.isArray(tags) ? tags : (typeof tags === 'string' ? JSON.parse(tags) : []);
    const clean = arr
        .map(t => String(t).trim().toLowerCase().replace(/[^a-z0-9\-_\s]/g, '').slice(0, 30))
        .filter(Boolean)
        .slice(0, 5);
    return clean.length ? JSON.stringify(clean) : null;
};

const isValidYoutubeUrl = (url) => {
    if (!url) return false;
    return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(url);
};

// Extract YouTube video ID for embed
const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
};

// Attach media + author info + reactions + poll votes to post rows
const enrichPosts = async (posts, currentUserId) => {
    if (!posts.length) return posts;
    const postIds = posts.map(p => p.id);
    const placeholders = postIds.map(() => '?').join(',');

    // Fetch media for all posts in one query
    const [mediaRows] = await pool.query(
        `SELECT * FROM feed_post_media WHERE post_id IN (${placeholders}) ORDER BY display_order ASC`,
        postIds
    );

    // If user is logged in, fetch likes, saves, reactions, poll votes
    let likedSet    = new Set();
    let savedSet    = new Set();
    let reactionMap = {};  // postId -> reaction_type
    let pollVoteMap = {};  // postId -> option_index

    if (currentUserId) {
        const [likeRows] = await pool.query(
            `SELECT target_id FROM feed_likes
             WHERE user_id = ? AND target_type = 'post' AND target_id IN (${placeholders})`,
            [currentUserId, ...postIds]
        );
        likedSet = new Set(likeRows.map(r => r.target_id));

        const [saveRows] = await pool.query(
            `SELECT post_id FROM feed_saves WHERE user_id = ? AND post_id IN (${placeholders})`,
            [currentUserId, ...postIds]
        );
        savedSet = new Set(saveRows.map(r => r.post_id));

        // Fetch typed reactions (ai_product, event, troubleshooting)
        const [reactionRows] = await pool.query(
            `SELECT post_id, reaction_type FROM feed_reactions
             WHERE user_id = ? AND post_id IN (${placeholders})`,
            [currentUserId, ...postIds]
        );
        reactionRows.forEach(r => { reactionMap[r.post_id] = r.reaction_type; });

        // Fetch poll votes
        const [pollVoteRows] = await pool.query(
            `SELECT post_id, option_index FROM feed_poll_votes
             WHERE user_id = ? AND post_id IN (${placeholders})`,
            [currentUserId, ...postIds]
        );
        pollVoteRows.forEach(r => { pollVoteMap[r.post_id] = r.option_index; });
    }

    // Fetch poll vote counts for all poll posts
    const pollPostIds = posts.filter(p => p.post_type === 'poll').map(p => p.id);
    const pollPostIdSet = new Set(pollPostIds);
    const pollCountsMap = {}; // postId -> { optionIndex: count }

    if (pollPostIds.length > 0) {
        const pollPh = pollPostIds.map(() => '?').join(',');
        const [pollCountRows] = await pool.query(
            `SELECT post_id, option_index, COUNT(*) AS cnt
             FROM feed_poll_votes WHERE post_id IN (${pollPh})
             GROUP BY post_id, option_index`,
            pollPostIds
        );
        pollCountRows.forEach(r => {
            if (!pollCountsMap[r.post_id]) pollCountsMap[r.post_id] = {};
            pollCountsMap[r.post_id][r.option_index] = parseInt(r.cnt, 10);
        });
    }

    // Group media by post_id
    const mediaByPost = {};
    for (const m of mediaRows) {
        if (!mediaByPost[m.post_id]) mediaByPost[m.post_id] = [];
        mediaByPost[m.post_id].push(m);
    }

    return posts.map(p => {
        // Safely parse JSON columns
        let parsedPollOptions = null;
        if (p.poll_options) {
            try { parsedPollOptions = typeof p.poll_options === 'string' ? JSON.parse(p.poll_options) : p.poll_options; }
            catch { parsedPollOptions = null; }
        }
        let parsedReactionCounts = null;
        if (p.reaction_counts) {
            try { parsedReactionCounts = typeof p.reaction_counts === 'string' ? JSON.parse(p.reaction_counts) : p.reaction_counts; }
            catch { parsedReactionCounts = null; }
        }

        return {
            ...p,
            tags:              parseTags(p.tags),
            poll_options:      parsedPollOptions,
            reaction_counts:   parsedReactionCounts,
            media:             mediaByPost[p.id] || [],
            is_liked:          likedSet.has(p.id),
            is_saved:          savedSet.has(p.id),
            user_reaction:     reactionMap[p.id] || null,
            user_poll_vote:    pollVoteMap[p.id] !== undefined ? pollVoteMap[p.id] : null,
            poll_vote_counts:  pollPostIdSet.has(p.id) ? (pollCountsMap[p.id] || {}) : null,
        };
    });
};

// ════════════════════════════════════════════════════════════════════════════
// POSTS — CRUD
// ════════════════════════════════════════════════════════════════════════════

// GET /api/qna  — public feed, paginated
// Query params: sort (trending|latest|discussed), tags, page, limit
export const getFeed = async (req, res, next) => {
    try {
        const { sort = 'trending', tags, search } = req.query;
        const currentUserId = req.user?.id || null;

        // Only admins see hidden posts (and only their own hidden posts for authors)
        const isAdmin = req.user?.role === 'founding_member';

        let countSql = `
            SELECT COUNT(*) AS total FROM feed_posts fp
            JOIN users u ON fp.author_id = u.id
            WHERE 1=1
        `;
        let dataSql = `
            SELECT fp.*,
                   u.name AS author_name,
                   u.email AS author_email,
                   u.role AS author_role,
                   u.photo_url AS author_photo,
                   u.organization_name AS author_org,
                   u.profile_badge AS author_badge
            FROM feed_posts fp
            JOIN users u ON fp.author_id = u.id
            WHERE 1=1
        `;
        const params = [];

        // Hidden post logic:
        // - founding_member sees all
        // - author sees their own hidden post with a warning
        // - everyone else: hidden posts excluded
        if (!isAdmin) {
            if (currentUserId) {
                countSql += ` AND (fp.is_hidden = 0 OR fp.author_id = ?)`;
                dataSql += ` AND (fp.is_hidden = 0 OR fp.author_id = ?)`;
                params.push(currentUserId);
            } else {
                countSql += ` AND fp.is_hidden = 0`;
                dataSql += ` AND fp.is_hidden = 0`;
            }
        }

        if (tags) {
            const clause = ` AND fp.tags LIKE ?`;
            countSql += clause; dataSql += clause;
            params.push(`%${tags}%`);
        }
        if (search) {
            const clause = ` AND fp.content LIKE ?`;
            countSql += clause; dataSql += clause;
            params.push(`%${search}%`);
        }
        // Filter by post type
        const validPostTypes = ['ai_product', 'poll', 'event', 'troubleshooting', 'general', 'tech_meme'];
        if (req.query.post_type && validPostTypes.includes(req.query.post_type)) {
            const clause = ` AND fp.post_type = ?`;
            countSql += clause; dataSql += clause;
            params.push(req.query.post_type);
        }

        const [[{ total }]] = await pool.query(countSql, params);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        const orderBy = sort === 'latest' ? 'fp.created_at DESC'
            : sort === 'discussed' ? 'fp.comment_count DESC, fp.created_at DESC'
                : 'fp.score DESC, fp.created_at DESC'; // trending default

        dataSql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
        const [rows] = await pool.query(dataSql, [...params, limit, offset]);

        const enriched = await enrichPosts(rows, currentUserId);

        return res.json({ success: true, data: enriched, total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// GET /api/qna/:id  — single post with media + comments
export const getPostById = async (req, res, next) => {
    try {
        const currentUserId = req.user?.id || null;
        const isAdmin = req.user?.role === 'founding_member';

        const [posts] = await pool.query(
            `SELECT fp.*,
                    u.name AS author_name,
                    u.email AS author_email,
                    u.role AS author_role,
                    u.photo_url AS author_photo,
                    u.bio AS author_bio,
                    u.organization_name AS author_org,
                    u.profile_badge AS author_badge
             FROM feed_posts fp
             JOIN users u ON fp.author_id = u.id
             WHERE fp.id = ?`,
            [req.params.id]
        );

        if (!posts.length) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        const post = posts[0];

        // Hidden post: only author and founding_member can see it
        if (post.is_hidden && !isAdmin && post.author_id !== currentUserId) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        const [enriched] = await enrichPosts([post], currentUserId);
        return res.json({ success: true, data: enriched });
    } catch (err) {
        next(err);
    }
};

// POST /api/qna  — create post (council_member + founding_member)
export const createPost = async (req, res, next) => {
    try {
        const {
            content, tags, video_url,
            post_type = 'general',
            poll_options, poll_duration,
            event_link,
        } = req.body;

        // Tech Memes can have empty content (image-only posts)
        if (post_type !== 'tech_meme' && (!content || !content.trim())) {
            return res.status(422).json({ success: false, message: 'Post content is required.' });
        }
        if (content && content.trim().length > 5000) {
            return res.status(422).json({ success: false, message: 'Post content must be 5000 characters or fewer.' });
        }

        // Validate post_type
        const validPostTypes = ['ai_product', 'poll', 'event', 'troubleshooting', 'general', 'tech_meme'];
        if (!validPostTypes.includes(post_type)) {
            return res.status(422).json({ success: false, message: 'Invalid post type.' });
        }

        // Validate YouTube URL if provided
        if (video_url && !isValidYoutubeUrl(video_url)) {
            return res.status(422).json({ success: false, message: 'Only YouTube video links are allowed.' });
        }

        // Tech Memes validation: must have at least one image and no text content
        if (post_type === 'tech_meme') {
            if (content && content.trim().length > 0) {
                return res.status(422).json({ success: false, message: 'Tech Memes cannot contain any text content.' });
            }
            const hasImages = req.files && req.files.some(f => f.mimetype.startsWith('image/'));
            if (!hasImages) {
                return res.status(422).json({ success: false, message: 'Tech Memes must contain at least one image.' });
            }
            const hasPdf = req.files && req.files.some(f => f.mimetype === 'application/pdf');
            if (hasPdf || video_url) {
                return res.status(422).json({ success: false, message: 'Tech Memes can only contain images.' });
            }
        }

        // Auto-reclassify: if post has ONLY images (no text, no PDF, no video) → tech_meme
        let effectivePostType = post_type;
        if (post_type !== 'tech_meme') {
            const noContent = !content || !content.trim();
            const hasOnlyImages = req.files && req.files.length > 0 && req.files.every(f => f.mimetype.startsWith('image/'));
            const noVideo = !video_url;
            if (noContent && hasOnlyImages && noVideo) {
                effectivePostType = 'tech_meme';
            }
        }

        const finalContent = effectivePostType === 'tech_meme' ? '' : (content ? content.trim() : '');

        // Handle poll-specific fields
        let pollOptionsJson = null;
        let pollEndsAt = null;
        if (effectivePostType === 'poll') {
            let opts;
            try { opts = typeof poll_options === 'string' ? JSON.parse(poll_options) : poll_options; }
            catch { opts = null; }
            if (!Array.isArray(opts) || opts.length < 2) {
                return res.status(422).json({ success: false, message: 'A poll requires at least 2 options.' });
            }
            if (opts.length > 5) {
                return res.status(422).json({ success: false, message: 'A poll allows a maximum of 5 options.' });
            }
            const cleanOpts = opts.map(o => String(o).trim()).filter(Boolean);
            if (cleanOpts.length < 2) {
                return res.status(422).json({ success: false, message: 'Poll options must not be empty.' });
            }
            pollOptionsJson = JSON.stringify(cleanOpts);
            // Compute poll expiry
            const durationHours = { '24h': 24, '3d': 72, '7d': 168 };
            const hours = durationHours[poll_duration];
            if (hours) {
                const end = new Date();
                end.setHours(end.getHours() + hours);
                pollEndsAt = end.toISOString().slice(0, 19).replace('T', ' ');
            }
        }

        // Handle event link
        let cleanEventLink = null;
        if (effectivePostType === 'event' && event_link && event_link.trim()) {
            cleanEventLink = event_link.trim().slice(0, 500);
        }

        const tagsJson = sanitizeTags(tags);

        const [result] = await pool.query(
            `INSERT INTO feed_posts (author_id, post_type, content, tags, poll_options, poll_ends_at, event_link)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, effectivePostType, finalContent, tagsJson, pollOptionsJson, pollEndsAt, cleanEventLink]
        );

        const postId = result.insertId;

        await pool.query(
            `UPDATE feed_posts
     SET score = ROUND(1 / POW(2, 1.5), 4), score_updated_at = NOW()
     WHERE id = ?`,
            [postId]
        );

        // Handle media uploads (images + PDFs) — up to 5 total including video link
        const uploadedMedia = [];
        let mediaCount = 0;

        // Count YouTube as 1 media slot
        if (video_url) {
            const embedUrl = getYoutubeEmbedUrl(video_url);
            await pool.query(
                `INSERT INTO feed_post_media (post_id, url, type, original_name, display_order)
                 VALUES (?, ?, 'video_link', 'YouTube Video', ?)`,
                [postId, embedUrl || video_url, mediaCount]
            );
            uploadedMedia.push({ url: embedUrl || video_url, type: 'video_link' });
            mediaCount++;
        }

        // Handle file uploads
        if (req.files && req.files.length > 0) {
            const remaining = 5 - mediaCount;
            const filesToProcess = req.files.slice(0, remaining);

            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];
                const mediaType = file.mimetype === 'application/pdf' ? 'pdf' : 'image';
                const folder = `feed/${req.user.id}/${postId}/${mediaType === 'pdf' ? 'pdfs' : 'images'}`;

                try {
                    const url = await uploadToBlob(folder, file.originalname, file.buffer, file.mimetype);
                    await pool.query(
                        `INSERT INTO feed_post_media (post_id, url, type, original_name, display_order)
                         VALUES (?, ?, ?, ?, ?)`,
                        [postId, url, mediaType, file.originalname, mediaCount + i]
                    );
                    uploadedMedia.push({ url, type: mediaType, original_name: file.originalname });
                } catch (uploadErr) {
                    console.error(`[FeedController] Media upload failed for file ${file.originalname}:`, uploadErr.message);
                    // Continue — don't fail the whole post for one failed upload
                }
            }
        }

        // Fetch the created post with author info
        const [rows] = await pool.query(
            `SELECT fp.*, u.name AS author_name, u.role AS author_role,
                    u.photo_url AS author_photo, u.organization_name AS author_org, u.profile_badge AS author_badge
             FROM feed_posts fp JOIN users u ON fp.author_id = u.id
             WHERE fp.id = ?`,
            [postId]
        );

        const [enriched] = await enrichPosts(rows, req.user.id);
        return res.status(201).json({ success: true, data: enriched });
    } catch (err) {
        next(err);
    }
};

// PUT /api/qna/:id  — edit post (own post only)
export const updatePost = async (req, res, next) => {
    try {
        const { content, tags } = req.body;

        const [posts] = await pool.query('SELECT * FROM feed_posts WHERE id = ?', [req.params.id]);
        if (!posts.length) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        const post = posts[0];
        if (post.author_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only edit your own posts.' });
        }

        if (post.post_type === 'tech_meme') {
            if (content && content.trim().length > 0) {
                return res.status(422).json({ success: false, message: 'Tech Memes cannot contain any text content.' });
            }
        } else {
            if (!content || !content.trim()) {
                return res.status(422).json({ success: false, message: 'Post content is required.' });
            }
            if (content.trim().length > 5000) {
                return res.status(422).json({ success: false, message: 'Post content must be 5000 characters or fewer.' });
            }
        }

        const tagsJson = sanitizeTags(tags);
        const finalContent = post.post_type === 'tech_meme' ? '' : content.trim();

        await pool.query(
            `UPDATE feed_posts SET content = ?, tags = ?, is_edited = 1 WHERE id = ?`,
            [finalContent, tagsJson, req.params.id]
        );

        const [rows] = await pool.query(
            `SELECT fp.*, u.name AS author_name, u.role AS author_role,
                    u.photo_url AS author_photo, u.organization_name AS author_org, u.profile_badge AS author_badge
             FROM feed_posts fp JOIN users u ON fp.author_id = u.id
             WHERE fp.id = ?`,
            [req.params.id]
        );

        const [enriched] = await enrichPosts(rows, req.user.id);
        return res.json({ success: true, data: enriched });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/qna/:id  — own post or founding_member any
export const deletePost = async (req, res, next) => {
    try {
        const [posts] = await pool.query(
            'SELECT id, author_id FROM feed_posts WHERE id = ?',
            [req.params.id]
        );
        if (!posts.length) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        if (posts[0].author_id !== req.user.id && req.user.role !== 'founding_member') {
            return res.status(403).json({ success: false, message: 'You are not authorised to delete this post.' });
        }

        // Delete media from Azure Blob before deleting the post
        const [mediaRows] = await pool.query(
            `SELECT url, type FROM feed_post_media WHERE post_id = ?`,
            [req.params.id]
        );
        for (const m of mediaRows) {
            if (m.type !== 'video_link') {
                await deleteFromBlob(m.url);
            }
        }

        // Cascade deletes handle feed_post_media, feed_comments, feed_likes, feed_saves
        await pool.query('DELETE FROM feed_posts WHERE id = ?', [req.params.id]);

        return res.json({ success: true, data: { message: 'Post deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/qna/:id/hide  — founding_member only
export const toggleHidePost = async (req, res, next) => {
    try {
        const [posts] = await pool.query(
            'SELECT id, author_id, is_hidden FROM feed_posts WHERE id = ?',
            [req.params.id]
        );
        if (!posts.length) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        const post = posts[0];
        const newHiddenState = post.is_hidden ? 0 : 1;

        await pool.query(
            'UPDATE feed_posts SET is_hidden = ? WHERE id = ?',
            [newHiddenState, req.params.id]
        );

        // Notify post author if hiding (not when unhiding)
        if (newHiddenState === 1) {
            notifyUser(
                post.author_id,
                NOTIF_TYPES.FEED_POST_HIDDEN,
                'Your post has been hidden',
                'An administrator has hidden your post. It is now only visible to you.',
                { url: `/community-qna/${req.params.id}` }
            );
        }

        return res.json({
            success: true,
            data: {
                message: newHiddenState ? 'Post hidden successfully.' : 'Post is now visible.',
                is_hidden: !!newHiddenState,
            }
        });
    } catch (err) {
        next(err);
    }
};

// ════════════════════════════════════════════════════════════════════════════
// MEDIA
// ════════════════════════════════════════════════════════════════════════════

// POST /api/qna/:id/media  — add media to existing post (own post only)
export const addMedia = async (req, res, next) => {
    try {
        const [posts] = await pool.query(
            'SELECT id, author_id FROM feed_posts WHERE id = ?',
            [req.params.id]
        );
        if (!posts.length) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }
        if (posts[0].author_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only add media to your own posts.' });
        }

        // Count existing media
        const [[{ existing }]] = await pool.query(
            'SELECT COUNT(*) AS existing FROM feed_post_media WHERE post_id = ?',
            [req.params.id]
        );
        if (existing >= 5) {
            return res.status(422).json({ success: false, message: 'Maximum 5 media items per post.' });
        }

        const { video_url } = req.body;
        const added = [];

        if (video_url) {
            if (!isValidYoutubeUrl(video_url)) {
                return res.status(422).json({ success: false, message: 'Only YouTube video links are allowed.' });
            }
            if (existing >= 5) {
                return res.status(422).json({ success: false, message: 'Maximum 5 media items per post.' });
            }
            const embedUrl = getYoutubeEmbedUrl(video_url);
            await pool.query(
                `INSERT INTO feed_post_media (post_id, url, type, original_name, display_order)
                 VALUES (?, ?, 'video_link', 'YouTube Video', ?)`,
                [req.params.id, embedUrl || video_url, existing]
            );
            added.push({ url: embedUrl || video_url, type: 'video_link' });
        }

        if (req.files && req.files.length > 0) {
            const slots = 5 - existing - added.length;
            const files = req.files.slice(0, slots);
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const mediaType = file.mimetype === 'application/pdf' ? 'pdf' : 'image';
                const folder = `feed/${req.user.id}/${req.params.id}/${mediaType === 'pdf' ? 'pdfs' : 'images'}`;
                const url = await uploadToBlob(folder, file.originalname, file.buffer, file.mimetype);
                await pool.query(
                    `INSERT INTO feed_post_media (post_id, url, type, original_name, display_order)
                     VALUES (?, ?, ?, ?, ?)`,
                    [req.params.id, url, mediaType, file.originalname, existing + added.length + i]
                );
                added.push({ url, type: mediaType, original_name: file.originalname });
            }
        }

        return res.status(201).json({ success: true, data: added });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/qna/:id/media/:mediaId  — remove media (own post only)
export const deleteMedia = async (req, res, next) => {
    try {
        const [posts] = await pool.query(
            'SELECT author_id FROM feed_posts WHERE id = ?',
            [req.params.id]
        );
        if (!posts.length) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }
        if (posts[0].author_id !== req.user.id && req.user.role !== 'founding_member') {
            return res.status(403).json({ success: false, message: 'Not authorised.' });
        }

        const [media] = await pool.query(
            'SELECT * FROM feed_post_media WHERE id = ? AND post_id = ?',
            [req.params.mediaId, req.params.id]
        );
        if (!media.length) {
            return res.status(404).json({ success: false, message: 'Media not found.' });
        }

        if (media[0].type !== 'video_link') {
            await deleteFromBlob(media[0].url);
        }
        await pool.query('DELETE FROM feed_post_media WHERE id = ?', [req.params.mediaId]);

        return res.json({ success: true, data: { message: 'Media removed.' } });
    } catch (err) {
        next(err);
    }
};

// ════════════════════════════════════════════════════════════════════════════
// LIKES — Posts and Comments
// ════════════════════════════════════════════════════════════════════════════

// POST /api/qna/:id/like  — toggle like on post
export const togglePostLike = async (req, res, next) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const userId = req.user.id;

        const [posts] = await pool.query(
            'SELECT id, author_id FROM feed_posts WHERE id = ?',
            [postId]
        );
        if (!posts.length) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        const [existing] = await pool.query(
            `SELECT id FROM feed_likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?`,
            [userId, postId]
        );

        if (existing.length) {
            // Unlike
            await pool.query(
                `DELETE FROM feed_likes WHERE user_id = ? AND target_type = 'post' AND target_id = ?`,
                [userId, postId]
            );
            await pool.query(
                `UPDATE feed_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = ?`,
                [postId]
            );

            // Decrement digest log if it exists
            await pool.query(
                `UPDATE feed_like_digest_log
                 SET pending_count = GREATEST(0, pending_count - 1)
                 WHERE target_type = 'post' AND target_id = ?`,
                [postId]
            );

            return res.json({ success: true, data: { liked: false } });
        }

        // Like
        await pool.query(
            `INSERT INTO feed_likes (user_id, target_type, target_id) VALUES (?, 'post', ?)`,
            [userId, postId]
        );
        await pool.query(
            `UPDATE feed_posts SET like_count = like_count + 1 WHERE id = ?`,
            [postId]
        );

        // Update or insert into like digest log for batched notification
        const postAuthorId = posts[0].author_id;
        if (postAuthorId !== userId) {
            await pool.query(
                `INSERT INTO feed_like_digest_log (target_type, target_id, author_id, pending_count)
                 VALUES ('post', ?, ?, 1)
                 ON DUPLICATE KEY UPDATE pending_count = pending_count + 1`,
                [postId, postAuthorId]
            );
        }

        return res.json({ success: true, data: { liked: true } });
    } catch (err) {
        next(err);
    }
};

// POST /api/qna/comments/:id/like  — toggle like on comment
export const toggleCommentLike = async (req, res, next) => {
    try {
        const commentId = parseInt(req.params.id, 10);
        const userId = req.user.id;

        const [comments] = await pool.query(
            'SELECT id, author_id FROM feed_comments WHERE id = ?',
            [commentId]
        );
        if (!comments.length) {
            return res.status(404).json({ success: false, message: 'Comment not found.' });
        }

        const [existing] = await pool.query(
            `SELECT id FROM feed_likes WHERE user_id = ? AND target_type = 'comment' AND target_id = ?`,
            [userId, commentId]
        );

        if (existing.length) {
            await pool.query(
                `DELETE FROM feed_likes WHERE user_id = ? AND target_type = 'comment' AND target_id = ?`,
                [userId, commentId]
            );
            await pool.query(
                `UPDATE feed_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = ?`,
                [commentId]
            );
            await pool.query(
                `UPDATE feed_like_digest_log
                 SET pending_count = GREATEST(0, pending_count - 1)
                 WHERE target_type = 'comment' AND target_id = ?`,
                [commentId]
            );
            return res.json({ success: true, data: { liked: false } });
        }

        await pool.query(
            `INSERT INTO feed_likes (user_id, target_type, target_id) VALUES (?, 'comment', ?)`,
            [userId, commentId]
        );
        await pool.query(
            `UPDATE feed_comments SET like_count = like_count + 1 WHERE id = ?`,
            [commentId]
        );

        const commentAuthorId = comments[0].author_id;
        if (commentAuthorId !== userId) {
            await pool.query(
                `INSERT INTO feed_like_digest_log (target_type, target_id, author_id, pending_count)
                 VALUES ('comment', ?, ?, 1)
                 ON DUPLICATE KEY UPDATE pending_count = pending_count + 1`,
                [commentId, commentAuthorId]
            );
        }

        return res.json({ success: true, data: { liked: true } });
    } catch (err) {
        next(err);
    }
};

// ════════════════════════════════════════════════════════════════════════════
// COMMENTS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/qna/:id/comments
export const getComments = async (req, res, next) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const currentUserId = req.user?.id || null;

        // Fetch all non-hidden top-level comments + replies in one query
        const [rows] = await pool.query(
            `SELECT fc.*,
                    u.name AS author_name,
                    u.role AS author_role,
                    u.photo_url AS author_photo,
                    u.profile_badge AS author_badge
             FROM feed_comments fc
             JOIN users u ON fc.author_id = u.id
             WHERE fc.post_id = ? AND fc.is_hidden = 0
             ORDER BY fc.created_at ASC`,
            [postId]
        );

        // Fetch current user's liked comment IDs for this post
        let likedCommentIds = new Set();
        if (currentUserId && rows.length) {
            const commentIds = rows.map(r => r.id);
            const placeholders = commentIds.map(() => '?').join(',');
            const [likeRows] = await pool.query(
                `SELECT target_id FROM feed_likes
                 WHERE user_id = ? AND target_type = 'comment' AND target_id IN (${placeholders})`,
                [currentUserId, ...commentIds]
            );
            likedCommentIds = new Set(likeRows.map(r => r.target_id));
        }

        // Build threaded structure: top-level comments with replies nested
        const topLevel = [];
        const replyMap = {};

        for (const row of rows) {
            const comment = { ...row, is_liked: likedCommentIds.has(row.id), replies: [] };
            if (!row.parent_id) {
                topLevel.push(comment);
                replyMap[row.id] = comment;
            } else {
                const parent = replyMap[row.parent_id];
                if (parent) {
                    parent.replies.push(comment);
                } else {
                    // Orphaned reply (parent was hidden) — show as top-level
                    topLevel.push(comment);
                    replyMap[row.id] = comment;
                }
            }
        }

        return res.json({ success: true, data: topLevel });
    } catch (err) {
        next(err);
    }
};

// POST /api/qna/:id/comments  — add comment (all logged-in)
export const createComment = async (req, res, next) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const { content, parent_comment_id } = req.body;

        if (!content || !content.trim()) {
            return res.status(422).json({ success: false, message: 'Comment content is required.' });
        }
        if (content.trim().length > 2000) {
            return res.status(422).json({ success: false, message: 'Comment must be 2000 characters or fewer.' });
        }

        // Verify post exists and is not hidden (unless founding_member)
        const [posts] = await pool.query(
            'SELECT id, author_id, is_hidden FROM feed_posts WHERE id = ?',
            [postId]
        );
        if (!posts.length) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }
        if (posts[0].is_hidden && req.user.role !== 'founding_member') {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        // Enforce max depth 2 — if parent is itself a reply, make it a sibling instead
        let resolvedParentId = parent_comment_id ? parseInt(parent_comment_id, 10) : null;
        if (resolvedParentId) {
            const [parentRows] = await pool.query(
                'SELECT id, parent_id, author_id FROM feed_comments WHERE id = ?',
                [resolvedParentId]
            );
            if (!parentRows.length) {
                return res.status(404).json({ success: false, message: 'Parent comment not found.' });
            }
            // If parent is already a reply (has its own parent), make this a sibling
            if (parentRows[0].parent_id) {
                resolvedParentId = parentRows[0].parent_id;
            }
        }

        const [result] = await pool.query(
            `INSERT INTO feed_comments (post_id, author_id, parent_id, content)
             VALUES (?, ?, ?, ?)`,
            [postId, req.user.id, resolvedParentId, content.trim()]
        );

        // Update denormalized comment count on post
        await pool.query(
            'UPDATE feed_posts SET comment_count = comment_count + 1 WHERE id = ?',
            [postId]
        );

        const [rows] = await pool.query(
            `SELECT fc.*, u.name AS author_name, u.role AS author_role, u.photo_url AS author_photo, u.profile_badge AS author_badge
             FROM feed_comments fc JOIN users u ON fc.author_id = u.id
             WHERE fc.id = ?`,
            [result.insertId]
        );

        const newComment = { ...rows[0], is_liked: false, replies: [] };

        // Notify post author about new comment (if not self-comment)
        if (posts[0].author_id !== req.user.id) {
            notifyUser(
                posts[0].author_id,
                NOTIF_TYPES.FEED_POST_COMMENTED,
                `${req.user.name} commented on your post`,
                content.trim().slice(0, 100),
                { url: `/community-qna/${postId}` }
            );
        }

        // Notify parent comment author about reply (if not self-reply and not same as post author)
        if (resolvedParentId) {
            const [parentRows] = await pool.query(
                'SELECT author_id FROM feed_comments WHERE id = ?',
                [resolvedParentId]
            );
            if (
                parentRows.length &&
                parentRows[0].author_id !== req.user.id &&
                parentRows[0].author_id !== posts[0].author_id
            ) {
                notifyUser(
                    parentRows[0].author_id,
                    NOTIF_TYPES.FEED_COMMENT_REPLIED,
                    `${req.user.name} replied to your comment`,
                    content.trim().slice(0, 100),
                    { url: `/community-qna/${postId}` }
                );
            }
        }

        return res.status(201).json({ success: true, data: newComment });
    } catch (err) {
        next(err);
    }
};

// PUT /api/qna/comments/:id  — edit comment (own only)
export const updateComment = async (req, res, next) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(422).json({ success: false, message: 'Comment content is required.' });
        }
        if (content.trim().length > 2000) {
            return res.status(422).json({ success: false, message: 'Comment must be 2000 characters or fewer.' });
        }

        const [comments] = await pool.query(
            'SELECT id, author_id FROM feed_comments WHERE id = ?',
            [req.params.id]
        );
        if (!comments.length) {
            return res.status(404).json({ success: false, message: 'Comment not found.' });
        }
        if (comments[0].author_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only edit your own comments.' });
        }

        await pool.query(
            'UPDATE feed_comments SET content = ?, is_edited = 1 WHERE id = ?',
            [content.trim(), req.params.id]
        );

        const [rows] = await pool.query(
            `SELECT fc.*, u.name AS author_name, u.role AS author_role, u.photo_url AS author_photo
             FROM feed_comments fc JOIN users u ON fc.author_id = u.id
             WHERE fc.id = ?`,
            [req.params.id]
        );

        return res.json({ success: true, data: { ...rows[0], is_liked: false, replies: [] } });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/qna/comments/:id  — own or founding_member any
export const deleteComment = async (req, res, next) => {
    try {
        const [comments] = await pool.query(
            'SELECT id, author_id, post_id FROM feed_comments WHERE id = ?',
            [req.params.id]
        );
        if (!comments.length) {
            return res.status(404).json({ success: false, message: 'Comment not found.' });
        }

        if (comments[0].author_id !== req.user.id && req.user.role !== 'founding_member') {
            return res.status(403).json({ success: false, message: 'You are not authorised to delete this comment.' });
        }

        await pool.query('DELETE FROM feed_comments WHERE id = ?', [req.params.id]);

        // Update denormalized count
        await pool.query(
            'UPDATE feed_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = ?',
            [comments[0].post_id]
        );

        return res.json({ success: true, data: { message: 'Comment deleted.' } });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/qna/comments/:id/hide  — founding_member only
export const toggleHideComment = async (req, res, next) => {
    try {
        const [comments] = await pool.query(
            'SELECT id, is_hidden FROM feed_comments WHERE id = ?',
            [req.params.id]
        );
        if (!comments.length) {
            return res.status(404).json({ success: false, message: 'Comment not found.' });
        }

        const newHiddenState = comments[0].is_hidden ? 0 : 1;
        await pool.query(
            'UPDATE feed_comments SET is_hidden = ? WHERE id = ?',
            [newHiddenState, req.params.id]
        );

        return res.json({
            success: true,
            data: {
                message: newHiddenState ? 'Comment hidden.' : 'Comment visible.',
                is_hidden: !!newHiddenState,
            }
        });
    } catch (err) {
        next(err);
    }
};

// ════════════════════════════════════════════════════════════════════════════
// SAVES
// ════════════════════════════════════════════════════════════════════════════

const SAVE_LIMIT = 10;

// POST /api/qna/:id/save
export const savePost = async (req, res, next) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const userId = req.user.id;

        const [posts] = await pool.query(
            'SELECT id FROM feed_posts WHERE id = ? AND is_hidden = 0',
            [postId]
        );
        if (!posts.length) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        // Check if already saved
        const [existing] = await pool.query(
            'SELECT id FROM feed_saves WHERE user_id = ? AND post_id = ?',
            [userId, postId]
        );
        if (existing.length) {
            return res.status(409).json({ success: false, message: 'Post already saved.' });
        }

        // Enforce max 10
        const [[{ count }]] = await pool.query(
            'SELECT COUNT(*) AS count FROM feed_saves WHERE user_id = ?',
            [userId]
        );
        if (count >= SAVE_LIMIT) {
            return res.status(422).json({
                success: false,
                message: `You can save up to ${SAVE_LIMIT} posts. Remove a saved post to save a new one.`,
                code: 'SAVE_LIMIT_REACHED',
            });
        }

        await pool.query(
            'INSERT INTO feed_saves (user_id, post_id) VALUES (?, ?)',
            [userId, postId]
        );
        await pool.query(
            'UPDATE feed_posts SET save_count = save_count + 1 WHERE id = ?',
            [postId]
        );

        return res.status(201).json({ success: true, data: { saved: true } });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/qna/:id/save
export const unsavePost = async (req, res, next) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const userId = req.user.id;

        const [existing] = await pool.query(
            'SELECT id FROM feed_saves WHERE user_id = ? AND post_id = ?',
            [userId, postId]
        );
        if (!existing.length) {
            return res.status(404).json({ success: false, message: 'Post not saved.' });
        }

        await pool.query(
            'DELETE FROM feed_saves WHERE user_id = ? AND post_id = ?',
            [userId, postId]
        );
        await pool.query(
            'UPDATE feed_posts SET save_count = GREATEST(0, save_count - 1) WHERE id = ?',
            [postId]
        );

        return res.json({ success: true, data: { saved: false } });
    } catch (err) {
        next(err);
    }
};

// GET /api/qna/saved  — current user's saved posts (for Profile saved tab)
export const getSavedPosts = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) AS total FROM feed_saves WHERE user_id = ?',
            [userId]
        );

        const { page, limit, offset, totalPages } = paginate(req.query, total);

        const [rows] = await pool.query(
            `SELECT fp.*,
                    u.name AS author_name, u.role AS author_role,
                    u.photo_url AS author_photo, u.organization_name AS author_org,
                    fs.created_at AS saved_at
             FROM feed_saves fs
             JOIN feed_posts fp ON fs.post_id = fp.id
             JOIN users u ON fp.author_id = u.id
             WHERE fs.user_id = ?
             ORDER BY fs.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        const enriched = await enrichPosts(rows, userId);

        return res.json({
            success: true,
            data: enriched,
            total,
            page,
            limit,
            totalPages,
            save_count: total,
            save_limit: SAVE_LIMIT,
        });
    } catch (err) {
        next(err);
    }
};

// ════════════════════════════════════════════════════════════════════════════
// SCORE RECALCULATION (called by feedScoreJob cron)
// ════════════════════════════════════════════════════════════════════════════

export const recalculateFeedScores = async () => {
    console.log('[FeedScoreJob] Recalculating feed scores...');
    try {
        // Only recalculate posts from last 30 days + those never scored
        const [posts] = await pool.query(
            `SELECT id, like_count, comment_count, save_count, created_at
             FROM feed_posts
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                OR score_updated_at IS NULL`
        );

        if (!posts.length) {
            console.log('[FeedScoreJob] No posts to score.');
            return;
        }

        const now = Date.now();
        const updates = posts.map(post => {
            const hoursOld = (now - new Date(post.created_at).getTime()) / 3600000;
            const daysOld = hoursOld / 24;
            const rawScore = ((post.like_count * 3) + (post.comment_count * 2) + (post.save_count * 1))
                / Math.pow(hoursOld + 2, 1.5);
            const finalScore = daysOld > 30 ? rawScore * 0.1 : rawScore;
            return [parseFloat(finalScore.toFixed(4)), post.id];
        });

        // Batch update scores
        for (const [score, postId] of updates) {
            await pool.query(
                'UPDATE feed_posts SET score = ?, score_updated_at = NOW() WHERE id = ?',
                [score, postId]
            );
        }

        // Also decay posts older than 30 days that haven't been touched recently
        await pool.query(
            `UPDATE feed_posts
             SET score = score * 0.1, score_updated_at = NOW()
             WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
               AND (score_updated_at IS NULL OR score_updated_at < DATE_SUB(NOW(), INTERVAL 1 DAY))`
        );

        console.log(`[FeedScoreJob] Scored ${updates.length} posts.`);
    } catch (err) {
        console.error('[FeedScoreJob] Score recalculation failed:', err.message);
    }
};

// ════════════════════════════════════════════════════════════════════════════
// MY POSTS — for Profile "My Posts" tab (council_member + founding_member)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/qna/my-posts
export const getMyPosts = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const parsedLimit  = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
        const parsedPage   = Math.max(1, parseInt(page, 10) || 1);
        const offset = (parsedPage - 1) * parsedLimit;

        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) AS total FROM feed_posts WHERE author_id = ?',
            [userId]
        );

        const [rows] = await pool.query(
            `SELECT fp.id, fp.content, fp.tags, fp.like_count, fp.comment_count, fp.save_count,
                    fp.is_hidden, fp.is_edited, fp.created_at, fp.score
             FROM feed_posts fp
             WHERE fp.author_id = ?
             ORDER BY fp.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, parsedLimit, offset]
        );

        const data = rows.map(p => ({ ...p, tags: parseTags(p.tags) }));

        return res.json({
            success: true,
            data,
            total,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: Math.ceil(total / parsedLimit),
        });
    } catch (err) {
        next(err);
    }
};

// ════════════════════════════════════════════════════════════════════════════
// MY STATS — for Profile "Stats" tab (all roles)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/qna/my-stats
export const getMyStats = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Aggregate stats from own posts (council/founding)
        const [[postStats]] = await pool.query(
            `SELECT
                COUNT(*)            AS total_posts,
                COALESCE(SUM(like_count), 0)    AS total_likes_received,
                COALESCE(SUM(comment_count), 0) AS total_comments_received,
                COALESCE(SUM(save_count), 0)    AS total_saves_received
             FROM feed_posts
             WHERE author_id = ?`,
            [userId]
        );

        // Most liked post
        const [topPost] = await pool.query(
            `SELECT id, content, like_count
             FROM feed_posts
             WHERE author_id = ? AND is_hidden = 0
             ORDER BY like_count DESC
             LIMIT 1`,
            [userId]
        );

        // Engagement as a community member (likes given, comments made — all roles)
        const [[commentsMade]] = await pool.query(
            'SELECT COUNT(*) AS total FROM feed_comments WHERE author_id = ?',
            [userId]
        );
        const [[likesGiven]] = await pool.query(
            `SELECT COUNT(*) AS total FROM feed_likes WHERE user_id = ? AND target_type = 'post'`,
            [userId]
        );
        const [[postsSaved]] = await pool.query(
            'SELECT COUNT(*) AS total FROM feed_saves WHERE user_id = ?',
            [userId]
        );

        return res.json({
            success: true,
            data: {
                // Authorship stats (will be 0 for professional members who can't post)
                total_posts:             parseInt(postStats.total_posts,             10),
                total_likes_received:    parseInt(postStats.total_likes_received,    10),
                total_comments_received: parseInt(postStats.total_comments_received, 10),
                total_saves_received:    parseInt(postStats.total_saves_received,    10),
                most_liked_post: topPost.length ? {
                    id:         topPost[0].id,
                    content:    topPost[0].content,
                    like_count: topPost[0].like_count,
                } : null,
                // Community engagement stats (all roles)
                comments_made: parseInt(commentsMade.total, 10),
                likes_given:   parseInt(likesGiven.total,   10),
                posts_saved:   parseInt(postsSaved.total,   10),
            },
        });
    } catch (err) {
        next(err);
    }
};

// ════════════════════════════════════════════════════════════════════════════
// REACTIONS — for ai_product, event, troubleshooting post types
// ════════════════════════════════════════════════════════════════════════════

// POST /api/qna/:id/reaction
// body: { reaction_type: 'org_interest'|'request_poc'|'have_alternative'|'attending'|'faced_this' }
export const togglePostReaction = async (req, res, next) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        const { reaction_type } = req.body;

        const validReactions = [
            // AI Product reactions
            'org_interest', 'request_poc', 'have_alternative',
            // Event reactions (attending only — "Can't Attend" removed)
            'attending',
            // Troubleshooting reactions
            'faced_this',
            // Legacy (kept for backward compat with existing data)
            'interested', 'not_interested', 'not_attending',
        ];
        if (!validReactions.includes(reaction_type)) {
            return res.status(422).json({ success: false, message: 'Invalid reaction type.' });
        }

        const [posts] = await pool.query(
            'SELECT id, post_type, reaction_counts FROM feed_posts WHERE id = ?',
            [postId]
        );
        if (!posts.length) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        let currentCounts = {};
        try {
            if (posts[0].reaction_counts) {
                currentCounts = typeof posts[0].reaction_counts === 'string'
                    ? JSON.parse(posts[0].reaction_counts)
                    : posts[0].reaction_counts;
            }
        } catch { currentCounts = {}; }

        const [existing] = await pool.query(
            'SELECT id, reaction_type FROM feed_reactions WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );

        if (existing.length) {
            const old = existing[0].reaction_type;
            if (old === reaction_type) {
                // Toggle off
                await pool.query('DELETE FROM feed_reactions WHERE id = ?', [existing[0].id]);
                if (currentCounts[old] > 0) currentCounts[old]--;
                await pool.query('UPDATE feed_posts SET reaction_counts = ? WHERE id = ?',
                    [JSON.stringify(currentCounts), postId]);
                return res.json({ success: true, data: { reaction_type: null, reaction_counts: currentCounts } });
            }
            // Switch reaction
            await pool.query('UPDATE feed_reactions SET reaction_type = ? WHERE id = ?',
                [reaction_type, existing[0].id]);
            if (currentCounts[old] > 0) currentCounts[old]--;
            currentCounts[reaction_type] = (currentCounts[reaction_type] || 0) + 1;
        } else {
            await pool.query(
                'INSERT INTO feed_reactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)',
                [postId, userId, reaction_type]
            );
            currentCounts[reaction_type] = (currentCounts[reaction_type] || 0) + 1;
        }

        await pool.query('UPDATE feed_posts SET reaction_counts = ? WHERE id = ?',
            [JSON.stringify(currentCounts), postId]);

        return res.json({ success: true, data: { reaction_type, reaction_counts: currentCounts } });
    } catch (err) {
        next(err);
    }
};

// ════════════════════════════════════════════════════════════════════════════
// POLL VOTES
// ════════════════════════════════════════════════════════════════════════════

// POST /api/qna/:id/poll-vote
// body: { option_index: number } — same index = unvote, different = change vote
export const castPollVote = async (req, res, next) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        const optionIndex = parseInt(req.body.option_index, 10);

        if (isNaN(optionIndex) || optionIndex < 0) {
            return res.status(422).json({ success: false, message: 'Invalid option index.' });
        }

        const [posts] = await pool.query(
            'SELECT id, post_type, poll_options, poll_ends_at FROM feed_posts WHERE id = ?',
            [postId]
        );
        if (!posts.length) return res.status(404).json({ success: false, message: 'Post not found.' });

        const post = posts[0];
        if (post.post_type !== 'poll') {
            return res.status(422).json({ success: false, message: 'This post is not a poll.' });
        }
        if (post.poll_ends_at && new Date(post.poll_ends_at) < new Date()) {
            return res.status(422).json({ success: false, message: 'This poll has ended.' });
        }

        let pollOptions;
        try { pollOptions = typeof post.poll_options === 'string' ? JSON.parse(post.poll_options) : post.poll_options; }
        catch { pollOptions = []; }

        if (optionIndex >= pollOptions.length) {
            return res.status(422).json({ success: false, message: 'Option does not exist.' });
        }

        const [existing] = await pool.query(
            'SELECT id, option_index FROM feed_poll_votes WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );

        if (existing.length) {
            if (existing[0].option_index === optionIndex) {
                await pool.query('DELETE FROM feed_poll_votes WHERE id = ?', [existing[0].id]);
            } else {
                await pool.query('UPDATE feed_poll_votes SET option_index = ? WHERE id = ?',
                    [optionIndex, existing[0].id]);
            }
        } else {
            await pool.query(
                'INSERT INTO feed_poll_votes (post_id, user_id, option_index) VALUES (?, ?, ?)',
                [postId, userId, optionIndex]
            );
        }

        // Return updated counts + user's current vote
        const [countRows] = await pool.query(
            `SELECT option_index, COUNT(*) AS cnt FROM feed_poll_votes
             WHERE post_id = ? GROUP BY option_index`,
            [postId]
        );
        const voteCounts = {};
        countRows.forEach(r => { voteCounts[r.option_index] = parseInt(r.cnt, 10); });

        const [userVoteRows] = await pool.query(
            'SELECT option_index FROM feed_poll_votes WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );

        return res.json({
            success: true,
            data: {
                vote_counts: voteCounts,
                user_vote: userVoteRows.length ? userVoteRows[0].option_index : null,
            },
        });
    } catch (err) {
        next(err);
    }
};

// ── Share to LinkedIn ───────────────────────────────────────────────────────────
export const shareToLinkedIn = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        // 1. Get user's linkedin token and ID
        const [users] = await pool.query(
            'SELECT linkedin_id, linkedin_access_token FROM users WHERE id = ?',
            [userId]
        );

        if (!users.length || !users[0].linkedin_access_token || !users[0].linkedin_id) {
            return res.status(400).json({
                success: false,
                message: 'LinkedIn is not connected or token expired. Please log out and log back in with LinkedIn to reconnect.'
            });
        }

        const { linkedin_id, linkedin_access_token } = users[0];

        // 2. Get post details
        const [posts] = await pool.query(
            'SELECT post_type, content FROM feed_posts WHERE id = ? AND is_hidden = 0',
            [postId]
        );

        if (!posts.length) {
            return res.status(404).json({ success: false, message: 'Post not found or hidden.' });
        }

        const post = posts[0];
        const postUrl = `${process.env.FRONTEND_URL}/community/qna/${postId}`;

        // 3. Prepare LinkedIn Payload
        // We will share it as an ARTICLE (link) so LinkedIn automatically pulls the OG image
        // and we will pre-fill the text with the post's content.
        const shareText = post.content || '';
        
        // Strip HTML if content has it (rudimentary strip, assuming plain text for now as per DB)
        const cleanText = shareText.replace(/<[^>]+>/g, '').substring(0, 3000); // LinkedIn max length is ~3000

        const titleText = post.post_type === 'poll' ? 'AI Risk Council Poll' :
                          post.post_type === 'event' ? 'AI Risk Council Event' :
                          'AI Risk Council Post';

        const payload = {
            author: `urn:li:person:${linkedin_id}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                        text: cleanText
                    },
                    shareMediaCategory: 'ARTICLE',
                    media: [
                        {
                            status: 'READY',
                            originalUrl: postUrl,
                            title: {
                                text: titleText
                            }
                        }
                    ]
                }
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
            }
        };

        // 4. Send to LinkedIn
        const response = await axios.post(
            'https://api.linkedin.com/v2/ugcPosts',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${linkedin_access_token}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({ success: true, message: 'Successfully posted to LinkedIn!', data: response.data });
    } catch (err) {
        console.error('LinkedIn Share Error:', err?.response?.data || err.message);
        if (err?.response?.status === 401 || err?.response?.status === 403) {
            return res.status(401).json({
                success: false,
                message: 'LinkedIn session expired or unauthorized. Please log out and log back in with LinkedIn.'
            });
        }
        next(err);
    }
};