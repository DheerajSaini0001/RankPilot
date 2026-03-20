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
import { deleteSite, listSites } from '../api/accountApi';
import toast from 'react-hot-toast';

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

    const ConnectionStatus = ({ connected, label, color }) => (
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            connected 
            ? `bg-${color}-50 dark:bg-${color}-900/20 border-${color}-100 dark:border-${color}-800/50 text-${color}-600 dark:text-${color}-400` 
            : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-700/50 text-neutral-400 dark:text-neutral-500'
        }`}>
            <div className={`w-1 h-1 rounded-full ${connected ? `bg-${color}-500` : 'bg-neutral-300 dark:bg-neutral-600'}`}></div>
            {label}
        </div>
    );

    return (
        <DashboardLayout>
            <div className="flex flex-col space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Connected Websites</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Manage multiple properties and their integration status</p>
                    </div>
                    <button 
                        onClick={() => navigate('/connect-accounts?new=true')}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-md shadow-brand-500/10 active:scale-95"
                    >
                        <PlusIcon className="w-5 h-5" strokeWidth={2.5} />
                        Add New Website
                    </button>
                </div>

                {loading && userSites.length === 0 ? (
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-8">
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-neutral-50 dark:bg-neutral-800/50 animate-pulse rounded-xl"></div>
                            ))}
                        </div>
                    </div>
                ) : userSites.length === 0 ? (
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-16 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                            <GlobeAltIcon className="w-10 h-10 text-neutral-400" />
                        </div>
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">No websites connected yet</h2>
                        <p className="text-neutral-500 dark:text-neutral-400 mt-2 max-w-sm mb-8">Connect your first website to start tracking analytics and getting AI-powered insights.</p>
                        <button 
                            onClick={() => navigate('/connect-accounts?new=true')}
                            className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-colors"
                        >
                            Get Started
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-neutral-50/50 dark:bg-dark-surface/50 border-b border-neutral-100 dark:border-neutral-800">
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Website Name</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Integration Status</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 text-center">Status</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {userSites.map((site) => (
                                        <tr 
                                            key={site._id} 
                                            className={`group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors ${
                                                activeSiteId === site._id ? 'bg-brand-50/20 dark:bg-brand-900/5' : ''
                                            }`}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
                                                        activeSiteId === site._id 
                                                        ? 'bg-brand-100 border-brand-200 text-brand-600 dark:bg-brand-900/30 dark:border-brand-800 dark:text-brand-400' 
                                                        : 'bg-neutral-100 border-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400'
                                                    }`}>
                                                        <GlobeAltIcon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-neutral-900 dark:text-white leading-tight">{site.siteName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-2">
                                                    <ConnectionStatus connected={!!site.ga4PropertyId} label="GA4" color="orange" />
                                                    <ConnectionStatus connected={!!site.gscSiteUrl} label="GSC" color="blue" />
                                                    <ConnectionStatus connected={!!site.googleAdsCustomerId} label="Ads" color="yellow" />
                                                    <ConnectionStatus connected={!!site.facebookAdAccountId} label="Meta" color="indigo" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex justify-center">
                                                    {activeSiteId === site._id ? (
                                                        <span className="flex items-center gap-1.5 px-3 py-1 bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                                                            <CheckCircleIcon className="w-3 h-3" strokeWidth={3} />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleSelect(site._id)}
                                                            className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                                        >
                                                            Select
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button 
                                                        onClick={() => handleSelect(site._id)}
                                                        className="p-2 text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-all"
                                                        title="View Analytics"
                                                    >
                                                        <ChartBarIcon className="w-5 h-5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEdit(site._id)}
                                                        className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all"
                                                        title="Edit Site Connections"
                                                    >
                                                        <PencilSquareIcon className="w-5 h-5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(site._id, site.siteName)}
                                                        className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                        title="Delete Site"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};


export default SitesPage;
