import axiosInstance from './axios';

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API - Get Framework Content
// ═══════════════════════════════════════════════════════════════════════════════

export const getFrameworkPillars = async () => {
  const response = await axiosInstance.get('/framework/pillars');
  return response.data;
};

export const getFrameworkMaturityLevels = async () => {
  const response = await axiosInstance.get('/framework/maturity-levels');
  return response.data;
};

export const getFrameworkImplementationGuide = async () => {
  const response = await axiosInstance.get('/framework/implementation-guide');
  return response.data;
};

export const getFrameworkAuditTemplates = async () => {
  const response = await axiosInstance.get('/framework/audit-templates');
  return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN API - Framework Pillars Management
// ═══════════════════════════════════════════════════════════════════════════════

export const getAllPillarsAdmin = async () => {
  const response = await axiosInstance.get('/framework/admin/pillars');
  return response.data;
};

export const createPillar = async (pillarData) => {
  const response = await axiosInstance.post('/framework/admin/pillars', pillarData);
  return response.data;
};

export const updatePillar = async (id, pillarData) => {
  const response = await axiosInstance.put(`/framework/admin/pillars/${id}`, pillarData);
  return response.data;
};

export const deletePillar = async (id) => {
  const response = await axiosInstance.delete(`/framework/admin/pillars/${id}`);
  return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN API - Maturity Levels Management
// ═══════════════════════════════════════════════════════════════════════════════

export const getAllMaturityLevelsAdmin = async () => {
  const response = await axiosInstance.get('/framework/admin/maturity-levels');
  return response.data;
};

export const createMaturityLevel = async (levelData) => {
  const response = await axiosInstance.post('/framework/admin/maturity-levels', levelData);
  return response.data;
};

export const updateMaturityLevel = async (id, levelData) => {
  const response = await axiosInstance.put(`/framework/admin/maturity-levels/${id}`, levelData);
  return response.data;
};

export const deleteMaturityLevel = async (id) => {
  const response = await axiosInstance.delete(`/framework/admin/maturity-levels/${id}`);
  return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN API - Implementation Phases Management
// ═══════════════════════════════════════════════════════════════════════════════

export const getAllPhasesAdmin = async () => {
  const response = await axiosInstance.get('/framework/admin/phases');
  return response.data;
};

export const createPhase = async (phaseData) => {
  const response = await axiosInstance.post('/framework/admin/phases', phaseData);
  return response.data;
};

export const updatePhase = async (id, phaseData) => {
  const response = await axiosInstance.put(`/framework/admin/phases/${id}`, phaseData);
  return response.data;
};

export const deletePhase = async (id) => {
  const response = await axiosInstance.delete(`/framework/admin/phases/${id}`);
  return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN API - Implementation Steps Management
// ═══════════════════════════════════════════════════════════════════════════════

export const getStepsByPhase = async (phaseId) => {
  const response = await axiosInstance.get(`/framework/admin/phases/${phaseId}/steps`);
  return response.data;
};

export const createStep = async (stepData) => {
  const response = await axiosInstance.post('/framework/admin/steps', stepData);
  return response.data;
};

export const updateStep = async (id, stepData) => {
  const response = await axiosInstance.put(`/framework/admin/steps/${id}`, stepData);
  return response.data;
};

export const deleteStep = async (id) => {
  const response = await axiosInstance.delete(`/framework/admin/steps/${id}`);
  return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN API - Audit Templates Management
// ═══════════════════════════════════════════════════════════════════════════════

export const getAllAuditTemplatesAdmin = async () => {
  const response = await axiosInstance.get('/framework/admin/audit-templates');
  return response.data;
};

export const createAuditTemplate = async (templateData, file) => {
  const formData = new FormData();
  
  // Append all template data
  Object.keys(templateData).forEach(key => {
    if (key === 'fields' && Array.isArray(templateData[key])) {
      formData.append(key, JSON.stringify(templateData[key]));
    } else {
      formData.append(key, templateData[key]);
    }
  });
  
  // Append file if present
  if (file) {
    formData.append('file', file);
  }
  
  const response = await axiosInstance.post('/framework/admin/audit-templates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const updateAuditTemplate = async (id, templateData, file) => {
  const formData = new FormData();
  
  // Append all template data
  Object.keys(templateData).forEach(key => {
    if (key === 'fields' && Array.isArray(templateData[key])) {
      formData.append(key, JSON.stringify(templateData[key]));
    } else {
      formData.append(key, templateData[key]);
    }
  });
  
  // Append file if present
  if (file) {
    formData.append('file', file);
  }
  
  const response = await axiosInstance.put(`/framework/admin/audit-templates/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const deleteAuditTemplate = async (id) => {
  const response = await axiosInstance.delete(`/framework/admin/audit-templates/${id}`);
  return response.data;
};
