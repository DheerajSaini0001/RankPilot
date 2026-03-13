import api from './index';

export const askAi = (data) => api.post('/ai/ask', data);
export const getConversations = (siteId) => api.get(`/ai/conversations${siteId ? `?siteId=${siteId}` : ''}`);
export const getConversation = (id) => api.get(`/ai/conversations/${id}`);
export const deleteConversation = (id) => api.delete(`/ai/conversations/${id}`);
export const getWeeklyInsight = (siteId) => api.get(`/ai/weekly-insight${siteId ? `?siteId=${siteId}` : ''}`);
export const refreshWeeklyInsight = (data) => api.post('/ai/weekly-insight/refresh', data);
export const getSuggestedQuestions = (data) => api.post('/ai/suggested-questions', data);
