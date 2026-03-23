import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import { 
    PlusIcon, 
    TrashIcon, 
    PencilSquareIcon,
    GlobeAltIcon,
    CheckCircleIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAccountsStore } from '../store/accountsStore';
import { useNotificationStore } from '../store/notificationStore';
import { deleteSite, listSites } from '../api/accountApi';
import toast from 'react-hot-toast';

const ConnectionStatus = ({ connected, label }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${
    connected
      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
      : 'bg-neutral-100 text-neutral-400 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-600 dark:border-neutral-700'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}/>
    {label}
  </span>
);

const SitesPage = () => {
    const navigate = useNavigate();
    const { userSites, activeSiteId, setAccounts } = useAccountsStore();
    const [loading, setLoading] = useState(false);

    const fetchSites = async () => {
        setLoading(true);
        try {
            const res = await listSites();
            setAccounts({ userSites: res.data });
        } catch (err) {
            console.error('Failed to fetch sites', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"? All associated data will be lost.`)) return;

        try {
            await deleteSite(id);
            toast.success(`Site "${name}" deleted`);
            
            // Add to persistent notifications
            const { addNotification } = useNotificationStore.getState();
            addNotification({
                type: 'info',
                title: 'Site Deleted',
                message: `Website "${name}" and its associated data were removed from your dashboard.`,
            });
            
            // If we deleted the active site, reset it
            if (activeSiteId === id) {
                const remaining = userSites.filter(s => s._id !== id);
                setAccounts({ 
                    activeSiteId: remaining.length > 0 ? remaining[0]._id : null 
                });
            }
            
            fetchSites();
        } catch {
            toast.error('Failed to delete site');
        }
    };

    const handleEdit = (id) => {
        setAccounts({ activeSiteId: id });
        navigate('/connect-accounts?view=true');
    };

    const handleSelect = (id) => {
        setAccounts({ activeSiteId: id });
        navigate('/dashboard');
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Connected Websites</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Manage multiple properties and their integration status</p>
                    </div>
                    <button
                        onClick={() => navigate('/connect-accounts?new=true')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-black rounded-xl transition-all shadow-md shadow-brand-500/20 hover:-translate-y-0.5 active:scale-95"
                    >
                        <PlusIcon className="w-4 h-4" strokeWidth={3}/>
                        Add Website
                    </button>
                </div>

                {loading && userSites.length === 0 && (
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-sm animate-pulse">
                        <div className="h-12 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800"/>
                        {[1,2,3,4].map(i => (
                        <div key={i} className="flex items-center gap-4 px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                            <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex-shrink-0"/>
                            <div className="flex-1 space-y-2">
                            <div className="h-3.5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded-full"/>
                            <div className="h-2.5 w-48 bg-neutral-100 dark:bg-neutral-800 rounded-full"/>
                            </div>
                            <div className="flex gap-2">
                            <div className="h-6 w-10 bg-neutral-200 dark:bg-neutral-700 rounded-full"/>
                            <div className="h-6 w-10 bg-neutral-200 dark:bg-neutral-700 rounded-full"/>
                            <div className="h-6 w-10 bg-neutral-200 dark:bg-neutral-700 rounded-full"/>
                            <div className="h-6 w-10 bg-neutral-200 dark:bg-neutral-700 rounded-full"/>
                            </div>
                            <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full"/>
                            <div className="flex gap-1">
                            <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg"/>
                            <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg"/>
                            <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg"/>
                            </div>
                        </div>
                        ))}
                    </div>
                )}

                {userSites.length === 0 && !loading && (
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-16 flex flex-col items-center text-center shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-5 border border-neutral-200 dark:border-neutral-700">
                        <GlobeAltIcon className="w-8 h-8 text-neutral-400"/>
                        </div>
                        <h2 className="text-lg font-black text-neutral-900 dark:text-white mb-2">No websites connected yet</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mb-6 leading-relaxed">Connect your first website to start tracking analytics and getting AI-powered insights.</p>
                        <button
                        onClick={() => navigate('/connect-accounts?new=true')}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-black rounded-xl transition-all shadow-md shadow-brand-500/20 hover:-translate-y-0.5 active:scale-95"
                        >
                        <PlusIcon className="w-4 h-4" strokeWidth={3}/>
                        Get Started
                        </button>
                    </div>
                )}

                {userSites.length > 0 && (
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <div className="min-w-[700px]">
                                {/* Table header */}
                                <div className="grid grid-cols-[2fr_2fr_1fr_auto] gap-0 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                        {['Website', 'Integrations', 'Status', 'Actions'].map(h => (
                            <div key={h} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 last:text-right">{h}</div>
                        ))}
                        </div>

                        {/* Table rows */}
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {userSites.map((site) => {
                            const isActive = activeSiteId === site._id;
                            return (
                            <div
                                key={site._id}
                                className={`grid grid-cols-[2fr_2fr_1fr_auto] gap-0 items-center transition-colors group ${
                                isActive
                                    ? 'bg-brand-50/30 dark:bg-brand-900/5'
                                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                                }`}
                            >
                                {/* Website name */}
                                <div className="px-5 py-4 flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors ${
                                    isActive
                                    ? 'bg-brand-100 dark:bg-brand-900/30 border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400'
                                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400'
                                }`}>
                                    <GlobeAltIcon className="w-4 h-4"/>
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-black text-neutral-900 dark:text-white leading-tight truncate">{site.siteName}</p>
                                    {isActive && (
                                    <p className="text-[10px] font-bold text-brand-500 dark:text-brand-400 mt-0.5">Currently active</p>
                                    )}
                                </div>
                                </div>

                                {/* Integration badges */}
                                <div className="px-5 py-4 flex flex-wrap gap-1.5">
                                <ConnectionStatus connected={!!site.ga4PropertyId}       label="GA4"/>
                                <ConnectionStatus connected={!!site.gscSiteUrl}          label="GSC"/>
                                <ConnectionStatus connected={!!site.googleAdsCustomerId}  label="Ads"/>
                                <ConnectionStatus connected={!!site.facebookAdAccountId}  label="Meta"/>
                                </div>

                                {/* Status */}
                                <div className="px-5 py-4">
                                {isActive ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm">
                                    <CheckCircleIcon className="w-3 h-3" strokeWidth={3}/>
                                    Active
                                    </span>
                                ) : (
                                    <button
                                    onClick={() => handleSelect(site._id)}
                                    className="text-[10px] font-black uppercase tracking-wider text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors px-2.5 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20"
                                    >
                                    Select
                                    </button>
                                )}
                                </div>

                                {/* Actions */}
                                <div className="px-5 py-4 flex items-center gap-1 justify-end">
                                <button
                                    onClick={() => handleSelect(site._id)}
                                    title="View Analytics"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all"
                                >
                                    <ChartBarIcon className="w-4 h-4"/>
                                </button>
                                <button
                                    onClick={() => handleEdit(site._id)}
                                    title="Edit Connections"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                                >
                                    <PencilSquareIcon className="w-4 h-4"/>
                                </button>
                                <button
                                    onClick={() => handleDelete(site._id, site.siteName)}
                                    title="Delete Site"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                >
                                    <TrashIcon className="w-4 h-4"/>
                                </button>
                                </div>
                            </div>
                            );
                        })}
                        </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-800/30 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
                            {userSites.length} website{userSites.length !== 1 ? 's' : ''} connected
                        </p>
                        <button
                            onClick={() => navigate('/connect-accounts?new=true')}
                            className="inline-flex items-center gap-1.5 text-xs font-black text-brand-600 dark:text-brand-400 hover:underline"
                        >
                            <PlusIcon className="w-3.5 h-3.5" strokeWidth={3}/>
                            Add another
                        </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default SitesPage;
