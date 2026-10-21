import api from './axios.js';

// ── Public ────────────────────────────────────────────────────────────────────
// params: { page, limit, q }
export const getBlogs      = (params) => api.get('/blogs', { params });
export const getBlogBySlug = (slug)   => api.get(`/blogs/${encodeURIComponent(slug)}`);

// ── Author (Chapter Lead / admin) ─────────────────────────────────────────────
export const getMyBlogs    = ()         => api.get('/blogs/mine');
export const getBlogForEdit = (id)      => api.get(`/blogs/edit/${id}`);
export const createBlog    = (data)     => api.post('/blogs', data);
export const updateBlog    = (id, data) => api.put(`/blogs/${id}`, data);
export const deleteBlog    = (id)       => api.delete(`/blogs/${id}`);
export const uploadBlogCover = (formData) =>
    api.post('/blogs/upload-cover', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminListBlogs  = (status)         => api.get('/blogs/admin/list', { params: status ? { status } : {} });
export const adminReviewBlog = (id, status, admin_notes) =>
    api.patch(`/blogs/admin/${id}/review`, { status, admin_notes });
