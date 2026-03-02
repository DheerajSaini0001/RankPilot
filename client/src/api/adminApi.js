import api from './index';

export const getConfig = () => api.get('/admin/config');
export const getSingleConfig = (key) => api.get(`/admin/config/${key}`);
export const saveConfig = (data) => api.post('/admin/config', data);
export const bulkSaveConfig = (data) => api.post('/admin/config/bulk', data);
export const testConfig = (key) => api.post(`/admin/config/test/${key}`);
