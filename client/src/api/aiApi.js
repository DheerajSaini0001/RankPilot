import api from './index';

export const askAi = (data) => api.post('/ai/ask', data);
export const getConversations = () => api.get('/ai/conversations');
export const getConversation = (id) => api.get(`/ai/conversations/${id}`);
export const deleteConversation = (id) => api.delete(`/ai/conversations/${id}`);
export const getWeeklyInsight = () => api.get('/ai/weekly-insight');
export const refreshWeeklyInsight = (data) => api.post('/ai/weekly-insight/refresh', data);
export const getSuggestedQuestions = (data) => api.post('/ai/suggested-questions', data);
