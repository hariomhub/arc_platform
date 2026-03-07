import axios from './axios';

// ─── Admin Auto-News API ──────────────────────────────────────────────────────
export const getPendingNews = async (page = 1, limit = 20, search = '') => {
  const response = await axios.get('/admin/auto-news/pending', {
    params: { page, limit, search }
  });
  return response.data;
};

export const getApprovedNews = async (page = 1, limit = 20, search = '') => {
  const response = await axios.get('/admin/auto-news/approved', {
    params: { page, limit, search }
  });
  return response.data;
};

export const approveArticle = async (id) => {
  const response = await axios.patch(`/admin/auto-news/${id}/approve`);
  return response.data;
};

export const rejectArticle = async (id) => {
  const response = await axios.patch(`/admin/auto-news/${id}/reject`);
  return response.data;
};

export const bulkApproveArticles = async (ids) => {
  const response = await axios.post('/admin/auto-news/bulk-approve', { ids });
  return response.data;
};

export const bulkRejectArticles = async (ids) => {
  const response = await axios.post('/admin/auto-news/bulk-reject', { ids });
  return response.data;
};

export const deleteApprovedArticle = async (id) => {
  const response = await axios.delete(`/admin/auto-news/${id}`);
  return response.data;
};

export const togglePublishStatus = async (id) => {
  const response = await axios.patch(`/admin/auto-news/${id}/toggle-publish`);
  return response.data;
};

export const toggleTrendingStatus = async (id) => {
  const response = await axios.patch(`/admin/auto-news/${id}/toggle-trending`);
  return response.data;
};

export const triggerNewsFetch = async () => {
  const response = await axios.post('/admin/auto-news/trigger-fetch');
  return response.data;
};

export const getFetchStats = async () => {
  const response = await axios.get('/admin/auto-news/stats');
  return response.data;
};
