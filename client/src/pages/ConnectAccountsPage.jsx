import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import Button from '../components/ui/Button';
import { getMe } from '../api/authApi';
import { listGa4, listGsc, listGoogleAds, listFacebookAds, selectAccounts, getActiveAccounts } from '../api/accountApi';
import { useAccountsStore } from '../store/accountsStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const ConnectAccountsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const { connectedSources, activeSiteId, setAccounts } = useAccountsStore();
    const { token } = useAuthStore();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(window.location.search);
    const isNew = queryParams.get('new') === 'true';

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
    const [siteName, setSiteName] = useState('My Website');


    useEffect(() => {
        loadData();
    }, [activeSiteId, isNew]);


    const loadData = async () => {
        setLoading(true);
        try {
            const me = await getMe();
            setAccounts({ connectedSources: me.data.connectedSources });

            // Only load active accounts if we are NOT in "new site" mode
            if (!isNew) {
                const active = await getActiveAccounts(activeSiteId);
                if (active.data) {
                    if (active.data.siteName) setSiteName(active.data.siteName);
                    if (active.data.ga4PropertyId) setSelectedGa4(active.data.ga4PropertyId);
                    if (active.data.gscSiteUrl) setSelectedGsc(active.data.gscSiteUrl);
                    if (active.data.googleAdsCustomerId) setSelectedGAds(active.data.googleAdsCustomerId);
                    if (active.data.facebookAdAccountId) setSelectedFbAds(active.data.facebookAdAccountId);
                }
            } else {
                // Reset selections for new site
                setSiteName('New Website');
                setSelectedGa4('');
                setSelectedGsc('');
                setSelectedGAds('');
                setSelectedFbAds('');
            }

            if (me.data.connectedSources.includes('google')) {
                const p = await listGa4().catch(() => ({ data: [] }));
                setGa4Props(p.data || []);
                const s = await listGsc().catch(() => ({ data: [] }));
                setGscSites(s.data || []);
                const g = await listGoogleAds().catch(() => ({ data: [] }));
                setGAdsAccounts(g.data || []);
            }
            if (me.data.connectedSources.includes('facebook')) {
                const f = await listFacebookAds().catch(() => ({ data: [] }));
                setFbAdAccounts(f.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!siteName.trim()) {
            toast.error('Please enter a website name');
            return;
        }
        setSaving(true);
        try {
            const selectedGa4Obj = ga4Props.find(p => p.id === selectedGa4);
            const selectedGAdsObj = gAdsAccounts.find(g => g === selectedGAds);
            const selectedFbAdsObj = fbAdAccounts.find(f => f.id === selectedFbAds);

            const data = {
                siteId: isNew ? undefined : activeSiteId,
                siteName: siteName,
                ga4PropertyId: selectedGa4,
                ga4PropertyName: selectedGa4Obj?.name || '',
                ga4AccountId: selectedGa4Obj?.accountId || '',
                gscSiteUrl: selectedGsc,
                googleAdsCustomerId: selectedGAds,
                googleAdsAccountName: selectedGAdsObj || '', // Google Ads list currently returns just IDs
                facebookAdAccountId: selectedFbAds,
                facebookAdAccountName: selectedFbAdsObj?.name || ''
            };
            
            const res = await selectAccounts(data);
            const updatedAccount = res.data.accounts;
            
            setAccounts({
                activeSiteId: updatedAccount._id,
                activeGscSite: updatedAccount.gscSiteUrl || null,
                activeGa4PropertyId: updatedAccount.ga4PropertyId || null,
                activeGoogleAdsCustomerId: updatedAccount.googleAdsCustomerId || null,
                activeFacebookAdAccountId: updatedAccount.facebookAdAccountId || null,
            });
            toast.success(isNew ? 'New website added!' : 'Integrations updated!');
            navigate('/dashboard');
        } catch (err) {
            toast.error('Failed to link accounts');
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="w-full flex flex-col h-full min-h-[calc(100vh-4rem)]">
                <div className="mb-8">
                    <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
                        <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Your Integrations
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-2 font-medium">Link your marketing platforms to continuously sync performance metrics into the intelligence engine.</p>
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
                        <div className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
                    </div>
                ) : (
                <div className="flex flex-col h-full">
                    <div className="flex flex-col gap-6 xl:gap-8 flex-1">
                        {/* Site Name Input */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-3xl p-6 md:p-8 shadow-sm">
                            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wide">Website Name</label>
                            <input
                                type="text"
                                value={siteName}
                                onChange={e => setSiteName(e.target.value)}
                                placeholder="e.g. My Portfolio, Client XYZ"
                                className="w-full max-w-md text-lg font-bold rounded-xl border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-dark-surface text-neutral-900 dark:text-white focus:ring-brand-400 py-3 px-4 focus:outline-none focus:ring-2 shadow-sm"
                            />
                            <p className="text-xs text-neutral-500 mt-2 italic">* Use a unique name to distinguish multiple websites.</p>
                        </div>

                        {/* Google Integrations (Combined) */}

                            <div className="group bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-2xl hover:shadow-brand-500/5 hover:border-brand-400/50 dark:hover:border-brand-500/50 transition-all duration-500 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"></div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10 mb-2">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-dark-surface dark:to-neutral-800/80 rounded-2xl flex items-center justify-center p-3.5 shadow-sm border border-neutral-200/50 dark:border-neutral-700/50 group-hover:scale-105 transition-transform duration-300">
                                            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-sm"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Google Integrations</h3>
                                                {connectedSources.includes('google') && (
                                                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-md border border-green-200 dark:border-green-800/50">Active</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">Automated sync for Analytics, Search Console, & Ads</p>
                                        </div>
                                    </div>
                                    <div>
                                        {!connectedSources.includes('google') && (
                                            <Button onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/google?token=${encodeURIComponent(token)}`} className="shadow-lg shadow-brand-500/25">Connect Google</Button>
                                        )}
                                    </div>
                                </div>

                                {connectedSources.includes('google') && (
                                    <div className="mt-8 relative z-10 pt-6 border-t border-neutral-100 dark:border-neutral-800/80">
                                        <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-4 uppercase tracking-wider">Configure Services</h4>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {/* GA4 */}
                                            <div className="bg-neutral-50 dark:bg-dark-surface/50 p-4 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 transition-colors focus-within:border-brand-300 dark:focus-within:border-brand-700">
                                                <label className="block text-xs font-bold text-brand-600 dark:text-brand-400 mb-2 uppercase tracking-wide">Property (GA4)</label>
                                                <select
                                                    value={selectedGa4}
                                                    onChange={e => setSelectedGa4(e.target.value)}
                                                    className="w-full text-sm rounded-lg border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-card text-neutral-900 dark:text-white focus:ring-brand-400 py-2.5 px-3 focus:outline-none focus:ring-2 shadow-sm font-medium"
                                                >
                                                    <option value="">Select Property...</option>
                                                    {ga4Props.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>

                                            {/* GSC */}
                                            <div className="bg-neutral-50 dark:bg-dark-surface/50 p-4 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 transition-colors focus-within:border-brand-300 dark:focus-within:border-brand-700">
                                                <label className="block text-xs font-bold text-brand-600 dark:text-brand-400 mb-2 uppercase tracking-wide">Target Site (GSC)</label>
                                                <select
                                                    value={selectedGsc}
                                                    onChange={e => setSelectedGsc(e.target.value)}
                                                    className="w-full text-sm rounded-lg border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-card text-neutral-900 dark:text-white focus:ring-brand-400 py-2.5 px-3 focus:outline-none focus:ring-2 shadow-sm font-medium"
                                                >
                                                    <option value="">Select Site...</option>
                                                    {gscSites.map(s => <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>)}
                                                </select>
                                            </div>

                                            {/* Google Ads */}
                                            <div className="bg-neutral-50 dark:bg-dark-surface/50 p-4 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 transition-colors focus-within:border-brand-300 dark:focus-within:border-brand-700 lg:col-span-2">
                                                <label className="block text-xs font-bold text-brand-600 dark:text-brand-400 mb-2 uppercase tracking-wide">Ads Account</label>
                                                <select
                                                    value={selectedGAds}
                                                    onChange={e => setSelectedGAds(e.target.value)}
                                                    className="w-full text-sm rounded-lg border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-card text-neutral-900 dark:text-white focus:ring-brand-400 py-2.5 px-3 focus:outline-none focus:ring-2 shadow-sm font-medium"
                                                >
                                                    <option value="">Select Account...</option>
                                                    {gAdsAccounts.map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Facebook Integration */}
                            <div className="group bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 hover:border-blue-400/50 dark:hover:border-blue-500/50 transition-all duration-500 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"></div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10 mb-2">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-dark-surface dark:to-neutral-800/80 rounded-2xl flex items-center justify-center p-3.5 shadow-sm border border-neutral-200/50 dark:border-neutral-700/50 group-hover:scale-105 transition-transform duration-300">
                                            <svg fill="#1877F2" viewBox="0 0 24 24" className="w-full h-full drop-shadow-sm"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Meta Business Sync</h3>
                                                {connectedSources.includes('facebook') && (
                                                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-md border border-green-200 dark:border-green-800/50">Active</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">Automated sync for Facebook & Instagram Ads</p>
                                        </div>
                                    </div>
                                    <div>
                                        {!connectedSources.includes('facebook') && (
                                            <Button onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/facebook?token=${encodeURIComponent(token)}`} className="shadow-lg shadow-brand-500/25">Connect Meta</Button>
                                        )}
                                    </div>
                                </div>

                                {connectedSources.includes('facebook') && (
                                    <div className="mt-8 relative z-10 pt-6 border-t border-neutral-100 dark:border-neutral-800/80">
                                        <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-4 uppercase tracking-wider">Configure Ad Account</h4>
                                        <div className="bg-neutral-50 dark:bg-dark-surface/50 p-4 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 transition-colors focus-within:border-brand-300 dark:focus-within:border-brand-700 max-w-sm">
                                            <label className="block text-xs font-bold text-brand-600 dark:text-brand-400 mb-2 uppercase tracking-wide">Primary Ad Account</label>
                                            <select
                                                value={selectedFbAds}
                                                onChange={e => setSelectedFbAds(e.target.value)}
                                                className="w-full text-sm rounded-lg border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-card text-neutral-900 dark:text-white focus:ring-brand-400 py-2.5 px-3 focus:outline-none focus:ring-2 shadow-sm font-medium"
                                            >
                                                <option value="">Select Ad Account...</option>
                                                {fbAdAccounts.map(f => <option key={f.id} value={f.id}>{f.name} ({f.id})</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Save Actions */}
                        <div className="flex justify-end pt-10 pb-6 relative z-10 mt-6 md:mt-auto shrink-0 border-t border-neutral-200/60 dark:border-neutral-700/60">
                            <Button loading={saving} onClick={handleSave} className="px-8 py-3 text-sm tracking-wide shadow-xl shadow-brand-500/20">
                                Save Integration Settings
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default ConnectAccountsPage;
