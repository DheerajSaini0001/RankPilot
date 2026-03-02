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
            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Account Settings</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">Manage integrations and account preferences.</p>
                </div>

                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 border-b border-neutral-100 dark:border-neutral-800 pb-2">Profile Details</h3>
                    <div className="flex items-center space-x-4">
                        <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=3B8ED4&color=fff`} alt="Avatar" className="w-16 h-16 rounded-full ring-2 ring-brand-100 dark:ring-brand-900" />
                        <div>
                            <p className="font-medium text-neutral-900 dark:text-white text-lg">{user?.name}</p>
                            <p className="text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                            <p className="text-xs text-brand-600 dark:text-brand-400 tracking-wide uppercase mt-1">Status: Active User</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 border-b border-neutral-100 dark:border-neutral-800 pb-2">Connected Integrations</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-neutral-50 dark:bg-dark-surface p-4 rounded-lg border border-neutral-100 dark:border-neutral-800">
                            <div>
                                <p className="font-medium text-neutral-900 dark:text-white">Google Properties</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">GA4, Search Console, & Ads OAuth link</p>
                            </div>
                            {connectedSources?.includes('ga4') ? (
                                <Button variant="secondary" onClick={handleGoogleDisconnect}>Disconnect</Button>
                            ) : (
                                <p className="text-sm font-semibold text-neutral-400 dark:text-neutral-500 bg-neutral-200 dark:bg-neutral-800 px-3 py-1 rounded-full inline-flex">Not Linked</p>
                            )}
                        </div>
                        <div className="flex justify-between items-center bg-neutral-50 dark:bg-dark-surface p-4 rounded-lg border border-neutral-100 dark:border-neutral-800">
                            <div>
                                <p className="font-medium text-neutral-900 dark:text-white">Facebook Ads</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Meta Business SDK link</p>
                            </div>
                            {connectedSources?.includes('facebook-ads') ? (
                                <Button variant="secondary" onClick={handleFacebookDisconnect}>Disconnect</Button>
                            ) : (
                                <p className="text-sm font-semibold text-neutral-400 dark:text-neutral-500 bg-neutral-200 dark:bg-neutral-800 px-3 py-1 rounded-full inline-flex">Not Linked</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 border-b border-neutral-100 dark:border-neutral-800 pb-2">Danger Zone</h3>
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 p-4 rounded-lg">
                        <p className="font-medium text-red-900 dark:text-red-200 mb-2">Delete Account Permanently</p>
                        <p className="text-sm text-red-700 dark:text-red-300 mb-4">This action is irreversible. All connected accounts, analytics data cache, AI conversations, and your profile will be immediately destroyed.</p>
                        <Button variant="danger" onClick={handleDeleteAccount}>
                            Delete Account
                        </Button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;
