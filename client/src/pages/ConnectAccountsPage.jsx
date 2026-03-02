import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { getMe } from '../api/authApi';
import { listGa4, listGsc, listGoogleAds, listFacebookAds, selectAccounts, getActiveAccounts, disconnectGoogle, disconnectFacebook } from '../api/accountApi';
import { useAccountsStore } from '../store/accountsStore';
import toast from 'react-hot-toast';

const ConnectAccountsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const { connectedSources, setAccounts } = useAccountsStore();
    const navigate = useNavigate();

    // Data lists
    const [ga4Props, setGa4Props] = useState([]);
    const [gscSites, setGscSites] = useState([]);
    const [gAdsAccounts, setGAdsAccounts] = useState([]);
    const [fbAdAccounts, setFbAdAccounts] = useState([]);

    // Selections
    const [selectedGa4, setSelectedGa4] = useState('');
    const [selectedGsc, setSelectedGsc] = useState('');
    const [selectedGAds, setSelectedGAds] = useState('');
    const [selectedFbAds, setSelectedFbAds] = useState('');

    useEffect(() => {
        loadData();
        // eslint-disable-next-line
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const me = await getMe();
            setAccounts({ connectedSources: me.data.connectedSources });

            const active = await getActiveAccounts();
            if (active.data) {
                if (active.data.ga4PropertyId) setSelectedGa4(active.data.ga4PropertyId);
                if (active.data.gscSiteUrl) setSelectedGsc(active.data.gscSiteUrl);
                if (active.data.googleAdsCustomerId) setSelectedGAds(active.data.googleAdsCustomerId);
                if (active.data.facebookAdAccountId) setSelectedFbAds(active.data.facebookAdAccountId);
            }

            if (me.data.connectedSources.includes('ga4')) {
                const p = await listGa4().catch(() => ({ data: [] }));
                setGa4Props(p.data || []);
                const s = await listGsc().catch(() => ({ data: [] }));
                setGscSites(s.data || []);
                const g = await listGoogleAds().catch(() => ({ data: [] }));
                setGAdsAccounts(g.data || []);
            }
            if (me.data.connectedSources.includes('facebook-ads')) {
                const f = await listFacebookAds().catch(() => ({ data: [] }));
                setFbAdAccounts(f.data?.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = {
                ga4PropertyId: selectedGa4,
                gscSiteUrl: selectedGsc,
                googleAdsCustomerId: selectedGAds,
                facebookAdAccountId: selectedFbAds
            };
            await selectAccounts(data);
            toast.success('Accounts linked successfully!');
            navigate('/dashboard');
        } catch (err) {
            toast.error('Failed to link accounts');
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Connect Data Sources</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">Authenticate platforms and select the corresponding accounts to fetch analytics.</p>
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
                        <div className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Google Integration */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-neutral-100 dark:bg-dark-surface rounded-full flex items-center justify-center p-2">
                                        <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Google Platforms</h3>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Connect Analytics, Search Console & Ads</p>
                                    </div>
                                </div>
                                {connectedSources.includes('ga4') ? (
                                    <Badge variant="success">Connected</Badge>
                                ) : (
                                    <Button onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/google`}>Connect Google</Button>
                                )}
                            </div>

                            {connectedSources.includes('ga4') && (
                                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-50 dark:bg-dark-surface p-4 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">GA4 Property</label>
                                        <select
                                            value={selectedGa4}
                                            onChange={e => setSelectedGa4(e.target.value)}
                                            className="w-full text-sm rounded-md border-neutral-300 dark:border-neutral-700 bg-white dark:bg-dark-card text-neutral-900 dark:text-white focus:ring-brand-400 py-2 px-3 focus:outline-none focus:ring-2"
                                        >
                                            <option value="">Select Property...</option>
                                            {ga4Props.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Search Console Site</label>
                                        <select
                                            value={selectedGsc}
                                            onChange={e => setSelectedGsc(e.target.value)}
                                            className="w-full text-sm rounded-md border-neutral-300 dark:border-neutral-700 bg-white dark:bg-dark-card text-neutral-900 dark:text-white focus:ring-brand-400 py-2 px-3 focus:outline-none focus:ring-2"
                                        >
                                            <option value="">Select Site...</option>
                                            {gscSites.map(s => <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Google Ads Account</label>
                                        <select
                                            value={selectedGAds}
                                            onChange={e => setSelectedGAds(e.target.value)}
                                            className="w-full text-sm rounded-md border-neutral-300 dark:border-neutral-700 bg-white dark:bg-dark-card text-neutral-900 dark:text-white focus:ring-brand-400 py-2 px-3 focus:outline-none focus:ring-2"
                                        >
                                            <option value="">Select Account...</option>
                                            {gAdsAccounts.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Facebook Integration */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-neutral-100 dark:bg-dark-surface rounded-full flex items-center justify-center p-2">
                                        <svg fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Facebook Ads</h3>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Connect Meta Business Manager</p>
                                    </div>
                                </div>
                                {connectedSources.includes('facebook-ads') ? (
                                    <Badge variant="success">Connected</Badge>
                                ) : (
                                    <Button onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/facebook`}>Connect Facebook</Button>
                                )}
                            </div>

                            {connectedSources.includes('facebook-ads') && (
                                <div className="mt-6 bg-neutral-50 dark:bg-dark-surface p-4 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Ad Account</label>
                                    <select
                                        value={selectedFbAds}
                                        onChange={e => setSelectedFbAds(e.target.value)}
                                        className="w-full max-w-sm text-sm rounded-md border-neutral-300 dark:border-neutral-700 bg-white dark:bg-dark-card text-neutral-900 dark:text-white focus:ring-brand-400 py-2 px-3 focus:outline-none focus:ring-2"
                                    >
                                        <option value="">Select Ad Account...</option>
                                        {fbAdAccounts.map(f => <option key={f.id} value={f.id}>{f.name} ({f.id})</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Save Actions */}
                        <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700">
                            <Button loading={saving} onClick={handleSave}>
                                Save Connected Data Sources
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default ConnectAccountsPage;
