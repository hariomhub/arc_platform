import api from './axios.js';

export const getPendingUsers  = ()           => api.get('/admin/pending-users');
export const getAllUsers       = (params)     => api.get('/admin/all-users', { params });
export const approveUser       = (id)         => api.patch(`/admin/users/${id}/approve`);
export const rejectUser        = (id)         => api.patch(`/admin/users/${id}/reject`);
export const getAdminStats     = ()           => api.get('/admin/stats');
export const createAdminUser   = (data)       => api.post('/admin/users', data);
export const updateUserStatus  = (id, status) => api.patch(`/admin/users/${id}/status`, { status });
export const updateUserRole    = (id, role)   => api.patch(`/admin/users/${id}/role`, { role });
export const deleteUser        = (id)         => api.delete(`/admin/users/${id}`);

// Membership applications
export const getMembershipApplications    = (params)            => api.get('/admin/membership-applications', { params });
export const approveMembershipApplication = (id)                => api.patch(`/admin/membership-applications/${id}/approve`);
export const rejectMembershipApplication  = (id, adminNotes)   => api.patch(`/admin/membership-applications/${id}/reject`, { admin_notes: adminNotes });

// Sub-type upgrade requests: final_year_undergrad → working_professional
export const getPendingSubTypeUpgrades  = (params) => api.get('/admin/sub-type-upgrades', { params });
export const approveSubTypeUpgrade      = (id)     => api.patch(`/admin/sub-type-upgrades/${id}/approve`);
export const rejectSubTypeUpgrade       = (id)     => api.patch(`/admin/sub-type-upgrades/${id}/reject`);
