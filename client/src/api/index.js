import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Get the base API URL from environment variables, or default to the proxy path '/api'
const getBaseURL = () => import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Standardized API instance for all Axios calls.
 * Includes interceptors for auth tokens and global error handling.
 */
const api = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true, // Required for secure cross-origin requests
});

/**
 * Helper to resolve full API URLs for browser redirects (e.g. OAuth)
 */
export const getApiUrl = (path) => {
    const base = getBaseURL();
    // If base is a relative path (starting with /), we use the current origin
    if (base.startsWith('/')) {
        return `${window.location.origin}${base}${path.startsWith('/') ? path : '/' + path}`;
    }
    // If base is already a full URL, we just append the path
    return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
};

api.interceptors.request.use(config => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            useAuthStore.getState().clearAuth();
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
