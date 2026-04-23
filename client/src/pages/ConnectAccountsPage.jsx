import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import Button from '../components/ui/Button';
import { getMe } from '../api/authApi';
import { listGa4, listGsc, listGoogleAds, listGoogleAccounts, listFacebookAds, listFacebookAccounts, selectAccounts, getActiveAccounts, resumeSync } from '../api/accountApi';
import { useAccountsStore } from '../store/accountsStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import toast from 'react-hot-toast';
import { getApiUrl } from '../api/index';

const ConnectAccountsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resumingSource, setResumingSource] = useState(null);

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

    // Modification state (to unlock fields in 'view' mode)
    const [modifyingGa4, setModifyingGa4] = useState(false);
    const [modifyingGsc, setModifyingGsc] = useState(false);
    const [modifyingGAds, setModifyingGAds] = useState(false);
    const [modifyingFbAds, setModifyingFbAds] = useState(false);

    // Connection Status Helpers
    const isGa4Connected = !!initialValues.ga4 && !!initialValues.ga4TokenId;
    const isGscConnected = !!initialValues.gsc && !!initialValues.gscTokenId;
    const isGAdsConnected = !!initialValues.gAds && !!initialValues.googleAdsTokenId;
    const isFbAdsConnected = !!initialValues.fbAds && !!initialValues.facebookTokenId;



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
                    if (active.data && active.data._id) {
                        // Sync store with the actual ID returned (useful if it's the first site or a fallback)
                        setAccounts({ activeSiteId: active.data._id });

                        const vals = {
                            siteId: active.data._id,
                            siteName: active.data.siteName || '',
                            ga4: active.data.ga4PropertyId || '',
                            ga4TokenId: active.data.ga4TokenId || '',
                            ga4SyncStatus: active.data.ga4SyncStatus || 'idle',
                            ga4HistoricalComplete: active.data.ga4HistoricalComplete,
                            gsc: active.data.gscSiteUrl || '',
                            gscTokenId: active.data.gscTokenId || '',
                            gscSyncStatus: active.data.gscSyncStatus || 'idle',
                            gscHistoricalComplete: active.data.gscHistoricalComplete,
                            gAds: active.data.googleAdsCustomerId || '',
                            googleAdsTokenId: active.data.googleAdsTokenId || '',
                            googleAdsSyncStatus: active.data.googleAdsSyncStatus || 'idle',
                            googleAdsHistoricalComplete: active.data.googleAdsHistoricalComplete,
                            fbAds: active.data.facebookAdAccountId || '',
                            facebookTokenId: active.data.facebookTokenId || '',
                            facebookAdsSyncStatus: active.data.facebookAdsSyncStatus || 'idle',
                            facebookAdsHistoricalComplete: active.data.facebookAdsHistoricalComplete
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
                    } else {
                        // No site found, clear any stale ID and initialize defaults
                        if (activeSiteId) setAccounts({ activeSiteId: null });
                        setInitialValues({});
                        setSiteName('My Website');
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
            listGa4(ga4TokenId).then(res => setGa4Props(res.data || [])).catch((err) => {
                if (err.response?.data?.message === 'GOOGLE_AUTH_EXPIRED') {
                    toast.error('Google session expired. Please reconnect your account.');
                }
                setGa4Props([]);
            });
        } else {
            setGa4Props([]);
        }
    }, [ga4TokenId]);

    useEffect(() => {
        if (gscTokenId) {
            listGsc(gscTokenId).then(res => setGscSites(res.data || [])).catch((err) => {
                if (err.response?.data?.message === 'GOOGLE_AUTH_EXPIRED') {
                    toast.error('Google session expired. Please reconnect your account.');
                }
                setGscSites([]);
            });
        } else {
            setGscSites([]);
        }
    }, [gscTokenId]);

    useEffect(() => {
        if (googleAdsTokenId) {
            listGoogleAds(googleAdsTokenId).then(res => setGAdsAccounts(res.data || [])).catch((err) => {
                if (err.response?.data?.message === 'GOOGLE_AUTH_EXPIRED') {
                    toast.error('Google session expired. Please reconnect your account.');
                }
                setGAdsAccounts([]);
            });
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

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        
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
                siteId: (isNew || !activeSiteId) ? undefined : activeSiteId,
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

            // Sync all updated details into the store
            setAccounts({
                activeSiteId: updatedAccount._id,
                activeGscSite: updatedAccount.gscSiteUrl || '',
                activeGa4PropertyId: updatedAccount.ga4PropertyId || '',
                activeGoogleAdsCustomerId: updatedAccount.googleAdsCustomerId || '',
                activeFacebookAdAccountId: updatedAccount.facebookAdAccountId || '',
                syncMetadata: {
                    isHistoricalSyncComplete: updatedAccount.isHistoricalSyncComplete || false,
                    lastDailySyncAt: updatedAccount.lastDailySyncAt || null,
                    syncStatus: updatedAccount.syncStatus || 'idle'
                }
            });

            toast.success(isNew ? 'New website added!' : 'Integrations updated!');
            navigate('/dashboard');
        } catch (err) {
            console.error('Save Accounts Error:', err);
            const message = err.response?.data?.message || 'Failed to link accounts';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleResumeSync = async (source) => {
        setResumingSource(source);
        try {
            await resumeSync({ siteId: activeSiteId, source });
            toast.success(`Sync for ${source.toUpperCase().replace('-', ' ')} resumed!`);
            
            // Update local state status to pending/syncing
            setInitialValues(prev => ({
                ...prev,
                [`${source.replace('-', 'Ads').replace('googleAds', 'googleAds').replace('facebookAds', 'facebookAds')}SyncStatus`]: 'pending'
            }));
        } catch (error) {
            toast.error('Failed to resume sync');
        } finally {
            setResumingSource(null);
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
                                 <div className="space-y-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 relative">
                                   {isGa4Connected && !modifyingGa4 && (
                                     <div className="absolute top-3 right-3 z-10 flex gap-2">
                                       {(initialValues.ga4SyncStatus === 'error' || !initialValues.ga4HistoricalComplete) && (
                                         <button 
                                           onClick={() => handleResumeSync('ga4')}
                                           disabled={resumingSource === 'ga4' || initialValues.ga4SyncStatus === 'syncing'}
                                           className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-lg shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all disabled:opacity-50"
                                         >
                                           {initialValues.ga4SyncStatus === 'syncing' ? 'Syncing...' : 'Resume Sync'}
                                         </button>
                                       )}
                                       <button 
                                         onClick={() => {
                                           setModifyingGa4(true);
                                           setGa4TokenId('');
                                           setSelectedGa4('');
                                         }}
                                         className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 bg-white dark:bg-neutral-900 border border-brand-200 dark:border-brand-800 px-2 py-1 rounded-lg shadow-sm hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all"
                                       >
                                         Change
                                       </button>
                                     </div>
                                   )}
                                   <div className="space-y-1">
                                       <label className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                         {isGa4Connected && !modifyingGa4 && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>}
                                         {isGa4Connected && !modifyingGa4 ? 'Linked Account (GA4)' : 'Step 1: Select Account (GA4)'}
                                       </label>
                                       <select
                                         value={ga4TokenId}
                                         onChange={e => setGa4TokenId(e.target.value)}
                                         disabled={isGa4Connected && !modifyingGa4}
                                         className={`w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm ${isGa4Connected && !modifyingGa4 ? 'opacity-70 cursor-not-allowed bg-neutral-50' : ''}`}
                                       >
                                         <option value="">Select Account...</option>
                                         {googleAccounts.map(acc => <option key={acc._id} value={acc._id}>{acc.email}</option>)}
                                       </select>
                                   </div>

                                   <div className="space-y-1">
                                       <label className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                         {isGa4Connected && !modifyingGa4 && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>}
                                         {isGa4Connected && !modifyingGa4 ? 'Linked Property (GA4)' : 'Step 2: Property (GA4)'}
                                       </label>
                                       <select
                                         value={selectedGa4}
                                         onChange={e => setSelectedGa4(e.target.value)}
                                         disabled={!ga4TokenId || (isGa4Connected && !modifyingGa4)}
                                         className={`w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm ${(!ga4TokenId || (isGa4Connected && !modifyingGa4)) ? 'opacity-70 cursor-not-allowed bg-neutral-50' : ''}`}
                                       >
                                         <option value="">Select Property...</option>
                                         {ga4Props.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                       </select>
                                   </div>
                                 </div>

                                 {/* GSC */}
                                 <div className="space-y-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 relative">
                                   {isGscConnected && !modifyingGsc && (
                                     <div className="absolute top-3 right-3 z-10 flex gap-2">
                                       {(initialValues.gscSyncStatus === 'error' || !initialValues.gscHistoricalComplete) && (
                                         <button 
                                           onClick={() => handleResumeSync('gsc')}
                                           disabled={resumingSource === 'gsc' || initialValues.gscSyncStatus === 'syncing'}
                                           className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-lg shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all disabled:opacity-50"
                                         >
                                           {initialValues.gscSyncStatus === 'syncing' ? 'Syncing...' : 'Resume Sync'}
                                         </button>
                                       )}
                                       <button 
                                         onClick={() => {
                                           setModifyingGsc(true);
                                           setGscTokenId('');
                                           setSelectedGsc('');
                                         }}
                                         className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 bg-white dark:bg-neutral-900 border border-brand-200 dark:border-brand-800 px-2 py-1 rounded-lg shadow-sm hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all"
                                       >
                                         Change
                                       </button>
                                     </div>
                                   )}
                                   <div className="space-y-1">
                                      <label className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                         {isGscConnected && !modifyingGsc && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>}
                                         {isGscConnected && !modifyingGsc ? 'Linked Account (GSC)' : 'Step 1: Select Account (GSC)'}
                                       </label>
                                       <select
                                         value={gscTokenId}
                                         onChange={e => setGscTokenId(e.target.value)}
                                         disabled={isGscConnected && !modifyingGsc}
                                         className={`w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm ${isGscConnected && !modifyingGsc ? 'opacity-70 cursor-not-allowed bg-neutral-50' : ''}`}
                                       >
                                         <option value="">Select Account...</option>
                                         {googleAccounts.map(acc => <option key={acc._id} value={acc._id}>{acc.email}</option>)}
                                       </select>
                                   </div>
                                   <div className="space-y-1">
                                       <label className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                         {isGscConnected && !modifyingGsc && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>}
                                         {isGscConnected && !modifyingGsc ? 'Linked Site (GSC)' : 'Step 2: Target Site (GSC)'}
                                       </label>
                                       <select
                                         value={selectedGsc}
                                         onChange={e => setSelectedGsc(e.target.value)}
                                         disabled={!gscTokenId || (isGscConnected && !modifyingGsc)}
                                         className={`w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm ${(!gscTokenId || (isGscConnected && !modifyingGsc)) ? 'opacity-70 cursor-not-allowed bg-neutral-50' : ''}`}
                                       >
                                         <option value="">Select Site...</option>
                                         {gscSites.map(s => <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>)}
                                       </select>
                                   </div>
                                 </div>

                                 {/* Google Ads */}
                                 <div className="lg:col-span-2 space-y-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 relative">
                                   {isGAdsConnected && !modifyingGAds && (
                                     <div className="absolute top-3 right-3 z-10 flex gap-2">
                                       {(initialValues.googleAdsSyncStatus === 'error' || !initialValues.googleAdsHistoricalComplete) && (
                                         <button 
                                           onClick={() => handleResumeSync('google-ads')}
                                           disabled={resumingSource === 'google-ads' || initialValues.googleAdsSyncStatus === 'syncing'}
                                           className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-lg shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all disabled:opacity-50"
                                         >
                                           {initialValues.googleAdsSyncStatus === 'syncing' ? 'Syncing...' : 'Resume Sync'}
                                         </button>
                                       )}
                                       <button 
                                         onClick={() => {
                                           setModifyingGAds(true);
                                           setGoogleAdsTokenId('');
                                           setSelectedGAds('');
                                         }}
                                         className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 bg-white dark:bg-neutral-900 border border-brand-200 dark:border-brand-800 px-2 py-1 rounded-lg shadow-sm hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all"
                                       >
                                         Change
                                       </button>
                                     </div>
                                   )}
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                         {isGAdsConnected && !modifyingGAds && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>}
                                         {isGAdsConnected && !modifyingGAds ? 'Linked Account (Ads)' : 'Step 1: Select Account (Ads)'}
                                       </label>
                                       <select
                                         value={googleAdsTokenId}
                                         onChange={e => setGoogleAdsTokenId(e.target.value)}
                                         disabled={isGAdsConnected && !modifyingGAds}
                                         className={`w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm ${isGAdsConnected && !modifyingGAds ? 'opacity-70 cursor-not-allowed bg-neutral-50' : ''}`}
                                       >
                                          <option value="">Select Account...</option>
                                          {googleAccounts.map(acc => <option key={acc._id} value={acc._id}>{acc.email}</option>)}
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                         <label className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                           {isGAdsConnected && !modifyingGAds && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>}
                                           {isGAdsConnected && !modifyingGAds ? 'Linked Customer ID' : 'Step 2: Ads Customer ID'}
                                         </label>
                                         <select
                                           value={selectedGAds}
                                           onChange={e => setSelectedGAds(e.target.value)}
                                           disabled={!googleAdsTokenId || (isGAdsConnected && !modifyingGAds)}
                                           className={`w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm ${(!googleAdsTokenId || (isGAdsConnected && !modifyingGAds)) ? 'opacity-70 cursor-not-allowed bg-neutral-50' : ''}`}
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
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 relative">
                                {isFbAdsConnected && !modifyingFbAds && (
                                   <div className="absolute top-3 right-3 z-10 flex gap-2">
                                     {(initialValues.facebookAdsSyncStatus === 'error' || !initialValues.facebookAdsHistoricalComplete) && (
                                       <button 
                                         onClick={() => handleResumeSync('facebook-ads')}
                                         disabled={resumingSource === 'facebook-ads' || initialValues.facebookAdsSyncStatus === 'syncing'}
                                         className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-lg shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all disabled:opacity-50"
                                       >
                                         {initialValues.facebookAdsSyncStatus === 'syncing' ? 'Syncing...' : 'Resume Sync'}
                                       </button>
                                     )}
                                     <button 
                                       onClick={() => {
                                         setModifyingFbAds(true);
                                         setFacebookTokenId('');
                                         setSelectedFbAds('');
                                       }}
                                       className="text-[10px] font-black uppercase text-[#1877F2] bg-white dark:bg-neutral-900 border border-blue-200 dark:border-blue-900 px-2 py-1 rounded-lg shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                     >
                                       Change
                                     </button>
                                   </div>
                                 )}
                                <div className="space-y-1">
                                   <label className="text-[11px] font-black uppercase tracking-wider text-[#1877F2] flex items-center gap-1.5">
                                     {isFbAdsConnected && !modifyingFbAds && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>}
                                     {isFbAdsConnected && !modifyingFbAds ? 'Linked Profile' : 'Step 1: Select Profile'}
                                   </label>
                                   <select
                                     value={facebookTokenId}
                                     onChange={e => setFacebookTokenId(e.target.value)}
                                     disabled={isFbAdsConnected && !modifyingFbAds}
                                     className={`w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-[#1877F2] transition-all ${isFbAdsConnected && !modifyingFbAds ? 'opacity-70 cursor-not-allowed bg-neutral-50' : ''}`}
                                   >
                                     <option value="">Select Profile...</option>
                                     {facebookAccounts.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                                   </select>
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[11px] font-black uppercase tracking-wider text-[#1877F2] flex items-center gap-1.5">
                                     {isFbAdsConnected && !modifyingFbAds && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>}
                                     {isFbAdsConnected && !modifyingFbAds ? 'Linked Ad Account' : 'Step 2: Ad Account'}
                                   </label>
                                   <select
                                     value={selectedFbAds}
                                     onChange={e => setSelectedFbAds(e.target.value)}
                                     disabled={!facebookTokenId || (isFbAdsConnected && !modifyingFbAds)}
                                     className={`w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 outline-none focus:ring-2 focus:ring-[#1877F2] transition-all ${(!facebookTokenId || (isFbAdsConnected && !modifyingFbAds)) ? 'opacity-70 cursor-not-allowed bg-neutral-50' : ''}`}
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
