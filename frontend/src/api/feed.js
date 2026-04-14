/**
 * api/feed.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All feed API calls. Replaces api/qna.js.
 * Base URL: /api/qna (URL unchanged — repurposed on backend)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import api from './axios.js';

// ── Feed ──────────────────────────────────────────────────────────────────────

/**
 * Get paginated feed.
 * @param {{ sort?: 'trending'|'latest'|'discussed', tags?: string, search?: string, page?: number, limit?: number }} params
 */
export const getFeedPosts = (params = {}) =>
    api.get('/qna', { params });

/**
 * Get single post with media (comments fetched separately).
 */
export const getFeedPost = (id) =>
    api.get(`/qna/${id}`);

/**
 * Create a new post. Sends multipart/form-data because media files may be attached.
 * @param {FormData} formData — must include 'content', optionally 'tags', 'video_url', 'media' files
 */
export const createFeedPost = (formData) =>
    api.post('/qna', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

/**
 * Edit a post (own post only). JSON body — no file re-upload here.
 * @param {number} id
 * @param {{ content: string, tags?: string[] }} data
 */
export const updateFeedPost = (id, data) =>
    api.put(`/qna/${id}`, data);

/**
 * Delete a post (own post, or founding_member any).
 */
export const deleteFeedPost = (id) =>
    api.delete(`/qna/${id}`);

/**
 * Toggle hide/unhide on a post (founding_member only).
 */
export const toggleHidePost = (id) =>
    api.patch(`/qna/${id}/hide`);

// ── Media ─────────────────────────────────────────────────────────────────────

/**
 * Add media to an existing post.
 * @param {number} postId
 * @param {FormData} formData — may include 'media' files and/or 'video_url'
 */
export const addPostMedia = (postId, formData) =>
    api.post(`/qna/${postId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

/**
 * Remove a specific media item from a post.
 */
export const deletePostMedia = (postId, mediaId) =>
    api.delete(`/qna/${postId}/media/${mediaId}`);

// ── Likes ─────────────────────────────────────────────────────────────────────

/**
 * Toggle like on a post. Returns { liked: boolean }.
 */
export const togglePostLike = (postId) =>
    api.post(`/qna/${postId}/like`);

/**
 * Toggle like on a comment. Returns { liked: boolean }.
 */
export const toggleCommentLike = (commentId) =>
    api.post(`/qna/comments/${commentId}/like`);

// ── Comments ──────────────────────────────────────────────────────────────────

/**
 * Get threaded comments for a post.
 */
export const getComments = (postId) =>
    api.get(`/qna/${postId}/comments`);

/**
 * Add a comment to a post.
 * @param {number} postId
 * @param {{ content: string, parent_comment_id?: number }} data
 */
export const createComment = (postId, data) =>
    api.post(`/qna/${postId}/comments`, data);

/**
 * Edit a comment (own comment only).
 * @param {number} commentId
 * @param {{ content: string }} data
 */
export const updateComment = (commentId, data) =>
    api.put(`/qna/comments/${commentId}`, data);

/**
 * Delete a comment (own, or founding_member any).
 */
export const deleteComment = (commentId) =>
    api.delete(`/qna/comments/${commentId}`);

/**
 * Toggle hide/unhide on a comment (founding_member only).
 */
export const toggleHideComment = (commentId) =>
    api.patch(`/qna/comments/${commentId}/hide`);

// ── Saves ─────────────────────────────────────────────────────────────────────

/**
 * Save a post. Returns 422 with code SAVE_LIMIT_REACHED when at 10.
 */
export const savePost = (postId) =>
    api.post(`/qna/${postId}/save`);

/**
 * Unsave a post.
 */
export const unsavePost = (postId) =>
    api.delete(`/qna/${postId}/save`);

/**
 * Get current user's saved posts (for Profile saved tab).
 * @param {{ page?: number, limit?: number }} params
 */
export const getSavedPosts = (params = {}) =>
    api.get('/qna/saved', { params });