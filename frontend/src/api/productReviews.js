import api from './axios.js';

// ─── Products (public) ────────────────────────────────────────────────────────
// params: { category (category_id), search, page, limit }
export const getProducts = (params) =>
    api.get('/product-reviews', { params });

export const getProductById = (id) =>
    api.get(`/product-reviews/${id}`);

// ─── Categories (public list, admin create) ────────────────────────────────────
export const getProductCategories = () =>
    api.get('/product-reviews/categories');

export const createProductCategory = (name) =>
    api.post('/product-reviews/categories', { name });

// ─── Admin: Product CRUD ──────────────────────────────────────────────────────
export const createProduct = (data) =>
    api.post('/product-reviews', data);

export const updateProduct = (id, data) =>
    api.put(`/product-reviews/${id}`, data);

export const deleteProduct = (id) =>
    api.delete(`/product-reviews/${id}`);

// ─── Admin: Logos ─────────────────────────────────────────────────────────────
export const uploadProductLogo = (productId, file) => {
    const fd = new FormData(); fd.append('logo', file);
    return api.post(`/product-reviews/${productId}/upload-product-logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const uploadCompanyLogo = (productId, file) => {
    const fd = new FormData(); fd.append('logo', file);
    return api.post(`/product-reviews/${productId}/upload-company-logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

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

export const getEvidenceDownloadUrl = (productId, evidenceId) =>
    api.get(`/product-reviews/${productId}/evidences/${evidenceId}/download`);

// ─── User Reviews ─────────────────────────────────────────────────────────────
export const submitUserReview = (productId, data) =>
    api.post(`/product-reviews/${productId}/user-reviews`, data);

export const deleteUserReview = (productId, reviewId) =>
    api.delete(`/product-reviews/${productId}/user-reviews/${reviewId}`);
