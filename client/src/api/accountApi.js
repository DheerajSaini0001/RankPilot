import api from './index';

export const listGa4 = () => api.get('/accounts/ga4/list');
export const listGsc = () => api.get('/accounts/gsc/list');
export const listGoogleAds = () => api.get('/accounts/google-ads/list');
export const listFacebookAds = () => api.get('/accounts/facebook-ads/list');
export const selectAccounts = (data) => api.post('/accounts/select', data);
export const getActiveAccounts = () => api.get('/accounts/active');
export const disconnectGoogle = () => api.delete('/accounts/disconnect/google');
export const disconnectFacebook = () => api.delete('/accounts/disconnect/facebook');
