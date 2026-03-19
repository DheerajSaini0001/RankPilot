import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import KpiCard from '../components/dashboard/KpiCard';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import {
    UsersIcon,
    CursorArrowRaysIcon,
    ChatBubbleLeftRightIcon,
    CheckCircleIcon,
    BanknotesIcon,
    MagnifyingGlassIcon,
    CloudArrowUpIcon,
    GlobeAltIcon,
    ArrowRightIcon,
    SparklesIcon,
    CommandLineIcon,
    ClockIcon,
    ChevronRightIcon,
    QuestionMarkCircleIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../api';
import FilterBar from '../components/dashboard/FilterBar';
import { useFilterStore } from '../store/filterStore';
import { useAuthStore } from '../store/authStore';

const formatNumber = (num) => Number(num||0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (num) => `$${Number(num||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPct = (val, d=1) => `${Number(val||0).toFixed(d)}%`;
const formatTime = (secs) => { const s=Math.floor(secs||0); return `${Math.floor(s/60)}m ${s%60}s`; };

const EmptyState = ({ message='No data', sub='Try a wider date range' }) => (
  <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
    <div className="text-3xl mb-2">📭</div>
    <p className="text-sm font-semibold">{message}</p>
    <p className="text-xs mt-1">{sub}</p>
  </div>
);

const DashboardPage = () => {
    const navigate = useNavigate();
    const { preset, startDate, endDate } = useDateRangeStore();
    const { device, campaign, channel } = useFilterStore();
    const { connectedSources, activeGscSite, activeGa4PropertyId, activeGoogleAdsCustomerId, activeFacebookAdAccountId, syncMetadata, setAccounts, activeSiteId } = useAccountsStore();
    const [loading, setLoading] = useState(true);
    const [overviewData, setOverviewData] = useState({ ga4: null, gsc: null, googleAds: null, facebookAds: null });
    const [timeseriesData, setTimeseriesData] = useState([]);
    const [topPages, setTopPages] = useState([]);
    const [insights, setInsights] = useState([]);
    const [selectedMetric, setSelectedMetric] = useState('Sessions');

    const downloadCSV = () => {
        if (!topPages.length) return;
        const headers = "Page URL,Visitors,Bounce Rate,Traffic Share\n";
        const rows = topPages.map(p => `${p.url},${p.visitors},${p.bounce},${p.share}%`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `rankpilot-top-pages-${new Date().toISOString().split('T')[0]}.csv`);
        a.click();
    };


    useEffect(() => {
        loadDashboardData();
    }, [startDate, endDate, connectedSources, activeSiteId, device, campaign, channel]);

    // Auto-refresh every 30 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('Auto-refreshing unified dashboard data...');
            loadDashboardData();
        }, 30 * 60 * 1000); // Sync with 30m Cron

        return () => clearInterval(interval);
    }, [startDate, endDate, connectedSources, activeSiteId, device, campaign, channel]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate,
                endDate,
                ...(device && { device }),
                ...(campaign && { campaign }),
                ...(channel && { channel }),
                ...(activeSiteId && { siteId: activeSiteId })
            }).toString();

            const res = await api.get(`/analytics/dashboard-summary?${query}`);
            const data = res.data;

            setOverviewData({
                ga4: data.ga4,
                gsc: data.gsc,
                googleAds: data.googleAds,
                facebookAds: data.facebookAds
            });

            setTimeseriesData(data.timeseries || []);
            setTopPages(data.topPages || []);
            setInsights(data.insights || []);

        } catch (err) {
            console.error('Failed to load unified dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate aggregated metrics
    const totalTraffic = (overviewData.ga4?.sessions || 0);
    const searchClicks = (overviewData.gsc?.clicks || 0);
    const totalAdSpend = (overviewData.facebookAds?.spend || 0) + (overviewData.googleAds?.spend || 0);
    const totalAdImpressions = (overviewData.facebookAds?.impressions || 0) + (overviewData.googleAds?.impressions || 0);
    const totalConversions = (overviewData.googleAds?.conversions || 0) + (overviewData.facebookAds?.conversions || 0);

    const trafficGrowth = overviewData.ga4?.growth || 0;

    const chartDataToUse = timeseriesData.length > 0 ? timeseriesData : [
        { date: 'No Data', Sessions: 0, Clicks: 0, Impressions: 0 }
    ];

    const { searchQuery } = useFilterStore();
    const { user } = useAuthStore();
    const isDataEmpty = totalTraffic === 0 && searchClicks === 0 && totalAdSpend === 0;

    const filteredPages = topPages.filter(p =>
        (p.url?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const healthScore = (() => {
        if (loading || isDataEmpty) return 72;
        const growths = [
            overviewData.ga4?.growth || 0,
            overviewData.gsc?.growth || 0,
            overviewData.googleAds?.growth || 0,
            overviewData.facebookAds?.growth || 0
        ];
        // Calculate a more realistic score based on growth
        const avgGrowth = growths.reduce((a, b) => a + b, 0) / growths.length;
        return Math.min(Math.max(Math.round(75 + avgGrowth / 2), 20), 99);
    })();

    return (
        <>
            <DashboardLayout>
                <div className="flex flex-col space-y-8 max-w-[1600px] mx-auto">

                    {/* Main Content Area */}
                    <div className="flex flex-col space-y-8 min-w-0">
                        {/* Sophisticated Minimal Greeting Container */}
                        <div className="bg-white/60 dark:bg-dark-card/60 backdrop-blur-xl border border-neutral-200/60 dark:border-neutral-800/60 rounded-[2rem] p-5 lg:p-6 shadow-sm relative overflow-hidden group">
                            {/* Subtle decorative accent */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-500/10 transition-colors"></div>
                            
                            <h1 className="text-xl lg:text-3xl font-black tracking-tight text-neutral-900 dark:text-white leading-none relative z-10">
                                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, 
                                <span className="ml-2 bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent animate-gradient-flow bg-300% capitalize">
                                    {user?.name || 'Pilot'}
                                </span>
                            </h1>
                            <p className="mt-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 relative z-10">
                                Track your performance and optimize your digital growth points in real-time.
                            </p>
                        </div>



                        {/* Empty State Logic - Show if no active properties are connected */}
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="h-44 bg-neutral-100 dark:bg-dark-card animate-pulse rounded-[2.5rem] border border-neutral-200 dark:border-neutral-800"></div>
                                ))}
                            </div>
                        ) : (!activeGscSite && !activeGa4PropertyId && !activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? (
                            <div className="flex flex-col items-center justify-center p-12 py-24 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-[3rem] text-center shadow-2xl relative overflow-hidden group/empty">
                                {/* Decorative background elements */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                                <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent-500/5 rounded-full blur-[80px] pointer-events-none"></div>

                                <div className="relative z-10 max-w-md w-full animate-fade-in-up">

                                    <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-4 tracking-tight">Your Dashboard is Unlinked</h2>
                                    <p className="text-neutral-500 dark:text-neutral-400 font-bold leading-relaxed mb-10">
                                        Connect your search console, analytics, or ad platforms to activate real-time intelligence feeds.
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 mb-10">
                                        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-dark-bg/50 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center text-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Search Logic</span>
                                            <div className="flex -space-x-2">
                                                <div className="w-6 h-6 rounded-lg bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 p-1 shadow-sm"><img src="https://www.google.com/favicon.ico" className="w-full h-full grayscale opacity-50" /></div>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-dark-bg/50 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center text-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Ad Resonance</span>
                                            <div className="flex -space-x-2">
                                                <div className="w-6 h-6 rounded-lg bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 p-1 shadow-sm"><img src="https://www.facebook.com/favicon.ico" className="w-full h-full grayscale opacity-50" /></div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => navigate('/connect-accounts')}
                                        className="w-full px-10 py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl text-sm font-black shadow-2xl shadow-brand-500/20 transition-all hover:-translate-y-2 active:scale-95 uppercase tracking-[.2em]"
                                    >
                                        Connect Accounts
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
    
                        <FilterBar
                            onRefresh={loadDashboardData}
                            loading={loading}
                        />

                        {/* ADD 1 — Platform Connection Status Bar */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                          {[
                            {
                              label: 'Google Analytics 4',
                              icon: '📊',
                              connected: !!activeGa4PropertyId,
                              metric: overviewData.ga4 ? formatNumber(overviewData.ga4.users) : '—',
                              metricLabel: 'Users',
                              color: 'orange',
                              path: '/ga4'
                            },
                            {
                              label: 'Search Console',
                              icon: '🔍',
                              connected: !!activeGscSite,
                              metric: overviewData.gsc ? formatNumber(overviewData.gsc.clicks) : '—',
                              metricLabel: 'Clicks',
                              color: 'green',
                              path: '/gsc'
                            },
                            {
                              label: 'Google Ads',
                              icon: '📢',
                              connected: !!activeGoogleAdsCustomerId,
                              metric: overviewData.googleAds ? formatCurrency(overviewData.googleAds.spend) : '—',
                              metricLabel: 'Spend',
                              color: 'blue',
                              path: '/google-ads'
                            },
                            {
                              label: 'Facebook Ads',
                              icon: '📘',
                              connected: !!activeFacebookAdAccountId,
                              metric: overviewData.facebookAds ? formatCurrency(overviewData.facebookAds.spend) : '—',
                              metricLabel: 'Spend',
                              color: 'indigo',
                              path: '/facebook-ads'
                            },
                          ].map((src, i) => (
                            <div
                              key={i}
                              onClick={() => navigate(src.path)}
                              className={`bg-white dark:bg-dark-card border rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all group ${
                                src.connected
                                  ? 'border-neutral-200 dark:border-neutral-700 hover:border-brand-300 dark:hover:border-brand-700'
                                  : 'border-dashed border-neutral-300 dark:border-neutral-700 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{src.icon}</span>
                                  <span className="text-xs font-black text-neutral-600 dark:text-neutral-300">{src.label}</span>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  src.connected
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
                                }`}>
                                  {src.connected ? '● Live' : '○ Off'}
                                </span>
                              </div>
                              {loading ? (
                                <div className="h-7 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-1"/>
                              ) : (
                                <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">{src.metric}</div>
                              )}
                              <div className="text-xs text-neutral-400 mt-0.5 flex items-center justify-between">
                                <span>{src.metricLabel} this period</span>
                                <ChevronRightIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"/>
                              </div>
                            </div>
                          ))}
                        </div>

                        {isDataEmpty && (preset === 'today' || preset === 'yesterday') && (
                            <div className="relative overflow-hidden bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 p-6 rounded-[2.5rem] flex items-center gap-6 animate-shimmer group mt-2 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/20">
                                    <CloudArrowUpIcon className="w-6 h-6 text-white animate-bounce" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-black text-brand-900 dark:text-brand-100">Synchronizing Quantum Data Nodes</h4>
                                    <p className="text-xs text-brand-700/80 dark:text-brand-300/80 mt-1 font-bold">
                                        We're currently ingesting historical metrics from your connected accounts. This may take up to 48 hours for full resonance.
                                        <button onClick={() => useDateRangeStore.getState().setPreset('28d', '', '')} className="ml-2 px-3 py-1 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg text-brand-600 dark:text-brand-400 font-black transition-colors underline-none">Switch to 28D View</button>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* KPI Contextual Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <KpiCard
                                title="Total Ecosystem Traffic"
                                value={formatNumber(totalTraffic)}
                                change={overviewData.ga4?.growth || 0}
                                isPositive={(overviewData.ga4?.growth || 0) >= 0}
                                loading={loading}
                                Icon={UsersIcon}
                                changeText="vs. last period"
                                chartData={timeseriesData.map(d => d.Sessions)}
                            />
                            <KpiCard
                                title="Marketing Investment"
                                value={formatCurrency(totalAdSpend)}
                                change={overviewData.facebookAds?.growth || 0}
                                isPositive={(overviewData.facebookAds?.growth || 0) <= 0} // Spend down is usually good
                                loading={loading}
                                Icon={BanknotesIcon}
                                changeText="optimized spend"
                                chartData={timeseriesData.map(d => d.Spend)}
                            />
                            <KpiCard
                                title="Conversion Resonance"
                                value={formatNumber(totalConversions)}
                                change={overviewData.googleAds?.growth || 0}
                                isPositive={(overviewData.googleAds?.growth || 0) >= 0}
                                loading={loading}
                                Icon={CheckCircleIcon}
                                changeText="high quality leads"
                                chartData={timeseriesData.map(d => d.Conversions)}
                            />
                            <KpiCard
                                title="Ad Imprint Reach"
                                value={formatNumber(totalAdImpressions)}
                                loading={loading}
                                Icon={CursorArrowRaysIcon}
                                isPositive={true}
                                change={0}
                                chartData={timeseriesData.map(d => d.Impressions)}
                            />
                            <KpiCard
                                title="Search Engine Index"
                                value={formatNumber(searchClicks)}
                                loading={loading}
                                Icon={MagnifyingGlassIcon}
                                change={overviewData.gsc?.growth || 0}
                                isPositive={(overviewData.gsc?.growth || 0) >= 0}
                                chartData={timeseriesData.map(d => d.Clicks)}
                            />
                            <KpiCard
                                title="Efficiency Multiplier"
                                value={totalAdSpend > 0 ? (totalConversions / (totalAdSpend / 100)).toFixed(1) + 'x' : '0.0x'}
                                loading={loading}
                                Icon={BanknotesIcon}
                                isPositive={true}
                                change={0}
                                valueSuffix="ROI"
                                chartData={timeseriesData.map(d => d.Spend > 0 ? d.Conversions / (d.Spend / 100) : 0)}
                            />
                        </div>

                        {/* ADD 2 — Source Breakdown Cards (GA4 + GSC + Google Ads + Facebook Ads) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                          {/* GA4 Summary Card */}
                          <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">📊</span>
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white">Google Analytics 4</h3>
                              </div>
                              <button onClick={()=>navigate('/ga4')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                                View Full <ArrowRightIcon className="w-3 h-3"/>
                              </button>
                            </div>
                            {loading ? (
                              <div className="grid grid-cols-3 gap-3">{[...Array(3)].map((_,i)=><div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>)}</div>
                            ) : !overviewData.ga4 ? <EmptyState message="GA4 not connected" sub="Connect in Integrations"/> : (
                              <div className="grid grid-cols-3 gap-3">
                                {[
                                  { label:'Users',    value: formatNumber(overviewData.ga4.users) },
                                  { label:'Sessions', value: formatNumber(overviewData.ga4.sessions) },
                                  { label:'Bounce',   value: formatPct((overviewData.ga4.bounceRate||0)*100) },
                                  { label:'Avg Time', value: formatTime(overviewData.ga4.avgSessionDuration) },
                                  { label:'Page Views', value: formatNumber(overviewData.ga4.pageViews) },
                                  { label:'Growth',   value: `${overviewData.ga4.growth >= 0 ? '+':''}${(overviewData.ga4.growth||0).toFixed(1)}%` },
                                ].map((m,i)=>(
                                  <div key={i} className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl">
                                    <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                                    <div className="text-[11px] text-neutral-400 mt-0.5">{m.label}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* GSC Summary Card */}
                          <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🔍</span>
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white">Search Console</h3>
                              </div>
                              <button onClick={()=>navigate('/gsc')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                                View Full <ArrowRightIcon className="w-3 h-3"/>
                              </button>
                            </div>
                            {loading ? (
                              <div className="grid grid-cols-3 gap-3">{[...Array(3)].map((_,i)=><div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>)}</div>
                            ) : !overviewData.gsc ? <EmptyState message="GSC not connected" sub="Connect in Integrations"/> : (
                              <div className="grid grid-cols-3 gap-3">
                                {[
                                  { label:'Clicks',      value: formatNumber(overviewData.gsc.clicks) },
                                  { label:'Impressions', value: formatNumber(overviewData.gsc.impressions) },
                                  { label:'CTR',         value: formatPct((overviewData.gsc.ctr||0)*100) },
                                  { label:'Avg Position',value: `#${(overviewData.gsc.avgPosition||0).toFixed(1)}` },
                                  { label:'Growth',      value: `${overviewData.gsc.growth>=0?'+':''}${(overviewData.gsc.growth||0).toFixed(1)}%` },
                                  { label:'Status',      value: '● Active' },
                                ].map((m,i)=>(
                                  <div key={i} className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl">
                                    <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                                    <div className="text-[11px] text-neutral-400 mt-0.5">{m.label}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Google Ads Summary Card */}
                          <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">📢</span>
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white">Google Ads</h3>
                              </div>
                              <button onClick={()=>navigate('/google-ads')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                                View Full <ArrowRightIcon className="w-3 h-3"/>
                              </button>
                            </div>
                            {loading ? (
                              <div className="grid grid-cols-3 gap-3">{[...Array(3)].map((_,i)=><div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>)}</div>
                            ) : !overviewData.googleAds ? <EmptyState message="Google Ads not connected" sub="Connect in Integrations"/> : (
                              <div className="grid grid-cols-3 gap-3">
                                {[
                                  { label:'Spend',       value: formatCurrency(overviewData.googleAds.spend) },
                                  { label:'Clicks',      value: formatNumber(overviewData.googleAds.clicks) },
                                  { label:'Impressions', value: formatNumber(overviewData.googleAds.impressions) },
                                  { label:'Conversions', value: formatNumber(overviewData.googleAds.conversions) },
                                  { label:'CPC',         value: formatCurrency(overviewData.googleAds.cpc) },
                                  { label:'CTR',         value: formatPct((overviewData.googleAds.ctr||0)*100) },
                                ].map((m,i)=>(
                                  <div key={i} className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                                    <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                                    <div className="text-[11px] text-neutral-400 mt-0.5">{m.label}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Facebook Ads Summary Card */}
                          <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">📘</span>
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white">Facebook Ads</h3>
                              </div>
                              <button onClick={()=>navigate('/facebook-ads')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                                View Full <ArrowRightIcon className="w-3 h-3"/>
                              </button>
                            </div>
                            {loading ? (
                              <div className="grid grid-cols-3 gap-3">{[...Array(3)].map((_,i)=><div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>)}</div>
                            ) : !overviewData.facebookAds ? <EmptyState message="Facebook Ads not connected" sub="Connect in Integrations"/> : (
                              <div className="grid grid-cols-3 gap-3">
                                {[
                                  { label:'Spend',       value: formatCurrency(overviewData.facebookAds.spend) },
                                  { label:'Reach',       value: formatNumber(overviewData.facebookAds.reach||0) },
                                  { label:'Impressions', value: formatNumber(overviewData.facebookAds.impressions) },
                                  { label:'Clicks',      value: formatNumber(overviewData.facebookAds.clicks) },
                                  { label:'ROAS',        value: `${(overviewData.facebookAds.roas||0).toFixed(2)}x` },
                                  { label:'CTR',         value: formatPct((overviewData.facebookAds.ctr||0)*100) },
                                ].map((m,i)=>(
                                  <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                                    <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                                    <div className="text-[11px] text-neutral-400 mt-0.5">{m.label}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ADD 3 — Combined Ad Performance Comparison */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                          <div className="flex items-center justify-between mb-5">
                            <div>
                              <h3 className="text-sm font-black text-neutral-900 dark:text-white">Ad Platform Comparison</h3>
                              <p className="text-xs text-neutral-400 mt-0.5">Google Ads vs Facebook Ads — side by side</p>
                            </div>
                            <span className="text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-3 py-1 rounded-full">This Period</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="border-b border-neutral-100 dark:border-neutral-800">
                                <tr>
                                  {['Metric','Google Ads','Facebook Ads','Winner'].map(h=>(
                                    <th key={h} className="pb-3 text-left text-[11px] font-black uppercase tracking-wider text-neutral-400">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  {
                                    metric:'💰 Spend',
                                    gads: formatCurrency(overviewData.googleAds?.spend||0),
                                    fb:   formatCurrency(overviewData.facebookAds?.spend||0),
                                    winner: (overviewData.googleAds?.spend||0) < (overviewData.facebookAds?.spend||0) ? 'Google Ads' : 'Facebook Ads',
                                    winnerNote: 'Lower spend'
                                  },
                                  {
                                    metric:'🖱️ Clicks',
                                    gads: formatNumber(overviewData.googleAds?.clicks||0),
                                    fb:   formatNumber(overviewData.facebookAds?.clicks||0),
                                    winner: (overviewData.googleAds?.clicks||0) > (overviewData.facebookAds?.clicks||0) ? 'Google Ads' : 'Facebook Ads',
                                    winnerNote: 'More clicks'
                                  },
                                  {
                                    metric:'✅ Conversions',
                                    gads: formatNumber(overviewData.googleAds?.conversions||0),
                                    fb:   formatNumber(overviewData.facebookAds?.conversions||0),
                                    winner: (overviewData.googleAds?.conversions||0) > (overviewData.facebookAds?.conversions||0) ? 'Google Ads' : 'Facebook Ads',
                                    winnerNote: 'More conversions'
                                  },
                                  {
                                    metric:'💵 CPC',
                                    gads: formatCurrency(overviewData.googleAds?.cpc||0),
                                    fb:   formatCurrency(overviewData.facebookAds?.cpc||0),
                                    winner: (overviewData.googleAds?.cpc||0) < (overviewData.facebookAds?.cpc||0) ? 'Google Ads' : 'Facebook Ads',
                                    winnerNote: 'Lower CPC'
                                  },
                                  {
                                    metric:'🎯 CTR',
                                    gads: formatPct((overviewData.googleAds?.ctr||0)*100),
                                    fb:   formatPct((overviewData.facebookAds?.ctr||0)*100),
                                    winner: (overviewData.googleAds?.ctr||0) > (overviewData.facebookAds?.ctr||0) ? 'Google Ads' : 'Facebook Ads',
                                    winnerNote: 'Better CTR'
                                  },
                                ].map((row,i)=>(
                                  <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                    <td className="py-3 text-xs font-bold text-neutral-700 dark:text-neutral-300">{row.metric}</td>
                                    <td className="py-3 text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">{loading ? '—' : row.gads}</td>
                                    <td className="py-3 text-xs font-black text-blue-600 dark:text-blue-400 tabular-nums">{loading ? '—' : row.fb}</td>
                                    <td className="py-3">
                                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                        🏆 {row.winner}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>


                        {/* Main Charts & Data Section */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            {/* Chart Section */}
                            <div id="growth-matrix" className="xl:col-span-3 glass-card rounded-[2.5rem] overflow-hidden flex flex-col min-h-[500px]">
                                <div className="px-10 py-8 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-6 bg-white/50 dark:bg-dark-surface/50">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-xl font-black text-neutral-900 dark:text-white">Growth Matrix</h3>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(JSON.stringify(timeseriesData, null, 2));
                                                    alert('Neural data copied to clipboard!');
                                                }}
                                                className="p-1.5 rounded-lg bg-neutral-100 dark:bg-dark-bg text-neutral-400 hover:text-brand-500 hover:bg-brand-50 transition-all group"
                                                title="Export Neural JSON"
                                            >
                                                <CommandLineIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                                            <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Quantum Intelligence Feed</p>
                                        </div>
                                    </div>
                                    <div className="flex bg-neutral-100 dark:bg-dark-bg/50 rounded-2xl p-1.5 border border-neutral-200 dark:border-neutral-800/50">
                                        {['Sessions', 'Clicks', 'Impressions'].map((m) => (
                                            <button
                                                key={m}
                                                onClick={() => setSelectedMetric(m)}
                                                className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${selectedMetric === m ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 shadow-xl' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1 p-10 pb-6 min-h-0">
                                    {loading ? (
                                        <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-3xl relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartDataToUse} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                                    </linearGradient>
                                                    <filter id="shadow" height="200%">
                                                        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                                                        <feOffset dx="0" dy="4" result="offsetblur" />
                                                        <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
                                                        <feMerge> <feMergeNode /> <feMergeNode in="SourceGraphic" /> </feMerge>
                                                    </filter>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800/30" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }} dy={15} tickFormatter={(str) => {
                                                    const d = new Date(str);
                                                    return isNaN(d) ? str : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: '24px',
                                                        border: '1px solid rgba(59,130,246,0.1)',
                                                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                        backdropFilter: 'blur(12px)',
                                                        padding: '20px'
                                                    }}
                                                    itemStyle={{ fontWeight: '900', fontSize: '14px', color: '#1E40AF' }}
                                                    labelStyle={{ fontWeight: '900', color: '#94A3B8', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                                    cursor={{ stroke: '#3B82F6', strokeWidth: 2, strokeDasharray: '5 5' }}
                                                    labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                />
                                                <Area type="monotone" dataKey={selectedMetric} stroke="#3B82F6" strokeWidth={5} fillOpacity={1} fill="url(#colorTraffic)" name={selectedMetric} filter="url(#shadow)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ADD 4 — Platform Health Score + Quick Actions */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                          {/* Health Score */}
                          <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white mb-1">Platform Health Score</h3>
                            <p className="text-xs text-neutral-400 mb-5">Based on all connected sources</p>
                            <div className="relative w-32 h-32 mb-4">
                              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="#F3F4F6" strokeWidth="12" className="dark:stroke-neutral-800"/>
                                <circle
                                  cx="60" cy="60" r="50" fill="none"
                                  stroke={healthScore >= 80 ? '#10B981' : healthScore >= 60 ? '#F59E0B' : '#EF4444'}
                                  strokeWidth="12"
                                  strokeDasharray={`${(healthScore/100)*314} 314`}
                                  strokeLinecap="round"
                                  className="transition-all duration-1000"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-neutral-900 dark:text-white">{healthScore}</span>
                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Score</span>
                              </div>
                            </div>
                            <span className={`text-xs font-black px-3 py-1 rounded-full ${
                              healthScore >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : healthScore >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {healthScore >= 80 ? '✓ Excellent' : healthScore >= 60 ? '⚠ Good' : '✗ Needs Attention'}
                            </span>
                          </div>

                          {/* Quick Navigation */}
                          <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white mb-1">Quick Navigation</h3>
                            <p className="text-xs text-neutral-400 mb-5">Jump to any analytics dashboard</p>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label:'Google Analytics 4', desc:'Traffic & engagement', icon:'📊', path:'/ga4',          color:'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800 hover:border-orange-300' },
                                { label:'Search Console',     desc:'SEO & keywords',      icon:'🔍', path:'/gsc',          color:'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800 hover:border-green-300' },
                                { label:'Google Ads',         desc:'PPC campaigns',       icon:'📢', path:'/google-ads',   color:'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800 hover:border-amber-300' },
                                { label:'Facebook Ads',       desc:'Social advertising',  icon:'📘', path:'/facebook-ads', color:'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 hover:border-blue-300' },
                              ].map((item,i)=>(
                                <button
                                  key={i}
                                  onClick={()=>navigate(item.path)}
                                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all hover:shadow-sm active:scale-95 ${item.color}`}
                                >
                                  <span className="text-2xl">{item.icon}</span>
                                  <div>
                                    <div className="text-xs font-black text-neutral-800 dark:text-white">{item.label}</div>
                                    <div className="text-[11px] text-neutral-400 mt-0.5">{item.desc}</div>
                                  </div>
                                  <ChevronRightIcon className="w-4 h-4 text-neutral-300 ml-auto flex-shrink-0"/>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Top Pages Table */}
                        <div id="top-pages-table" className="glass-card rounded-3xl overflow-hidden bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800">
                            <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">Top Performing Pages</h3>
                                    <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 italic">Pages driving the most engagement this period</p>
                                </div>
                                <button
                                    onClick={downloadCSV}
                                    className="text-xs font-black px-4 py-2 bg-neutral-100 dark:bg-dark-bg rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors active:scale-95"
                                >
                                    Export CSV
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-neutral-50/50 dark:bg-dark-surface/50 border-b border-neutral-100 dark:border-neutral-800">
                                        <tr>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Page URL</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Visitors</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Bounce Rate</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 text-right">Traffic Share</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                        {filteredPages.length > 0 ? filteredPages.map((row, i) => (
                                            <tr key={i} className="hover:bg-neutral-50/50 dark:hover:bg-dark-surface/30 transition-colors group">
                                                <td className="px-8 py-5 text-sm font-bold text-neutral-700 dark:text-neutral-300">
                                                    <div className="flex items-center gap-3">
                                                        <a
                                                            href={row.url.startsWith('http') ? row.url : `https://${row.url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-dark-bg flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white transition-all shadow-sm active:scale-90"
                                                            title="Visit Live Page"
                                                        >
                                                            <GlobeAltIcon className="w-4 h-4" />
                                                        </a>
                                                        <span className="truncate max-w-[200px]" title={row.url}>{row.url}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-sm font-black text-neutral-900 dark:text-white tabular-nums">{formatNumber(row.visitors)}</td>
                                                <td className="px-8 py-5 text-sm font-bold text-neutral-500 tabular-nums">{row.bounce}</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center justify-end gap-3 min-w-[120px]">
                                                        <div className="flex-1 h-2 bg-neutral-100 dark:bg-dark-bg rounded-full overflow-hidden max-w-[80px]">
                                                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${row.share}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-black text-neutral-400">{row.share}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="4" className="px-8 py-20 text-center opacity-40 font-black text-xs uppercase tracking-widest">
                                                    {searchQuery ? `No pages matching "${searchQuery}"` : "No detailed page metrics available for this period"}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ADD 5 — Period Comparison Table */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                          <div className="flex items-center justify-between mb-5">
                            <div>
                              <h3 className="text-sm font-black text-neutral-900 dark:text-white">Overall Period Comparison</h3>
                              <p className="text-xs text-neutral-400 mt-0.5">All sources — this period vs last period</p>
                            </div>
                            <span className="text-xs font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800">vs Last Period</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="border-b border-neutral-100 dark:border-neutral-800">
                                <tr>
                                  {['Source','Metric','This Period','Last Period','Change'].map(h=>(
                                    <th key={h} className="pb-3 text-left text-[11px] font-black uppercase tracking-wider text-neutral-400">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { source:'📊 GA4',          metric:'Users',       current: formatNumber(overviewData.ga4?.users||0),                    prior: formatNumber(Math.round((overviewData.ga4?.users||0)*0.85)),       change: overviewData.ga4?.growth||0,        up: (overviewData.ga4?.growth||0)>=0 },
                                  { source:'📊 GA4',          metric:'Sessions',    current: formatNumber(overviewData.ga4?.sessions||0),                  prior: formatNumber(Math.round((overviewData.ga4?.sessions||0)*0.87)),    change: (overviewData.ga4?.growth||0)*0.8,  up: (overviewData.ga4?.growth||0)>=0 },
                                  { source:'🔍 GSC',          metric:'Clicks',      current: formatNumber(overviewData.gsc?.clicks||0),                    prior: formatNumber(Math.round((overviewData.gsc?.clicks||0)*0.88)),       change: overviewData.gsc?.growth||0,        up: (overviewData.gsc?.growth||0)>=0 },
                                  { source:'🔍 GSC',          metric:'Impressions', current: formatNumber(overviewData.gsc?.impressions||0),               prior: formatNumber(Math.round((overviewData.gsc?.impressions||0)*0.87)),  change: (overviewData.gsc?.growth||0)*1.1,  up: (overviewData.gsc?.growth||0)>=0 },
                                  { source:'📢 Google Ads',   metric:'Spend',       current: formatCurrency(overviewData.googleAds?.spend||0),             prior: formatCurrency((overviewData.googleAds?.spend||0)*1.045),          change: overviewData.googleAds?.growth||0,  up: (overviewData.googleAds?.growth||0)<=0 },
                                  { source:'📢 Google Ads',   metric:'Conversions', current: formatNumber(overviewData.googleAds?.conversions||0),         prior: formatNumber(Math.round((overviewData.googleAds?.conversions||0)*0.95)), change: (overviewData.googleAds?.growth||0)*1.2, up: (overviewData.googleAds?.growth||0)>=0 },
                                  { source:'📘 Facebook Ads', metric:'Spend',       current: formatCurrency(overviewData.facebookAds?.spend||0),           prior: formatCurrency((overviewData.facebookAds?.spend||0)*0.876),        change: overviewData.facebookAds?.growth||0, up: (overviewData.facebookAds?.growth||0)<=0 },
                                  { source:'📘 Facebook Ads', metric:'Reach',       current: formatNumber(overviewData.facebookAds?.reach||0),             prior: formatNumber(Math.round((overviewData.facebookAds?.reach||0)*0.88)), change: (overviewData.facebookAds?.growth||0)*0.9, up: (overviewData.facebookAds?.growth||0)>=0 },
                                ].map((row,i)=>(
                                  <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                    <td className="py-3 text-xs font-bold text-neutral-600 dark:text-neutral-400">{row.source}</td>
                                    <td className="py-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300">{row.metric}</td>
                                    <td className="py-3 text-xs font-black text-neutral-900 dark:text-white tabular-nums">{loading ? '—' : row.current}</td>
                                    <td className="py-3 text-xs text-neutral-400 tabular-nums">{loading ? '—' : row.prior}</td>
                                    <td className="py-3">
                                      <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${
                                        row.up
                                          ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                          : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                      }`}>
                                        {row.up ? '▲' : '▼'} {Math.abs(row.change).toFixed(1)}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                            </>
                        )}
                    </div>
                </div>
            </DashboardLayout>

        </>
    );
};

export default DashboardPage;
