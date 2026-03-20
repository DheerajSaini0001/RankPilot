import React, { useState, useEffect, useCallback } from 'react';
import AiSectionChat from '../components/ai/AiSectionChat';
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
import DataTable from '../components/dashboard/DataTable';

const formatNumber = (num) => Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (num) => `$${Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPct = (val, d = 1) => `${Number(val || 0).toFixed(d)}%`;
const formatTime = (secs) => { const s = Math.floor(secs || 0); return `${Math.floor(s / 60)}m ${s % 60}s`; };

const EmptyState = ({ message = 'No data', sub = 'Try a wider date range' }) => (
  <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
    <div className="text-3xl mb-2">📭</div>
    <p className="text-sm font-semibold">{message}</p>
    <p className="text-xs mt-1">{sub}</p>
  </div>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const { startDate, endDate } = useDateRangeStore();
  const { device, campaign, channel, searchQuery } = useFilterStore();
  const {
    connectedSources,
    activeGscSite,
    activeGa4PropertyId,
    activeGoogleAdsCustomerId,
    activeFacebookAdAccountId,
    activeSiteId
  } = useAccountsStore();

  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState({ ga4: null, gsc: null, googleAds: null, facebookAds: null });
  const [timeseriesData, setTimeseriesData] = useState([]);
  const [topPages, setTopPages] = useState([]);
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

  const loadDashboardData = useCallback(async () => {
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
    } catch (err) {
      console.error('Failed to load unified dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, device, campaign, channel, activeSiteId]);

  const handleManualRefresh = async () => {
    if (!activeSiteId) return;
    setLoading(true);
    try {
      await api.post('/analytics/sync', { siteId: activeSiteId });
      await loadDashboardData();
    } catch (err) {
      console.error('Manual sync failed:', err);
      await loadDashboardData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, connectedSources]);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing dashboard data...');
      loadDashboardData();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const { user } = useAuthStore();
  const totalTraffic = (overviewData.ga4?.sessions || 0);
  const searchClicks = (overviewData.gsc?.clicks || 0);
  const totalAdSpend = (overviewData.facebookAds?.spend || 0) + (overviewData.googleAds?.spend || 0);
  const totalAdImpressions = (overviewData.facebookAds?.impressions || 0) + (overviewData.googleAds?.impressions || 0);
  const totalConversions = (overviewData.googleAds?.conversions || 0) + (overviewData.facebookAds?.conversions || 0);

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
    const avgGrowth = growths.reduce((a, b) => a + b, 0) / growths.length;
    return Math.min(Math.max(Math.round(75 + avgGrowth / 2), 20), 99);
  })();

  const pageColumns = [
    {
      header: 'Page URL',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <a
            href={row.url?.startsWith('http') ? row.url : `https://${row.url}`}
            target="_blank" rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-dark-bg flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all shadow-sm active:scale-90 shrink-0"
          >
            <GlobeAltIcon className="w-4 h-4" />
          </a>
          <span className="truncate max-w-[200px]" title={row.url}>{row.url}</span>
        </div>
      )
    },
    { header: 'Visitors', cell: (row) => formatNumber(row.visitors) },
    { header: 'Bounce Rate', accessor: 'bounce' },
    {
      header: 'Traffic Share',
      cell: (row) => (
        <div className="flex items-center justify-end gap-3 min-w-[120px]">
          <div className="flex-1 h-2 bg-neutral-100 dark:bg-dark-bg rounded-full overflow-hidden max-w-[80px]">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${row.share}%` }}></div>
          </div>
          <span className="text-xs font-black text-neutral-400">{row.share}%</span>
        </div>
      )
    },
  ];

  const chartDataToUse = timeseriesData.length > 0 ? timeseriesData : [
    { date: 'Yesterday', Sessions: 0, Clicks: 0, Impressions: 0, Spend: 0, Conversions: 0 },
    { date: 'Today', Sessions: 0, Clicks: 0, Impressions: 0, Spend: 0, Conversions: 0 }
  ];

  const metricColor = {
    Sessions: '#3B82F6',
    Clicks: '#10B981',
    Impressions: '#8B5CF6',
    Spend: '#F59E0B',
    Conversions: '#EF4444',
  }[selectedMetric] || '#3B82F6';

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col space-y-8 min-w-0">
          {/* SECTION 1 — Greeting Card */}
          <div className="bg-white/60 dark:bg-dark-card/60 backdrop-blur-xl border border-neutral-200/60 dark:border-neutral-800/60 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-500/10 transition-colors pointer-events-none"></div>
            <div className="relative z-10">
              <h1 className="text-xl lg:text-3xl font-black tracking-tight text-neutral-900 dark:text-white leading-none">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},
                <span className="ml-2 bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent capitalize">
                  {user?.name || 'Pilot'}
                </span>
              </h1>
              <p className="mt-2 text-xs font-bold text-neutral-500 dark:text-neutral-400">
                Track your performance and optimize your digital growth points in real-time.
              </p>
            </div>

            <div className="relative z-10 shrink-0">
               <AiSectionChat 
                  label="Generate Total Brand Summary"
                  sectionTitle="Total Dashboard Summary"
                  activeSources={['ga4', 'gsc', 'google-ads', 'facebook-ads']}
                  contextPrompt={`Analyze my complete brand dashboard for ${startDate} to ${endDate}. 
- Total Web Traffic (GA4 Sessions): ${formatNumber(totalTraffic || 0)}
- Total Organic Clicks (GSC): ${formatNumber(searchClicks || 0)}
- Total Ad Spend (Meta + Google): ${formatCurrency(totalAdSpend || 0)}
- Total Ad Conversions: ${formatNumber(totalConversions || 0)}
- Overall Health Score: ${healthScore}/100

Give me a 3-part strategic review:
1. Brand Performance Analysis (Organic vs Paid)
2. Most Efficient Channel this week
3. One high-level strategy for the next 7 days for maximum ROI.`}
               />
            </div>
          </div>

          {/* SECTION 2 — Empty/Not-Connected State */}
          {!activeGscSite && !activeGa4PropertyId && !activeGoogleAdsCustomerId && !activeFacebookAdAccountId && !loading ? (
            <div className="flex flex-col items-center justify-center p-12 py-24 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-[3rem] text-center shadow-2xl relative overflow-hidden group/empty">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/5 rounded-full blur-[100px] pointer-events-none"></div>
              <div className="relative z-10 max-w-md w-full animate-fade-in-up">
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-4 tracking-tight">Your Dashboard is Unlinked</h2>
                <p className="text-neutral-500 dark:text-neutral-400 font-bold leading-relaxed mb-10">
                  Connect your search console, analytics, or ad platforms to activate real-time intelligence feeds.
                </p>
                <button onClick={() => navigate('/connect-accounts')} className="w-full px-10 py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl text-sm font-black shadow-2xl transition-all hover:-translate-y-2 active:scale-95 uppercase tracking-[.2em]">Connect Accounts</button>
              </div>
            </div>
          ) : (
            <>
              {/* SECTION 3 — FilterBar */}
              <FilterBar loading={loading} onRefresh={handleManualRefresh} />

              {/* SECTION 4 — Platform Status Bar (4 cards) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Google Analytics 4', icon: '📊', connected: !!activeGa4PropertyId, metric: overviewData.ga4 ? formatNumber(overviewData.ga4.users) : '—', metricLabel: 'Users', path: '/dashboard/ga4' },
                  { label: 'Search Console', icon: '🔍', connected: !!activeGscSite, metric: overviewData.gsc ? formatNumber(overviewData.gsc.clicks) : '—', metricLabel: 'Clicks', path: '/dashboard/gsc' },
                  { label: 'Google Ads', icon: '📢', connected: !!activeGoogleAdsCustomerId, metric: overviewData.googleAds ? formatCurrency(overviewData.googleAds.spend) : '—', metricLabel: 'Spend', path: '/dashboard/google-ads' },
                  { label: 'Facebook Ads', icon: '📘', connected: !!activeFacebookAdAccountId, metric: overviewData.facebookAds ? formatCurrency(overviewData.facebookAds.spend) : '—', metricLabel: 'Spend', path: '/dashboard/facebook-ads' },
                ].map((src, i) => (
                  <div key={i} onClick={() => navigate(src.path)} className={`bg-white dark:bg-dark-card border rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all group ${src.connected ? 'border-neutral-200 dark:border-neutral-700 hover:border-brand-300 dark:hover:border-brand-700' : 'border-dashed border-neutral-300 dark:border-neutral-700 opacity-60 grayscale blur-[0.5px]'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg transition-all ${!src.connected && 'grayscale'}`}>{src.icon}</span>
                        <span className="text-xs font-black text-neutral-600 dark:text-neutral-300">{src.label}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${src.connected ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-neutral-100/50 text-neutral-400 dark:bg-neutral-800/50'}`}>{src.connected ? '● Live' : '○ Off'}</span>
                    </div>
                    {loading ? (
                      <div className="h-7 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-1" />
                    ) : (
                      <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">{src.metric}</div>
                    )}
                    <div className="text-xs text-neutral-400 mt-0.5 flex items-center justify-between">
                      <span>{src.metricLabel} this period</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>

              {/* SECTION 5 — KPI Cards — rebuild with 6 cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Card 1 — Total Traffic */}
                <KpiCard
                  title="Total Traffic"
                  value={formatNumber(totalTraffic)}
                  change={overviewData.ga4?.growth || 0}
                  isPositive={(overviewData.ga4?.growth || 0) >= 0}
                  loading={loading}
                  Icon={UsersIcon}
                  changeText="vs. last period"
                  chartData={timeseriesData.map(d => d.Sessions)}
                  className={!activeGa4PropertyId ? 'opacity-60 grayscale blur-[0.5px] border-dashed border-neutral-300 dark:border-neutral-700' : ''}
                />

                {/* Card 2 — Search Clicks (GSC) */}
                <KpiCard
                  title="Search Clicks"
                  value={formatNumber(searchClicks)}
                  change={overviewData.gsc?.growth || 0}
                  isPositive={(overviewData.gsc?.growth || 0) >= 0}
                  loading={loading}
                  Icon={MagnifyingGlassIcon}
                  changeText="organic search"
                  chartData={timeseriesData.map(d => d.Clicks)}
                  className={!activeGscSite ? 'opacity-60 grayscale blur-[0.5px] border-dashed border-neutral-300 dark:border-neutral-700' : ''}
                />

                {/* Card 3 — Total Ad Spend */}
                <KpiCard
                  title="Total Ad Spend"
                  value={formatCurrency(totalAdSpend)}
                  change={Math.abs(overviewData.googleAds?.growth || 0)}
                  isPositive={true}
                  loading={loading}
                  Icon={BanknotesIcon}
                  changeText="combined spend"
                  chartData={timeseriesData.map(d => d.Spend || 0)}
                  className={(!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? 'opacity-60 grayscale blur-[0.5px] border-dashed border-neutral-300 dark:border-neutral-700' : ''}
                />

                {/* Card 4 — Total Conversions */}
                <KpiCard
                  title="Conversions"
                  value={formatNumber(totalConversions)}
                  change={overviewData.googleAds?.growth || 0}
                  isPositive={(overviewData.googleAds?.growth || 0) >= 0}
                  loading={loading}
                  Icon={CheckCircleIcon}
                  changeText="all platforms"
                  chartData={timeseriesData.map(d => d.Conversions || 0)}
                  className={(!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? 'opacity-60 grayscale blur-[0.5px] border-dashed border-neutral-300 dark:border-neutral-700' : ''}
                />

                {/* Card 5 — Total Impressions */}
                <KpiCard
                  title="Ad Impressions"
                  value={formatNumber(totalAdImpressions)}
                  change={overviewData.facebookAds?.growth || 0}
                  isPositive={(overviewData.facebookAds?.growth || 0) >= 0}
                  loading={loading}
                  Icon={CursorArrowRaysIcon}
                  changeText="paid reach"
                  chartData={timeseriesData.map(d => d.Impressions || 0)}
                  className={(!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? 'opacity-60 grayscale blur-[0.5px] border-dashed border-neutral-300 dark:border-neutral-700' : ''}
                />

                {/* Card 6 — Efficiency (ROAS estimate) */}
                <KpiCard
                  title="Efficiency Score"
                  value={totalAdSpend > 0 ? `${(totalConversions / (totalAdSpend / 100)).toFixed(1)}x` : '0.0x'}
                  change={4.2}
                  isPositive={true}
                  loading={loading}
                  Icon={SparklesIcon}
                  changeText="conversions per $100"
                  chartData={timeseriesData.map(d => d.Spend > 0 ? (d.Conversions || 0) / ((d.Spend || 1) / 100) : 0)}
                  className={(!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? 'opacity-60 grayscale blur-[0.5px] border-dashed border-neutral-300 dark:border-neutral-700' : ''}
                />
              </div>

              {/* SECTION 6 — Source Breakdown Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* GA4 Summary Card */}
                <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm transition-all ${!activeGa4PropertyId ? 'opacity-50 grayscale blur-[0.5px] border-dashed' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📊</span>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Google Analytics 4</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeGa4PropertyId && <AiSectionChat sectionTitle="Overview - GA4 Summary" contextPrompt={`Quick GA4 summary: ${formatNumber(overviewData.ga4?.users)} users, ${formatNumber(overviewData.ga4?.sessions)} sessions, bounce rate ${formatPct((overviewData.ga4?.bounceRate||0)*100)}, avg session ${formatTime(overviewData.ga4?.avgSessionDuration)}. What are the key insights and opportunities?`} activeSources={['ga4']} />}
                      <button onClick={() => navigate('/dashboard/ga4')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">View Full <ArrowRightIcon className="w-3 h-3" /></button>
                    </div>
                  </div>
                  {loading ? (
                    <div className="grid grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />)}</div>
                  ) : !activeGa4PropertyId ? <EmptyState message="GA4 not connected" sub="Connect in Integrations" /> : (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Users', value: formatNumber(overviewData.ga4?.users) },
                        { label: 'Sessions', value: formatNumber(overviewData.ga4?.sessions) },
                        { label: 'Bounce', value: formatPct((overviewData.ga4?.bounceRate || 0) * 100) },
                        { label: 'Avg Time', value: formatTime(overviewData.ga4?.avgSessionDuration) },
                        { label: 'Page Views', value: formatNumber(overviewData.ga4?.pageViews) },
                        { label: 'Growth', value: `${(overviewData.ga4?.growth || 0) >= 0 ? '+' : ''}${(overviewData.ga4?.growth || 0).toFixed(1)}%` },
                      ].map((m, i) => (
                        <div key={i} className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl transition-all hover:scale-[1.02]">
                          <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 font-bold uppercase tracking-tight">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* GSC Summary Card */}
                <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm transition-all ${!activeGscSite ? 'opacity-50 grayscale blur-[0.5px] border-dashed' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔍</span>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Search Console</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeGscSite && <AiSectionChat sectionTitle="Overview - GSC Summary" contextPrompt={`Quick GSC summary: ${formatNumber(overviewData.gsc?.clicks)} clicks, ${formatNumber(overviewData.gsc?.impressions)} impressions, ${formatPct((overviewData.gsc?.ctr||0)*100)} CTR, avg position #${(overviewData.gsc?.avgPosition||0).toFixed(1)}. Any quick wins I should focus on?`} activeSources={['gsc']} />}
                      <button onClick={() => navigate('/dashboard/gsc')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">View Full <ArrowRightIcon className="w-3 h-3" /></button>
                    </div>
                  </div>
                  {loading ? (
                    <div className="grid grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />)}</div>
                  ) : !activeGscSite ? <EmptyState message="GSC not connected" sub="Connect in Integrations" /> : (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Clicks', value: formatNumber(overviewData.gsc?.clicks) },
                        { label: 'Impressions', value: formatNumber(overviewData.gsc?.impressions) },
                        { label: 'CTR', value: formatPct((overviewData.gsc?.ctr || 0) * 100) },
                        { label: 'Avg Pos', value: `#${(overviewData.gsc?.avgPosition || 0).toFixed(1)}` },
                        { label: 'Growth', value: `${(overviewData.gsc?.growth || 0) >= 0 ? '+' : ''}${(overviewData.gsc?.growth || 0).toFixed(1)}%` },
                        { label: 'Status', value: 'Live' },
                      ].map((m, i) => (
                        <div key={i} className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl transition-all hover:scale-[1.02]">
                          <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 font-bold uppercase tracking-tight">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Google Ads Card */}
                <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm transition-all ${!activeGoogleAdsCustomerId ? 'opacity-50 grayscale blur-[0.5px] border-dashed' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📢</span>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Google Ads</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeGoogleAdsCustomerId && <AiSectionChat sectionTitle="Overview - Google Ads Summary" contextPrompt={`Quick Google Ads summary: Spend ${formatCurrency(overviewData.googleAds?.spend)}, ${formatNumber(overviewData.googleAds?.clicks)} clicks, ${formatNumber(overviewData.googleAds?.conversions)} conversions, CPC ${formatCurrency(overviewData.googleAds?.cpc)}. Is this performance good and what should I optimize?`} activeSources={['google-ads']} />}
                      <button onClick={() => navigate('/dashboard/google-ads')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">View Full <ArrowRightIcon className="w-3 h-3" /></button>
                    </div>
                  </div>
                  {loading ? (
                    <div className="grid grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />)}</div>
                  ) : !activeGoogleAdsCustomerId ? <EmptyState message="Google Ads not connected" /> : (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Spend', value: formatCurrency(overviewData.googleAds?.spend) },
                        { label: 'Clicks', value: formatNumber(overviewData.googleAds?.clicks) },
                        { label: 'Impressions', value: formatNumber(overviewData.googleAds?.impressions) },
                        { label: 'Conversions', value: formatNumber(overviewData.googleAds?.conversions) },
                        { label: 'CPC', value: formatCurrency(overviewData.googleAds?.cpc) },
                        { label: 'CTR', value: formatPct((overviewData.googleAds?.ctr || 0) * 100) },
                      ].map((m, i) => (
                        <div key={i} className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                          <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 uppercase tracking-tight font-bold">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Facebook Ads Card */}
                <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm transition-all ${!activeFacebookAdAccountId ? 'opacity-50 grayscale blur-[0.5px] border-dashed' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📘</span>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Facebook Ads</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeFacebookAdAccountId && <AiSectionChat sectionTitle="Overview - Facebook Ads Summary" contextPrompt={`Quick Facebook Ads summary: Spend ${formatCurrency(overviewData.facebookAds?.spend)}, Reach ${formatNumber(overviewData.facebookAds?.reach||0)}, ${formatNumber(overviewData.facebookAds?.impressions)} impressions, ROAS ${(overviewData.facebookAds?.roas||0).toFixed(2)}x. What's my campaign efficiency and what should I improve?`} activeSources={['facebook-ads']} />}
                      <button onClick={() => navigate('/dashboard/facebook-ads')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">View Full <ArrowRightIcon className="w-3 h-3" /></button>
                    </div>
                  </div>
                  {loading ? (
                    <div className="grid grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />)}</div>
                  ) : !activeFacebookAdAccountId ? <EmptyState message="Facebook Ads not connected" /> : (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Spend', value: formatCurrency(overviewData.facebookAds?.spend) },
                        { label: 'Reach', value: formatNumber(overviewData.facebookAds?.reach || 0) },
                        { label: 'Impressions', value: formatNumber(overviewData.facebookAds?.impressions) },
                        { label: 'Clicks', value: formatNumber(overviewData.facebookAds?.clicks) },
                        { label: 'ROAS', value: `${(overviewData.facebookAds?.roas || 0).toFixed(2)}x` },
                        { label: 'CTR', value: formatPct((overviewData.facebookAds?.ctr || 0) * 100) },
                      ].map((m, i) => (
                        <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                          <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 uppercase tracking-tight font-bold">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 7 — Ad Platform Comparison Table */}
              <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm transition-all ${(!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? 'opacity-50 grayscale blur-[0.5px] border-dashed' : ''}`}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white">Ad Platform Comparison</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">Google Ads vs Facebook Ads — side by side</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(activeGoogleAdsCustomerId || activeFacebookAdAccountId) && (
                      <AiSectionChat
                          sectionTitle="Overview - Ad Platform Comparison"
                          contextPrompt={`Comparing my ad platforms: Google Ads spent ${formatCurrency(overviewData.googleAds?.spend||0)} getting ${formatNumber(overviewData.googleAds?.conversions||0)} conversions. Facebook Ads spent ${formatCurrency(overviewData.facebookAds?.spend||0)} getting ${formatNumber(overviewData.facebookAds?.conversions||0)} conversions and ${formatNumber(overviewData.facebookAds?.reach||0)} reach. Which platform is more efficient for me and how should I reallocate budget?`}
                          activeSources={['google-ads', 'facebook-ads']}
                      />
                    )}
                    <span className="text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-3 py-1 rounded-full">This Period</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-neutral-100 dark:border-neutral-800">
                      <tr>
                        {['Metric', 'Google Ads', 'Facebook Ads', 'Winner'].map(h => (
                          <th key={h} className="pb-3 text-left text-[11px] font-black uppercase tracking-wider text-neutral-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          metric: '💰 Spend',
                          gads: formatCurrency(overviewData.googleAds?.spend || 0),
                          fb: formatCurrency(overviewData.facebookAds?.spend || 0),
                          winner: (overviewData.googleAds?.spend || 0) < (overviewData.facebookAds?.spend || 0) ? 'Google Ads' : 'Facebook Ads',
                        },
                        {
                          metric: '🖱️ Clicks',
                          gads: formatNumber(overviewData.googleAds?.clicks || 0),
                          fb: formatNumber(overviewData.facebookAds?.clicks || 0),
                          winner: (overviewData.googleAds?.clicks || 0) > (overviewData.facebookAds?.clicks || 0) ? 'Google Ads' : 'Facebook Ads',
                        },
                        {
                          metric: '✅ Conversions',
                          gads: formatNumber(overviewData.googleAds?.conversions || 0),
                          fb: formatNumber(overviewData.facebookAds?.conversions || 0),
                          winner: (overviewData.googleAds?.conversions || 0) > (overviewData.facebookAds?.conversions || 0) ? 'Google Ads' : 'Facebook Ads',
                        },
                        {
                          metric: '💵 CPC',
                          gads: formatCurrency(overviewData.googleAds?.cpc || 0),
                          fb: formatCurrency(overviewData.facebookAds?.cpc || 0),
                          winner: (overviewData.googleAds?.cpc || 0) < (overviewData.facebookAds?.cpc || 0) ? 'Google Ads' : 'Facebook Ads',
                        },
                        {
                          metric: '🎯 CTR',
                          gads: formatPct((overviewData.googleAds?.ctr || 0) * 100),
                          fb: formatPct((overviewData.facebookAds?.ctr || 0) * 100),
                          winner: (overviewData.googleAds?.ctr || 0) > (overviewData.facebookAds?.ctr || 0) ? 'Google Ads' : 'Facebook Ads',
                        },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                          <td className="py-3 text-xs font-bold text-neutral-700 dark:text-neutral-300">{row.metric}</td>
                          <td className="py-3 text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">{loading ? '—' : row.gads}</td>
                          <td className="py-3 text-xs font-black text-blue-600 dark:text-blue-400 tabular-nums">{loading ? '—' : row.fb}</td>
                          <td className="py-3">
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">🏆 {row.winner}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 8 — Growth Matrix Chart — add Spend + Conversions toggle */}
              <div className={`glass-card rounded-[2.5rem] overflow-hidden flex flex-col min-h-[500px] transition-all ${isDataEmpty ? 'opacity-50 grayscale blur-[0.5px] border-dashed' : ''}`}>
                <div className="px-10 py-8 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-6 bg-white/50 dark:bg-dark-surface/50">
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black text-neutral-900 dark:text-white">Growth Matrix</h3>
                      {!isDataEmpty && (
                        <AiSectionChat
                            sectionTitle="Overview - Growth Matrix"
                            contextPrompt={`My overall growth matrix for ${selectedMetric}: latest value ${timeseriesData.length > 0 ? timeseriesData[timeseriesData.length-1]?.[selectedMetric] : 0}. GA4 sessions: ${formatNumber(overviewData.ga4?.sessions)}, GSC clicks: ${formatNumber(overviewData.gsc?.clicks)}, Ad spend: ${formatCurrency((overviewData.googleAds?.spend||0)+(overviewData.facebookAds?.spend||0))}. What's the overall trend and what should I prioritize?`}
                            activeSources={['ga4', 'gsc', 'google-ads', 'facebook-ads']}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                      <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500">Real-time performance distribution</p>
                    </div>
                  </div>
                  <div className="flex bg-neutral-100 dark:bg-dark-bg/50 rounded-2xl p-1.5 border border-neutral-200 dark:border-neutral-800/50">
                    {['Sessions', 'Clicks', 'Impressions', 'Spend', 'Conversions'].map((m) => (
                      <button key={m} onClick={() => setSelectedMetric(m)} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${selectedMetric === m ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 shadow-xl' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>{m}</button>
                    ))}
                  </div>
                </div>
                <div className="h-[400px] w-full px-10 pb-10 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartDataToUse}>
                      <defs>
                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={metricColor} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={metricColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800/30" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(str) => { const d = new Date(str); return isNaN(d) ? str : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey={selectedMetric} stroke={metricColor} strokeWidth={3} fill="url(#colorMetric)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SECTION 9 — Health Score + Quick Navigation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Health Score */}
                <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center transition-all ${isDataEmpty ? 'opacity-50 grayscale blur-[0.5px] border-dashed' : ''}`}>
                  <div className="flex items-center justify-between w-full mb-1">
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white">Platform Health Score</h3>
                    {!isDataEmpty && (
                      <AiSectionChat
                        sectionTitle="Platform Health Score"
                        contextPrompt={`My platform health score is ${healthScore}/100 (${healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Needs Attention'}). Connected platforms: GA4=${!!activeGa4PropertyId}, GSC=${!!activeGscSite}, Google Ads=${!!activeGoogleAdsCustomerId}, Facebook Ads=${!!activeFacebookAdAccountId}. Why is my score ${healthScore}? What specific actions should I take to improve it to 100?`}
                        activeSources={['ga4', 'gsc', 'google-ads', 'facebook-ads']}
                      />
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mb-5">Based on all connected sources</p>
                  <div className="relative w-32 h-32 mb-4">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#F3F4F6" strokeWidth="12" className="dark:stroke-neutral-800" />
                      <circle cx="60" cy="60" r="50" fill="none" stroke={healthScore >= 80 ? '#10B981' : healthScore >= 60 ? '#F59E0B' : '#EF4444'} strokeWidth="12" strokeDasharray={`${(healthScore / 100) * 314} 314`} strokeLinecap="round" className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-neutral-900 dark:text-white">{healthScore}</span>
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Score</span>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${healthScore >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : healthScore >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {healthScore >= 80 ? '✓ Excellent' : healthScore >= 60 ? '⚠ Good' : '✗ Needs Attention'}
                  </span>
                </div>
                {/* Quick Navigation */}
                <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white mb-1">Quick Navigation</h3>
                  <p className="text-xs text-neutral-400 mb-5">Jump to any analytics dashboard</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'GA4', desc: 'Traffic & engagement', icon: '📊', path: '/dashboard/ga4', color: 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800 hover:border-orange-300' },
                      { label: 'Search Console', desc: 'SEO & keywords', icon: '🔍', path: '/dashboard/gsc', color: 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800 hover:border-green-300' },
                      { label: 'Google Ads', desc: 'PPC campaigns', icon: '📢', path: '/dashboard/google-ads', color: 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800 hover:border-amber-300' },
                      { label: 'Facebook Ads', desc: 'Social ads', icon: '📘', path: '/dashboard/facebook-ads', color: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 hover:border-blue-300' },
                    ].map((item, i) => (
                      <button key={i} onClick={() => navigate(item.path)} className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all hover:shadow-sm active:scale-95 ${item.color}`}>
                        <span className="text-2xl">{item.icon}</span>
                        <div><div className="text-xs font-black text-neutral-800 dark:text-white">{item.label}</div><div className="text-[11px] text-neutral-400 mt-0.5">{item.desc}</div></div>
                        <ChevronRightIcon className="w-4 h-4 text-neutral-300 ml-auto flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 10 — Top Pages Table */}
              <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm transition-all ${!activeGa4PropertyId ? 'opacity-50 grayscale blur-[0.5px] border-dashed' : ''}`}>
                <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center text-left">
                  <div>
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">Top Performing Pages</h3>
                    <p className="text-xs font-bold text-neutral-400 mt-1 italic">Pages driving the most engagement this period</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeGa4PropertyId && (
                      <AiSectionChat
                        sectionTitle="Overview - Top Performing Pages"
                        contextPrompt={`My top GA4 pages: ${topPages.slice(0,5).map(p => `${p.url} (${p.visitors} visitors, ${p.bounce} bounce)`).join(', ')}. Which pages should I optimize for better engagement? Any low-hanging SEO or UX improvements?`}
                        activeSources={['ga4']}
                      />
                    )}
                    <button onClick={downloadCSV} className="text-xs font-black px-4 py-2 bg-neutral-100 dark:bg-dark-bg rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">Export CSV</button>
                  </div>
                </div>
                <div className="p-4">
                  <DataTable columns={pageColumns} data={filteredPages} loading={loading} initialLimit={5} className="border-none" />
                </div>
              </div>

              {/* SECTION 11 — Period Comparison Table — expand to 8 rows */}
              <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm transition-all ${isDataEmpty ? 'opacity-50 grayscale blur-[0.5px] border-dashed border-neutral-300' : ''}`}>
                <div className="flex items-center justify-between mb-5">
                  <div><h3 className="text-sm font-black text-neutral-900 dark:text-white">Overall Period Comparison</h3><p className="text-xs text-neutral-400 mt-0.5">All sources — this period vs last period</p></div>
                  <div className="flex items-center gap-2">
                    {!isDataEmpty && (
                      <AiSectionChat
                        sectionTitle="Overview - Overall Period Comparison"
                        contextPrompt={`Overall comparison across all platforms: GA4 users ${formatNumber(overviewData.ga4?.users)} (${overviewData.ga4?.growth?.toFixed(1)}% growth), GSC clicks ${formatNumber(overviewData.gsc?.clicks)} (${overviewData.gsc?.growth?.toFixed(1)}% growth), Google Ads spend ${formatCurrency(overviewData.googleAds?.spend)}, Facebook Ads spend ${formatCurrency(overviewData.facebookAds?.spend)}. What are the biggest wins and concerns across all platforms?`}
                        activeSources={['ga4', 'gsc', 'google-ads', 'facebook-ads']}
                      />
                    )}
                    <span className="text-xs font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800">vs Last Period</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-neutral-100 dark:border-neutral-800 text-left">
                      <tr>{['Source', 'Metric', 'This Period', 'Last Period', 'Change'].map(h => (<th key={h} className="pb-3 text-left text-[11px] font-black uppercase tracking-wider text-neutral-400">{h}</th>))}</tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          source: '📊 GA4',
                          metric: 'Users',
                          current: (overviewData.ga4?.users || 0),
                          growth: (overviewData.ga4?.growth || 0)
                        },
                        {
                          source: '📊 GA4',
                          metric: 'Sessions',
                          current: (overviewData.ga4?.sessions || 0),
                          growth: (overviewData.ga4?.growth || 0)
                        },
                        {
                          source: '🔍 GSC',
                          metric: 'Clicks',
                          current: (overviewData.gsc?.clicks || 0),
                          growth: (overviewData.gsc?.growth || 0)
                        },
                        {
                          source: '🔍 GSC',
                          metric: 'Impressions',
                          current: (overviewData.gsc?.impressions || 0),
                          growth: (overviewData.gsc?.growth || 0)
                        },
                        {
                          source: '📢 Google Ads',
                          metric: 'Spend',
                          current: (overviewData.googleAds?.spend || 0),
                          growth: (overviewData.googleAds?.growth || 0),
                          isCurrency: true
                        },
                        {
                          source: '📢 Google Ads',
                          metric: 'Conversions',
                          current: (overviewData.googleAds?.conversions || 0),
                          growth: (overviewData.googleAds?.growth || 0)
                        },
                        {
                          source: '📘 Facebook Ads',
                          metric: 'Spend',
                          current: (overviewData.facebookAds?.spend || 0),
                          growth: (overviewData.facebookAds?.growth || 0),
                          isCurrency: true
                        },
                        {
                          source: '📘 Facebook Ads',
                          metric: 'Reach',
                          current: (overviewData.facebookAds?.reach || 0),
                          growth: (overviewData.facebookAds?.growth || 0)
                        },
                      ].map((row, i) => {
                        const priorValue = row.growth === -100 ? 0 : row.current / (1 + (row.growth / 100));
                        const isUp = row.growth >= 0;

                        return (
                          <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                            <td className="py-3 text-xs font-bold text-neutral-600 dark:text-neutral-400">{row.source}</td>
                            <td className="py-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300">{row.metric}</td>
                            <td className="py-3 text-xs font-black text-neutral-900 dark:text-white tabular-nums">
                              {loading ? '—' : row.isCurrency ? formatCurrency(row.current) : formatNumber(row.current)}
                            </td>
                            <td className="py-3 text-xs text-neutral-400 tabular-nums">
                              {loading ? '—' : row.isCurrency ? formatCurrency(priorValue) : formatNumber(priorValue)}
                            </td>
                            <td className="py-3">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${isUp
                                  ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                }`}>
                                {isUp ? '▲' : '▼'} {Math.abs(row.growth).toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 12 — ADD NEW: Data Sync Info Banner */}
              {isDataEmpty && (
                <div className="relative overflow-hidden bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 p-5 rounded-2xl flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/20">
                    <CloudArrowUpIcon className="w-5 h-5 text-white animate-bounce" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-brand-900 dark:text-brand-100">Data Sync In Progress</h4>
                    <p className="text-xs text-brand-700/80 dark:text-brand-300/80 mt-1 font-bold">
                      We are ingesting data from your connected accounts. This may take up to 48 hours.
                      <button
                        onClick={() => useDateRangeStore.getState().setPreset('28d', '', '')}
                        className="ml-2 text-brand-600 dark:text-brand-400 font-black underline"
                      >
                        Switch to 28D View
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
