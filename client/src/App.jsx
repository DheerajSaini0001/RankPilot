import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ConnectAccountsPage from './pages/ConnectAccountsPage';
import DashboardPage from './pages/DashboardPage';
import AIChatPage from './pages/AIChatPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import GscPage from './pages/GscPage';
import Ga4Page from './pages/Ga4Page';
import GoogleAdsPage from './pages/GoogleAdsPage';
import FacebookAdsPage from './pages/FacebookAdsPage';
import SitesPage from './pages/SitesPage';
import { ProtectedRoute, AuthRoute, AdminRoute } from './components/ui/RouteWrappers';
import { getMe } from './api/authApi';
import { useAuthStore } from './store/authStore';
import { useAccountsStore } from './store/accountsStore';


const App = () => {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/" element={
          <AuthRoute>
            <LandingPage />
          </AuthRoute>
        } />

        <Route path="/login" element={
          <AuthRoute>
            <LoginPage />
          </AuthRoute>
        } />
        <Route path="/register" element={
          <AuthRoute>
            <RegisterPage />
          </AuthRoute>
        } />

        {/* Password Reset Routes - public, accessible even when logged in */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Email Verification - public, no auth wrapping needed */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Protected Routes */}
        <Route path="/connect-accounts" element={
          <ProtectedRoute>
            <ConnectAccountsPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/sites" element={
          <ProtectedRoute>
            <SitesPage />
          </ProtectedRoute>
        } />


        <Route path="/dashboard/ai-chat" element={
          <ProtectedRoute>
            <AIChatPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/gsc" element={
          <ProtectedRoute>
            <GscPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/ga4" element={
          <ProtectedRoute>
            <Ga4Page />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/google-ads" element={
          <ProtectedRoute>
            <GoogleAdsPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/facebook-ads" element={
          <ProtectedRoute>
            <FacebookAdsPage />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/admin" element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          </ProtectedRoute>
        } />

        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
};



// Handle OAuth callback token in URL
const AuthCallback = () => {
  const code = new URLSearchParams(window.location.search).get('token');
  const { setAuth } = useAuthStore();

  React.useEffect(() => {
    if (code) {
      // Optimistically set the token so the api interceptor can use it
      setAuth(code, { name: 'Authenticating...', email: '...' });

      getMe()
        .then(res => {
          setAuth(code, res.data.user);
          // Sync connection status to accounts store
          const { setAccounts } = useAccountsStore.getState();
          setAccounts({ connectedSources: res.data.connectedSources });
          
          if (res.data.connectedSources.length === 0) {
            window.location.href = '/connect-accounts';
          } else {
            window.location.href = '/dashboard';
          }
        })
        .catch(err => {
          console.error('OAuth getMe error:', err);
          window.location.href = '/';
        });
    }
  }, [code, setAuth]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-dark-bg text-brand-600 dark:text-brand-400 font-sans">
      <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-brand-600 dark:text-brand-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="font-medium text-lg">Authenticating safely...</p>
    </div>
  );
};

export default App;
