import api from './index';

export const listGa4 = (tokenId) => api.get(`/accounts/ga4/list${tokenId ? `?tokenId=${tokenId}` : ''}`);
export const listGsc = (tokenId) => api.get(`/accounts/gsc/list${tokenId ? `?tokenId=${tokenId}` : ''}`);
export const listGoogleAds = (tokenId) => api.get(`/accounts/google-ads/list${tokenId ? `?tokenId=${tokenId}` : ''}`);
export const listGoogleAccounts = () => api.get('/accounts/google/accounts');
export const listFacebookAds = (tokenId) => api.get(`/accounts/facebook-ads/list${tokenId ? `?tokenId=${tokenId}` : ''}`);
export const listFacebookAccounts = () => api.get('/accounts/facebook/accounts');
export const selectAccounts = (data) => api.post('/accounts/select', data);
export const getActiveAccounts = (siteId) => api.get(`/accounts/active${siteId ? `?siteId=${siteId}` : ''}`);
export const listSites = () => api.get('/accounts/sites');
export const deleteSite = (siteId) => api.delete(`/accounts/sites/${siteId}`);
export const disconnectGoogle = (tokenId) => api.delete('/accounts/disconnect/google', { data: { tokenId } });
export const disconnectFacebook = (tokenId) => api.delete('/accounts/disconnect/facebook', { data: { tokenId } });