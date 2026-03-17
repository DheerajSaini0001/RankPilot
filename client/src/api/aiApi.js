import api from './index';

export const askAi = (data) => api.post('/ai/ask', data);
export const getConversations = (siteId) => api.get(`/ai/conversations${siteId ? `?siteId=${siteId}` : ''}`);
export const getConversation = (id) => api.get(`/ai/conversations/${id}`);
export const deleteConversation = (id) => api.delete(`/ai/conversations/${id}`);
export const getWeeklyInsight = (siteId) => api.get(`/ai/weekly-insight${siteId ? `?siteId=${siteId}` : ''}`);
export const refreshWeeklyInsight = (siteId) => api.post('/ai/weekly-insight/refresh', siteId ? { siteId } : {});
export const getSuggestedQuestions = (siteId) => api.get(`/ai/suggested-questions${siteId ? `?siteId=${siteId}` : ''}`);
