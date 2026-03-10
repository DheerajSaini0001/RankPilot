import React from 'react';
import DashboardLayout from '../components/ui/DashboardLayout';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { useAccountsStore } from '../store/accountsStore';
import { disconnectFacebook, disconnectGoogle } from '../api/accountApi';
import api from '../api';
import toast from 'react-hot-toast';

const SettingsPage = () => {
    const { user, clearAuth } = useAuthStore();
    const { connectedSources } = useAccountsStore();

    const handleGoogleDisconnect = async () => {
        if (!window.confirm("Disconnect Google data? All reports & API links will be lost.")) return;
        try {
            await disconnectGoogle();
            toast.success("Google disconnected");
            window.location.reload();
        } catch { toast.error("Error disconnecting Google"); }
    };

    const handleFacebookDisconnect = async () => {
        if (!window.confirm("Disconnect Facebook Ads?")) return;
        try {
            await disconnectFacebook();
            toast.success("Facebook disconnected");
            window.location.reload();
        } catch { toast.error("Error disconnecting Facebook"); }
    };

    const handleDeleteAccount = async () => {
        const conf = window.prompt(`To verify deletion, type exactly: ${user.email}`);
        if (conf === user.email) {
            try {
                await api.delete('/auth/me');
                clearAuth();
                window.location.href = '/login';
            } catch { toast.error("Error deleting account."); }
        } else {
            toast.error("Confirmation string didn't match.");
        }
    };

    return (
        <DashboardLayout>
            <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
                        <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Account Settings
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-2 font-medium">Manage your profile, active integrations, and platform preferences.</p>
                </div>

                {/* Profile Details */}
                <div className="group bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-2xl hover:shadow-brand-500/5 hover:border-brand-400/50 dark:hover:border-brand-500/50 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"></div>
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </span>
                            Profile Details
                        </h3>
                        <div className="flex items-center space-x-6 bg-neutral-50 dark:bg-dark-surface/50 p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 focus-within:border-brand-300 dark:focus-within:border-brand-700 transition-colors">
                            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=3B8ED4&color=fff`} alt="Avatar" className="w-20 h-20 rounded-2xl ring-4 ring-white dark:ring-dark-card shadow-lg" />
                            <div>
                                <p className="font-extrabold text-neutral-900 dark:text-white text-2xl tracking-tight">{user?.name}</p>
                                <p className="text-neutral-500 dark:text-neutral-400 font-medium mt-1">{user?.email}</p>
                                <div className="mt-3 inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-md border border-green-200 dark:border-green-800/50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                                    Active Platform User
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Connected Integrations */}
                <div className="group bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-2xl hover:shadow-brand-500/5 hover:border-brand-400/50 dark:hover:border-brand-500/50 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -ml-32 -mt-32 pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                </span>
                                Active Connections
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Google Disconnect Card */}
                            <div className="flex flex-col justify-between bg-neutral-50 dark:bg-dark-surface/50 p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 transition-colors hover:border-brand-300 dark:hover:border-brand-700">
                                <div>
                                    <div className="w-10 h-10 bg-white dark:bg-dark-card rounded-xl flex items-center justify-center p-2 mb-4 shadow-sm border border-neutral-100 dark:border-neutral-800">
                                        <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                    </div>
                                    <p className="font-extrabold text-neutral-900 dark:text-white tracking-tight text-lg mb-1">Google Platforms</p>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">GA4, Search Console, & Ads</p>
                                </div>
                                <div className="mt-auto">
                                    {connectedSources?.includes('ga4') ? (
                                        <Button variant="secondary" onClick={handleGoogleDisconnect} className="w-full text-sm hover:border-red-300 hover:text-red-500 dark:hover:border-red-700 dark:hover:text-red-400 shadow-sm bg-white dark:bg-dark-card border-neutral-200 dark:border-neutral-700 transition-colors">Disconnect Data Link</Button>
                                    ) : (
                                        <Button onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/google`} className="w-full text-sm shadow-sm shadow-brand-500/25">Connect Google</Button>
                                    )}
                                </div>
                            </div>

                            {/* Facebook Disconnect Card */}
                            <div className="flex flex-col justify-between bg-neutral-50 dark:bg-dark-surface/50 p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 transition-colors hover:border-blue-300 dark:hover:border-blue-700">
                                <div>
                                    <div className="w-10 h-10 bg-white dark:bg-dark-card rounded-xl flex items-center justify-center p-2 mb-4 shadow-sm border border-neutral-100 dark:border-neutral-800">
                                        <svg fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                    </div>
                                    <p className="font-extrabold text-neutral-900 dark:text-white tracking-tight text-lg mb-1">Meta Business</p>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Facebook & Instagram Ads SDK</p>
                                </div>
                                <div className="mt-auto">
                                    {connectedSources?.includes('facebook-ads') ? (
                                        <Button variant="secondary" onClick={handleFacebookDisconnect} className="w-full text-sm hover:border-red-300 hover:text-red-500 dark:hover:border-red-700 dark:hover:text-red-400 shadow-sm bg-white dark:bg-dark-card border-neutral-200 dark:border-neutral-700 transition-colors">Disconnect Data Link</Button>
                                    ) : (
                                        <Button onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/facebook`} className="w-full text-sm shadow-sm shadow-brand-500/25">Connect Meta</Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="group bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 hover:border-red-400/50 dark:hover:border-red-500/50 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"></div>
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </span>
                            Danger Zone
                        </h3>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-red-50/50 dark:bg-red-900/10 border border-red-200/80 dark:border-red-900/30 p-6 rounded-2xl transition-colors focus-within:border-red-300 dark:focus-within:border-red-700">
                            <div>
                                <p className="font-extrabold text-red-900 dark:text-red-200 tracking-tight text-lg">Delete Account Permanently</p>
                                <p className="text-sm text-red-700 dark:text-red-300/80 mt-1 max-w-md">This action is irreversible. All connected accounts, analytics data cache, AI conversations, and your profile will be immediately destroyed.</p>
                            </div>
                            <Button variant="danger" onClick={handleDeleteAccount} className="w-full sm:w-auto px-6 py-2.5 shadow-lg shadow-red-500/20 whitespace-nowrap border border-red-700 hover:border-red-800">
                                Destroy Account
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;
