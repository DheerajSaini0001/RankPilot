import React from 'react';
import DashboardLayout from '../components/ui/DashboardLayout';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { useAccountsStore } from '../store/accountsStore';
import { disconnectFacebook, disconnectGoogle } from '../api/accountApi';
import api, { getApiUrl } from '../api';
import toast from 'react-hot-toast';

const SettingsPage = () => {
    const { user, clearAuth, token } = useAuthStore();
    const { connectedSources, setAccounts } = useAccountsStore();

    const handleGoogleDisconnect = async () => {
        if (!window.confirm("Disconnect Google data? All reports & API links will be lost.")) return;
        try {
            const res = await disconnectGoogle();
            setAccounts({
                connectedSources: connectedSources.filter(s => !['ga4', 'gsc', 'google-ads', 'google'].includes(s)),
                ga4: {},
                gsc: {},
                googleAds: {},
                gscSites: [],
                activeGscSite: null
            });
            if (res.data?.oauthOnly) {
                toast.success("Google disconnected. Since you used Google to sign in, we've sent a password-setup email to your inbox so you can still log in.", { duration: 8000 });
            } else {
                toast.success("Google disconnected");
            }
        } catch { toast.error("Error disconnecting Google"); }
    };

    const handleFacebookDisconnect = async () => {
        if (!window.confirm("Disconnect Facebook Ads?")) return;
        try {
            await disconnectFacebook();
            setAccounts({
                connectedSources: connectedSources.filter(s => !['facebook', 'facebook-ads'].includes(s)),
                facebook: {}
            });
            toast.success("Facebook disconnected");
        } catch { toast.error("Error disconnecting Facebook"); }
    };

    const handleDeleteAccount = async () => {
        const conf = window.prompt(`To verify deletion, type exactly: ${user.email}`);
        if (conf === user.email) {
            try {
                await api.delete('/auth/me');
                clearAuth();
                window.location.href = '/';
            } catch { toast.error("Error deleting account."); }
        } else {
            toast.error("Confirmation string didn't match.");
        }
    };

    return (
        <DashboardLayout>
            <div className="w-full space-y-6 pb-20">
                {/* 1. Page Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-neutral-900 dark:bg-white flex items-center justify-center shadow-lg flex-shrink-0">
                            <svg className="w-5 h-5 text-white dark:text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Account Settings</h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Manage your profile, integrations, and platform preferences.</p>
                        </div>
                    </div>
                </div>

                {/* 2. Profile Card */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Profile</h3>
                    </div>

                    <div className="flex items-center gap-5 p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-700">
                        <img
                            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=3B8ED4&color=fff&size=128`}
                            alt="Avatar"
                            className="w-16 h-16 rounded-2xl ring-2 ring-white dark:ring-neutral-700 shadow-md flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-lg font-black text-neutral-900 dark:text-white tracking-tight truncate">{user?.name}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium truncate mt-0.5">{user?.email}</p>
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-green-700 dark:text-green-400">Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Connected Integrations Card */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Connected Integrations</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Google Card */}
                        <div className="flex flex-col p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center p-2 shadow-sm">
                                    <svg viewBox="0 0 24 24" className="w-full h-full">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-neutral-900 dark:text-white truncate">Google Platforms</p>
                                    <p className="text-xs text-neutral-400 font-medium truncate">GA4 · Search Console · Ads</p>
                                </div>
                                <div className="ml-auto flex-shrink-0">
                                    {connectedSources?.includes('google') ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />LIVE
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                                            OFF
                                        </span>
                                    )}
                                </div>
                            </div>
                            {connectedSources?.includes('google') ? (
                                <button
                                    onClick={handleGoogleDisconnect}
                                    className="w-full mt-auto py-2 px-4 text-xs font-black rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:border-red-300 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400 transition-all"
                                >
                                    Disconnect
                                </button>
                            ) : (
                                <Button
                                    onClick={() => window.location.href = getApiUrl(`/auth/google?token=${encodeURIComponent(token)}`)}
                                    className="w-full mt-auto text-xs shadow-sm shadow-brand-500/20"
                                >
                                    Connect Google
                                </Button>
                            )}
                        </div>

                        {/* Facebook Card */}
                        <div className="flex flex-col p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-[#1877F2] flex items-center justify-center p-2 shadow-sm">
                                    <svg fill="white" viewBox="0 0 24 24" className="w-full h-full">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-neutral-900 dark:text-white truncate">Meta Business</p>
                                    <p className="text-xs text-neutral-400 font-medium truncate">Facebook · Instagram Ads</p>
                                </div>
                                <div className="ml-auto flex-shrink-0">
                                    {connectedSources?.includes('facebook') ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />LIVE
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                                            OFF
                                        </span>
                                    )}
                                </div>
                            </div>
                            {connectedSources?.includes('facebook') ? (
                                <button
                                    onClick={handleFacebookDisconnect}
                                    className="w-full mt-auto py-2 px-4 text-xs font-black rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:border-red-300 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400 transition-all"
                                >
                                    Disconnect
                                </button>
                            ) : (
                                <Button
                                    onClick={() => window.location.href = getApiUrl(`/auth/facebook?token=${encodeURIComponent(token)}`)}
                                    className="w-full mt-auto text-xs shadow-sm"
                                >
                                    Connect Meta
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Danger Zone Card */}
                <div className="bg-white dark:bg-dark-card border border-red-200 dark:border-red-900/50 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-wider">Danger Zone</h3>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-5 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/50">
                        <div>
                            <p className="text-sm font-black text-red-900 dark:text-red-200">Delete Account Permanently</p>
                            <p className="text-xs text-red-700 dark:text-red-300/80 mt-1 max-w-md leading-relaxed">
                                This is irreversible. All connected accounts, analytics data, AI conversations, and your profile will be permanently deleted.
                            </p>
                        </div>
                        <button
                            onClick={handleDeleteAccount}
                            className="flex-shrink-0 px-5 py-2.5 text-xs font-black rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25 transition-all hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
                        >
                            Delete Account
                        </button>
                    </div>

                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-4 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        You will be asked to confirm with your email address before deletion.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;
