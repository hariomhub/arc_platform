import api from './axios.js';

// ─── Products (public) ────────────────────────────────────────────────────────
// params: { category, search, page, limit }
export const getProducts = (params) =>
    api.get('/product-reviews', { params });

export const getProductById = (id) =>
    api.get(`/product-reviews/${id}`);

// ─── Admin: Product CRUD ──────────────────────────────────────────────────────
export const createProduct = (data) =>
    api.post('/product-reviews', data);

export const updateProduct = (id, data) =>
    api.put(`/product-reviews/${id}`, data);

export const deleteProduct = (id) =>
    api.delete(`/product-reviews/${id}`);

// ─── Admin: Feature Tests ─────────────────────────────────────────────────────
export const addFeatureTest = (productId, data) =>
    api.post(`/product-reviews/${productId}/feature-tests`, data);

export const updateFeatureTest = (productId, testId, data) =>
    api.put(`/product-reviews/${productId}/feature-tests/${testId}`, data);

export const deleteFeatureTest = (productId, testId) =>
    api.delete(`/product-reviews/${productId}/feature-tests/${testId}`);

// ─── Admin: Media Uploads ─────────────────────────────────────────────────────
export const uploadProductMedia = (productId, formData) =>
    api.post(`/product-reviews/${productId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const deleteProductMedia = (productId, mediaId) =>
    api.delete(`/product-reviews/${productId}/media/${mediaId}`);

// ─── Admin: Evidence Uploads ──────────────────────────────────────────────────
export const uploadEvidence = (productId, formData) =>
    api.post(`/product-reviews/${productId}/evidences`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const deleteEvidence = (productId, evidenceId) =>
    api.delete(`/product-reviews/${productId}/evidences/${evidenceId}`);

// ─── User Reviews ─────────────────────────────────────────────────────────────
export const submitUserReview = (productId, data) =>
    api.post(`/product-reviews/${productId}/user-reviews`, data);

export const deleteUserReview = (productId, reviewId) =>
    api.delete(`/product-reviews/${productId}/user-reviews/${reviewId}`);
