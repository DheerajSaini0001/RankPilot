import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import Button from '../components/ui/Button';
import { getMe } from '../api/authApi';
import { listGa4, listGsc, listGoogleAds, listGoogleAccounts, listFacebookAds, listFacebookAccounts, selectAccounts, getActiveAccounts } from '../api/accountApi';
import { useAccountsStore } from '../store/accountsStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import toast from 'react-hot-toast';
import { getApiUrl } from '../api/index';

const ConnectAccountsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const { connectedSources, activeSiteId, setAccounts } = useAccountsStore();
    const { token } = useAuthStore();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(window.location.search);
    const isNew = queryParams.get('new') === 'true';
    const isViewOnly = queryParams.get('view') === 'true';

    const [googleAccounts, setGoogleAccounts] = useState([]);
    const [facebookAccounts, setFacebookAccounts] = useState([]);
    
    // Data lists
    const [ga4Props, setGa4Props] = useState([]);
    const [gscSites, setGscSites] = useState([]);
    const [gAdsAccounts, setGAdsAccounts] = useState([]);
    const [fbAdAccounts, setFbAdAccounts] = useState([]);

    // Selection Mappings (Token IDs)
    const [ga4TokenId, setGa4TokenId] = useState('');
    const [gscTokenId, setGscTokenId] = useState('');
    const [googleAdsTokenId, setGoogleAdsTokenId] = useState('');
    const [facebookTokenId, setFacebookTokenId] = useState('');

    // Selections (Property/Site IDs)
    const [selectedGa4, setSelectedGa4] = useState('');
    const [selectedGsc, setSelectedGsc] = useState('');
    const [selectedGAds, setSelectedGAds] = useState('');
    const [selectedFbAds, setSelectedFbAds] = useState('');
    const [siteName, setSiteName] = useState('My Website');
    const [initialValues, setInitialValues] = useState({});


    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const me = await getMe();
                setAccounts({ connectedSources: me.data.connectedSources });

                // Load already connected Google accounts
                if (me.data.connectedSources.includes('google')) {
                    const accs = await listGoogleAccounts();
                    setGoogleAccounts(accs.data || []);
                }

                if (!isNew) {
                    const active = await getActiveAccounts(activeSiteId);
                    if (active.data) {
                        const vals = {
                            siteName: active.data.siteName || '',
                            ga4: active.data.ga4PropertyId || '',
                            ga4TokenId: active.data.ga4TokenId || '',
                            gsc: active.data.gscSiteUrl || '',
                            gscTokenId: active.data.gscTokenId || '',
                            gAds: active.data.googleAdsCustomerId || '',
                            googleAdsTokenId: active.data.googleAdsTokenId || '',
                            fbAds: active.data.facebookAdAccountId || '',
                            facebookTokenId: active.data.facebookTokenId || ''
                        };
                        setInitialValues(vals);
                        if (vals.siteName) setSiteName(vals.siteName);
                        if (vals.ga4) setSelectedGa4(vals.ga4);
                        if (vals.ga4TokenId) setGa4TokenId(vals.ga4TokenId);
                        if (vals.gsc) setSelectedGsc(vals.gsc);
                        if (vals.gscTokenId) setGscTokenId(vals.gscTokenId);
                        if (vals.gAds) setSelectedGAds(vals.gAds);
                        if (vals.googleAdsTokenId) setGoogleAdsTokenId(vals.googleAdsTokenId);
                        if (vals.fbAds) setSelectedFbAds(vals.fbAds);
                        if (vals.facebookTokenId) setFacebookTokenId(vals.facebookTokenId);
                    }
                } else {
                    setInitialValues({});
                    setSiteName('New Website');
                    setSelectedGa4('');
                    setSelectedGsc('');
                    setSelectedGAds('');
                    setSelectedFbAds('');
                    setGa4TokenId('');
                    setGscTokenId('');
                    setGoogleAdsTokenId('');
                    setFacebookTokenId('');
                }

                if (me.data.connectedSources.includes('facebook')) {
                    const faccs = await listFacebookAccounts();
                    setFacebookAccounts(faccs.data || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [activeSiteId, isNew, setAccounts]);

    // Side Effects: Fetch properties when Token is selected
    useEffect(() => {
        if (ga4TokenId) {
            listGa4(ga4TokenId).then(res => setGa4Props(res.data || [])).catch(() => setGa4Props([]));
        } else {
            setGa4Props([]);
        }
    }, [ga4TokenId]);

    useEffect(() => {
        if (gscTokenId) {
            listGsc(gscTokenId).then(res => setGscSites(res.data || [])).catch(() => setGscSites([]));
        } else {
            setGscSites([]);
        }
    }, [gscTokenId]);

    useEffect(() => {
        if (googleAdsTokenId) {
            listGoogleAds(googleAdsTokenId).then(res => setGAdsAccounts(res.data || [])).catch(() => setGAdsAccounts([]));
        } else {
            setGAdsAccounts([]);
        }
    }, [googleAdsTokenId]);

    useEffect(() => {
        if (facebookTokenId) {
            listFacebookAds(facebookTokenId).then(res => setFbAdAccounts(res.data || [])).catch(() => setFbAdAccounts([]));
        } else {
            setFbAdAccounts([]);
        }
    }, [facebookTokenId]);

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
                ga4TokenId: ga4TokenId,
                gscSiteUrl: selectedGsc,
                gscTokenId: gscTokenId,
                googleAdsCustomerId: selectedGAds,
                googleAdsAccountName: selectedGAdsObj || '',
                googleAdsTokenId: googleAdsTokenId,
                facebookAdAccountId: selectedFbAds,
                facebookAdAccountName: selectedFbAdsObj?.name || '',
                facebookTokenId: facebookTokenId
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
            
            // Add to persistent notifications
            const { addNotification } = useNotificationStore.getState();
            addNotification({
                type: 'success',
                title: isNew ? 'Website Connected' : 'Integrations Updated',
                message: isNew 
                    ? `Successfully connected "${siteName}" to your analytics dashboard.`
                    : `Updated marketing data connections for "${siteName}".`,
            });
            
            navigate('/dashboard');
        } catch {
            toast.error('Failed to link accounts');
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="w-full py-8">
                {/* 1. Page Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Your Integrations</h1>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Link your marketing platforms to sync performance metrics into the intelligence engine.</p>
                    </div>
                  </div>
                </div>

                {/* 2. Loading Skeleton */}
                {loading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-28 bg-neutral-100 dark:bg-neutral-800 rounded-2xl"/>
                    <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-2xl"/>
                    <div className="h-36 bg-neutral-100 dark:bg-neutral-800 rounded-2xl"/>
                  </div>
                ) : (
                    <div className="space-y-6">
                        {/* 3. Website Name Card */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                              <span className="text-sm">🌐</span>
                            </div>
                            <label className="text-sm font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Website Name</label>
                          </div>
                          <input
                            type="text"
                            value={siteName}
                            onChange={e => setSiteName(e.target.value)}
                            placeholder="e.g. My Portfolio, Client XYZ"
                            className="w-full max-w-sm text-sm font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent py-2.5 px-4 outline-none transition-all placeholder:text-neutral-400"
                          />
                          {isViewOnly ? (
                            <p className="text-[10px] text-brand-500 mt-2 font-black uppercase tracking-widest flex items-center gap-1.5 mt-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block animate-pulse"/>
                              Intelligent Security Mode Active
                            </p>
                          ) : (
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 italic">Use a unique name to distinguish multiple websites.</p>
                          )}
                        </div>

                        {/* 4. Google Integration Card */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-600">
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800 gap-4">
                            <div className="flex items-start sm:items-center gap-4">
                              {/* Google Logo */}
                              <div className="w-12 h-12 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center p-2.5 shadow-sm">
                                <svg viewBox="0 0 24 24" className="w-full h-full">
                                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-black text-neutral-900 dark:text-white">Google Integrations</h3>
                                  {connectedSources.includes('google') ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>ACTIVE
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                                      NOT CONNECTED
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Automated sync for Analytics, Search Console, & Ads</p>
                              </div>
                            </div>

                            {!connectedSources.includes('google') && (
                              <Button
                                onClick={() => window.location.href = getApiUrl(`/auth/google?token=${encodeURIComponent(token)}`)}
                                className="shadow-md shadow-brand-500/20 text-sm"
                              >
                                Connect Google
                              </Button>
                            )}
                          </div>

                          {/* Configure Services — only if connected */}
                          {connectedSources.includes('google') && (
                            <div className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Configure Services</p>
                                <Button 
                                  variant="secondary" 
                                  className="text-[10px] py-1 px-3 h-auto uppercase tracking-tighter"
                                  onClick={() => window.location.href = getApiUrl(`/auth/google?token=${encodeURIComponent(token)}`)}
                                >
                                  + Link Another Account
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                 {/* GA4 */}
                                 <div className="space-y-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                   <div className="space-y-1">
                                      <label className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">Step 1: Select Account (GA4)</label>
                                      <select
                                        value={ga4TokenId}
                                        onChange={e => setGa4TokenId(e.target.value)}
                                        className="w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
                                      >
                                        <option value="">Select Account...</option>
                                        {googleAccounts.map(acc => <option key={acc._id} value={acc._id}>{acc.email}</option>)}
                                      </select>
                                   </div>
                                   <div className="space-y-1">
                                      <label className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">Step 2: Property (GA4)</label>
                                      <select
                                        value={selectedGa4}
                                        onChange={e => setSelectedGa4(e.target.value)}
                                        disabled={!ga4TokenId}
                                        className={`w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm ${!ga4TokenId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                        <option value="">Select Property...</option>
                                        {ga4Props.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </select>
                                   </div>
                                 </div>

                                 {/* GSC */}
                                 <div className="space-y-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                   <div className="space-y-1">
                                      <label className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">Step 1: Select Account (GSC)</label>
                                      <select
                                        value={gscTokenId}
                                        onChange={e => setGscTokenId(e.target.value)}
                                        className="w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
                                      >
                                        <option value="">Select Account...</option>
                                        {googleAccounts.map(acc => <option key={acc._id} value={acc._id}>{acc.email}</option>)}
                                      </select>
                                   </div>
                                   <div className="space-y-1">
                                      <label className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">Step 2: Target Site (GSC)</label>
                                      <select
                                        value={selectedGsc}
                                        onChange={e => setSelectedGsc(e.target.value)}
                                        disabled={!gscTokenId}
                                        className={`w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm ${!gscTokenId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                        <option value="">Select Site...</option>
                                        {gscSites.map(s => <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>)}
                                      </select>
                                   </div>
                                 </div>

                                 {/* Google Ads */}
                                 <div className="lg:col-span-2 space-y-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">Step 1: Select Account (Ads)</label>
                                        <select
                                          value={googleAdsTokenId}
                                          onChange={e => setGoogleAdsTokenId(e.target.value)}
                                          className="w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
                                        >
                                          <option value="">Select Account...</option>
                                          {googleAccounts.map(acc => <option key={acc._id} value={acc._id}>{acc.email}</option>)}
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">Step 2: Ads Customer ID</label>
                                        <select
                                          value={selectedGAds}
                                          onChange={e => setSelectedGAds(e.target.value)}
                                          disabled={!googleAdsTokenId}
                                          className={`w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm ${!googleAdsTokenId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                          <option value="">Select Ads ID...</option>
                                          {gAdsAccounts.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                      </div>
                                   </div>
                                 </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 5. Facebook Integration Card */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-600">
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800 gap-4">
                            <div className="flex items-start sm:items-center gap-4">
                              {/* Facebook Logo */}
                              <div className="w-12 h-12 rounded-xl bg-[#1877F2] flex items-center justify-center p-2.5 shadow-sm">
                                <svg fill="white" viewBox="0 0 24 24" className="w-full h-full">
                                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-black text-neutral-900 dark:text-white">Meta Business Sync</h3>
                                  {connectedSources.includes('facebook') ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>ACTIVE
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                                      NOT CONNECTED
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Automated sync for Facebook & Instagram Ads</p>
                              </div>
                            </div>

                            {!connectedSources.includes('facebook') && (
                              <Button
                                onClick={() => window.location.href = getApiUrl(`/auth/facebook?token=${encodeURIComponent(token)}`)}
                                className="shadow-md text-sm"
                              >
                                Connect Meta
                              </Button>
                            )}
                          </div>

                          {/* Configure Ad Account */}
                          {connectedSources.includes('facebook') && (
                            <div className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Configure Ad Account</p>
                                <Button 
                                  variant="secondary" 
                                  className="text-[10px] py-1 px-3 h-auto uppercase tracking-tighter"
                                  onClick={() => window.location.href = getApiUrl(`/auth/facebook?token=${encodeURIComponent(token)}`)}
                                >
                                  + Link Another Profile
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-black uppercase tracking-wider text-[#1877F2]">Step 1: Select Profile</label>
                                  <select
                                    value={facebookTokenId}
                                    onChange={e => setFacebookTokenId(e.target.value)}
                                    className="w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-[#1877F2] transition-all"
                                  >
                                    <option value="">Select Profile...</option>
                                    {facebookAccounts.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-black uppercase tracking-wider text-[#1877F2]">Step 2: Ad Account</label>
                                  <select
                                    value={selectedFbAds}
                                    onChange={e => setSelectedFbAds(e.target.value)}
                                    disabled={!facebookTokenId}
                                    className={`w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-[#1877F2] transition-all ${!facebookTokenId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <option value="">Select Account...</option>
                                    {fbAdAccounts.map(f => <option key={f.id} value={f.id}>{f.name} ({f.id})</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 6. Save Actions Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-2 border-t border-neutral-200 dark:border-neutral-800">
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 italic hidden sm:block">
                            {isViewOnly ? '🔒 Security mode — existing connections are locked' : '💡 You can update these settings anytime from Connected Sites'}
                          </p>
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button
                              variant="secondary"
                              onClick={() => navigate('/sites')}
                              className="flex-1 sm:flex-none px-6 py-2.5 text-sm"
                            >
                              Cancel
                            </Button>
                            <Button
                              loading={saving}
                              onClick={handleSave}
                              className="flex-1 sm:flex-none px-8 py-2.5 text-sm shadow-lg shadow-brand-500/25"
                            >
                              {isViewOnly ? 'Update Missing Connections' : 'Save Integration Settings'}
                            </Button>
                          </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default ConnectAccountsPage;
