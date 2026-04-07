import api from './axios.js';

export const registerPushToken  = (token, platform = 'web') => api.post('/notifications/register-token', { token, platform });
export const removePushToken    = (token)                    => api.delete('/notifications/register-token', { data: { token } });
export const getNotifications   = (params)                   => api.get('/notifications', { params });
export const getUnreadCount     = ()                         => api.get('/notifications/unread-count');
export const markAsRead         = (id)                       => api.patch(`/notifications/${id}/read`);
export const markAllAsRead      = ()                         => api.patch('/notifications/read-all');