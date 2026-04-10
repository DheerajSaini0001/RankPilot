import React, { useState, useEffect, useCallback } from 'react';
import AiSectionChat from '../components/ai/AiSectionChat';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import KpiCard from '../components/dashboard/KpiCard';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import {
  FunnelIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  ComputerDesktopIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../api';
import { getActiveAccounts } from '../api/accountApi';
import { useFilterStore } from '../store/filterStore';
import { useAuthStore } from '../store/authStore';
import DataTable from '../components/dashboard/DataTable';
import { exportToPdf } from '../utils/reportExport';

const formatNumber = (num) => Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (num) => `$${Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPct = (val, d = 1) => `${Number(val || 0).toFixed(d)}%`;
const formatTime = (secs) => { const s = Math.floor(secs || 0); return `${Math.floor(s / 60)}m ${s % 60}s`; };

const EmptyState = ({ message = 'No data', sub = 'Try a wider date range', onAction }) => (
  <div className="flex flex-col items-center justify-center p-4 text-neutral-400 dark:text-neutral-500 h-full w-full">
    <p className="text-[11px] font-black text-neutral-900 dark:text-white uppercase tracking-wider">{message}</p>
    <p className="text-[10px] mt-1 font-bold text-neutral-400 max-w-[220px] text-center leading-tight">{sub}</p>
    {onAction && (
      <button
        onClick={onAction}
        className="mt-4 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[9px] font-black rounded-lg shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5"
      >
        CONNECT ACCOUNT
      </button>
    )}
  </div>
);

const Ga4Logo = ({ className = "w-5 h-5" }) => (
  <img src="https://www.vectorlogo.zone/logos/google_analytics/google_analytics-icon.svg" alt="GA4" className={`${className} object-contain`} />
);

const GscLogo = ({ className = "w-5 h-5" }) => (
  <img src="https://www.gstatic.com/images/branding/product/2x/search_console_64dp.png" alt="GSC" className={`${className} object-contain`} />
);

const GoogleAdsLogo = ({ className = "w-5 h-5" }) => (
  <img src="https://www.vectorlogo.zone/logos/google_ads/google_ads-icon.svg" alt="Google Ads" className={`${className} object-contain`} />
);

const FacebookAdsLogo = ({ className = "w-5 h-5" }) => (
  <img src="https://www.vectorlogo.zone/logos/facebook/facebook-icon.svg" alt="Meta Ads" className={`${className} object-contain`} />
);

const SuccessLogo = ({ className = "w-5 h-5" }) => (
  <div className={`${className} rounded-lg bg-emerald-500 flex items-center justify-center p-1 shadow-inner`}>
    <CheckCircleIcon className="w-full h-full text-white" />
  </div>
);

const PerformanceLogo = ({ className = "w-5 h-5" }) => (
  <div className={`${className} rounded-lg bg-indigo-600 flex items-center justify-center p-1 shadow-inner`}>
    <SparklesIcon className="w-full h-full text-white" />
  </div>
);

const RankPilotLogo = ({ className = "w-5 h-5" }) => (
  <img src="/favicon.png" alt="RankPilot" className={`${className} object-contain rounded-lg`} />
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const { preset, startDate, endDate, setPreset } = useDateRangeStore();
  const { device, campaign, channel, searchQuery, setFilters } = useFilterStore();
  const {
    connectedSources,
    activeGscSite,
    activeGa4PropertyId,
    activeGoogleAdsCustomerId,
    activeFacebookAdAccountId,
    activeSiteId,
    syncMetadata,
    userSites,
    setAccounts,
    setUserSites
  } = useAccountsStore();

  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState({ ga4: null, gsc: null, googleAds: null, facebookAds: null, intelligence: null });
  const [timeseriesData, setTimeseriesData] = useState([]);
  const [topPages, setTopPages] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('Sessions');
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isCustomDateMode, setIsCustomDateMode] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ start: startDate, end: endDate });

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
      const data = res.data || {};

      setOverviewData({
        userName: data.userName,
        siteName: data.siteName,
        ga4: data.ga4 || { users: 0, sessions: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0, growth: 0 },
        gsc: data.gsc || { clicks: 0, impressions: 0, position: 0, ctr: 0, growth: 0 },
        googleAds: data.googleAds || { spend: 0, conversions: 0, clicks: 0, impressions: 0, cpc: 0, ctr: 0, growth: 0 },
        facebookAds: data.facebookAds || { spend: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0, purchaseValue: 0, roas: 0, growth: 0 },
        intelligence: data.intelligence || { briefing: [], adStrategy: '', contentAudit: '', growthMomentum: '', healthScore: 0 },
        adWinner: data.adWinner,
        syncMetadata: data.syncMetadata
      });

      setTimeseriesData(data.timeseries || []);
      
      const totalSessions = data.ga4?.sessions || 1;
      const pagesWithShare = (data.topPages || []).map(p => ({
        ...p,
        share: totalSessions > 0 ? ((p.visitors / totalSessions) * 100).toFixed(1) : 0
      }));
      setTopPages(pagesWithShare);

      if (data.syncMetadata) {
        setAccounts({
          syncMetadata: {
            syncStatus: data.syncMetadata.syncStatus,
            lastDailySyncAt: data.syncMetadata.lastDailySyncAt
          }
        });
      }
    } catch (err) {
      console.error('Failed to load unified dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, device, campaign, channel, activeSiteId, setAccounts]);

  const handleManualRefresh = async () => {
    if (!activeSiteId) return;
    setLoading(true);
    setAccounts({
      syncMetadata: {
        ...syncMetadata,
        syncStatus: 'syncing'
      }
    });

    try {
      await api.post('/analytics/sync', { siteId: activeSiteId });
      const res = await getActiveAccounts(activeSiteId);
      const resData = res.data || {};
      setAccounts({
        syncMetadata: {
          isHistoricalSyncComplete: resData.isHistoricalSyncComplete || false,
          lastDailySyncAt: resData.lastDailySyncAt || null,
          syncStatus: resData.syncStatus || 'idle'
        }
      });
      await loadDashboardData();
    } catch (err) {
      console.error('Manual sync failed:', err);
      const res = await getActiveAccounts(activeSiteId).catch(() => ({ data: {} }));
      const resData = res.data || {};
      setAccounts({
        syncMetadata: {
          isHistoricalSyncComplete: resData.isHistoricalSyncComplete || false,
          lastDailySyncAt: resData.lastDailySyncAt || null,
          syncStatus: resData.syncStatus || 'error'
        }
      });
      await loadDashboardData();
    } finally {
      setLoading(false);
    }
  };

  const handleDatePresetSelect = (p) => {
    if (p.value === 'custom') {
      setIsCustomDateMode(true);
      return;
    }
    const fmt = (d) => {
      const date = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
      return date.toISOString().split('T')[0];
    };
    let start = new Date();
    let end = new Date();
    if (p.value === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (p.value !== 'today') {
      start.setDate(start.getDate() - p.days);
    }
    setPreset(p.value, fmt(start), fmt(end));
    setIsDateMenuOpen(false);
    setIsCustomDateMode(false);
  };

  const handleApplyCustomDate = () => {
    setPreset('custom', tempDateRange.start, tempDateRange.end);
    setIsDateMenuOpen(false);
    setIsCustomDateMode(false);
  };

  const handleDeviceSelect = (val) => {
    setFilters({ device: val });
    setIsDeviceMenuOpen(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, connectedSources]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  useEffect(() => {
    if (syncMetadata?.syncStatus !== 'syncing' && activeSiteId) {
      loadDashboardData();
    }
  }, [syncMetadata?.syncStatus, activeSiteId, loadDashboardData]);

  const activeSite = userSites?.find?.(s => s._id === activeSiteId);
  const isSyncingHistorical = !!(activeSite && (
    (activeSite.ga4PropertyId && !activeSite.ga4HistoricalComplete) ||
    (activeSite.gscSiteUrl && !activeSite.gscHistoricalComplete) ||
    (activeSite.googleAdsCustomerId && !activeSite.googleAdsHistoricalComplete) ||
    (activeSite.facebookAdAccountId && !activeSite.facebookAdsHistoricalComplete)
  ));

  useEffect(() => {
    let interval;
    if (isSyncingHistorical) {
      interval = setInterval(async () => {
        try {
          const res = await api.get('/accounts/sites');
          if (res.data && Array.isArray(res.data)) setUserSites(res.data);
        } catch (e) { console.error("Polling error", e); }
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [isSyncingHistorical, setUserSites]);

  const { user } = useAuthStore();
  const totalTraffic = (overviewData.ga4?.sessions || 0);
  const searchClicks = (overviewData.gsc?.clicks || 0);
  const totalAdSpend = (overviewData.facebookAds?.spend || 0) + (overviewData.googleAds?.spend || 0);
  const totalAdImpressions = (overviewData.facebookAds?.impressions || 0) + (overviewData.googleAds?.impressions || 0);
  const totalConversions = (overviewData.googleAds?.conversions || 0) + (overviewData.facebookAds?.conversions || 0);

  const filteredPages = topPages.filter(p =>
    (p.url?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const healthScore = overviewData.intelligence?.healthScore || 72;

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
          <span className="truncate max-w-[200px] text-neutral-900 dark:text-white font-bold" title={row.url}>{row.url}</span>
        </div>
      )
    },
    { header: 'Visitors', cell: (row) => <span className="font-black tabular-nums">{formatNumber(row.visitors)}</span> },
    { header: 'Page Views', cell: (row) => <span className="font-bold text-neutral-500 dark:text-neutral-400 tabular-nums">{formatNumber(row.views)}</span> },
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

  const chartDataToUse = timeseriesData;

  const metricColor = {
    Sessions: '#3B82F6',
    Clicks: '#10B981',
    Impressions: '#8B5CF6',
    Spend: '#F59E0B',
    Conversions: '#EF4444',
  }[selectedMetric] || '#3B82F6';

  const getOverallProgress = () => {
    if (!activeSite) return 0;
    const items = [];
    if (activeSite.ga4PropertyId) items.push(activeSite.ga4SyncProgress || 0);
    if (activeSite.gscSiteUrl) items.push(activeSite.gscSyncProgress || 0);
    if (activeSite.googleAdsCustomerId) items.push(activeSite.googleAdsSyncProgress || 0);
    if (activeSite.facebookAdAccountId) items.push(activeSite.facebookAdsSyncProgress || 0);
    if (items.length === 0) return 0;
    return Math.round(items.reduce((a, b) => a + b, 0) / items.length);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-8 max-w-[1600px] mx-auto">
        {isSyncingHistorical && (
          <div className="bg-brand-600/10 border border-brand-200 dark:border-brand-900/30 rounded-3xl p-4 flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-top duration-500">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shrink-0 shadow-lg shadow-brand-600/20">
              <CloudArrowUpIcon className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-sm font-black text-brand-900 dark:text-brand-100">Optimizing Historical Data Sync</h3>
              <p className="text-xs font-bold text-brand-700/70 dark:text-brand-400 mt-1">
                We're fetching {activeSite.siteName}'s 24-month marketing history into RankPilot's high-speed memory.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
              <div className="text-sm font-black text-brand-600 dark:text-brand-400 flex items-center gap-2">
                <span className="tabular-nums font-black">{getOverallProgress()}%</span>
                <div className="w-24 h-2 bg-brand-200 dark:bg-brand-900/50 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-600 rounded-full transition-all duration-500" style={{ width: `${getOverallProgress()}%` }}></div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {activeSite.ga4PropertyId && <span className={`w-2 h-2 rounded-full ${activeSite.ga4HistoricalComplete ? 'bg-semantic-green' : 'bg-brand-400 animate-pulse'}`} title="GA4" />}
                {activeSite.gscSiteUrl && <span className={`w-2 h-2 rounded-full ${activeSite.gscHistoricalComplete ? 'bg-semantic-green' : 'bg-brand-400 animate-pulse'}`} title="GSC" />}
                {activeSite.googleAdsCustomerId && <span className={`w-2 h-2 rounded-full ${activeSite.googleAdsHistoricalComplete ? 'bg-semantic-green' : 'bg-brand-400 animate-pulse'}`} title="Google Ads" />}
                {activeSite.facebookAdAccountId && <span className={`w-2 h-2 rounded-full ${activeSite.facebookAdsHistoricalComplete ? 'bg-semantic-green' : 'bg-brand-400 animate-pulse'}`} title="Meta Ads" />}
              </div>
            </div>
          </div>
        )}

        <div id="dashboard-report" className="flex flex-col space-y-8 min-w-0">
          <div className={`bg-white/60 dark:bg-dark-card/60 backdrop-blur-xl border border-neutral-200/60 dark:border-neutral-800/60 rounded-[2.5rem] shadow-sm relative group flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-1000 ${(isDateMenuOpen || isDeviceMenuOpen) ? 'z-40' : 'z-10'}`}>
            <div className="absolute inset-x-0 top-0 h-32 rounded-t-[2.5rem] overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-brand-500/10 transition-colors"></div>
            </div>

            <div className="p-4 md:py-5 md:px-8 relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex-1 space-y-4">
                  <div className="space-y-0.5">
                    <h1 className="text-xl lg:text-4xl font-black tracking-tight text-neutral-900 dark:text-white leading-none">
                      Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},
                      <span className="ml-2 bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent capitalize">
                        {overviewData.userName || user?.name || 'Pilot'}
                      </span>
                    </h1>
                  </div>

                  <div className="space-y-1.5 border-l-2 border-brand-500/20 pl-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 shrink-0">Website Summary</p>
                    <h2 className="text-2xl lg:text-3xl font-black text-neutral-900 dark:text-white tracking-tight leading-none">{overviewData.siteName || activeSite?.siteName || 'RankPilot'}</h2>
                    <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-sm mt-2">
                      {overviewData.intelligence?.websiteSummary || `Monitoring ${overviewData.siteName || activeSite?.siteName} performance across your marketing channels.`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${syncMetadata?.syncStatus === 'syncing' ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-100/50 dark:border-blue-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100/50 dark:border-emerald-500/20'}`}>
                        <div className={`w-1 h-1 rounded-full ${syncMetadata?.syncStatus === 'syncing' ? 'bg-blue-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`}></div>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${syncMetadata?.syncStatus === 'syncing' ? 'text-blue-600 dark:text-blue-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
                          {syncMetadata?.syncStatus === 'syncing' ? 'Syncing...' : 'Active'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 border-l border-neutral-200 dark:border-neutral-800 pl-3">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Synced:</span>
                        <span className="text-[9px] font-black text-neutral-600 dark:text-neutral-300 uppercase">
                          {syncMetadata?.lastDailySyncAt ? new Date(syncMetadata.lastDailySyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </span>
                        <button
                          onClick={handleManualRefresh}
                          disabled={loading || syncMetadata?.syncStatus === 'syncing'}
                          className={`hover:rotate-180 transition-all duration-700 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg ${loading || syncMetadata?.syncStatus === 'syncing' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ArrowPathIcon className={`w-3 h-3 text-neutral-500 ${(loading || syncMetadata?.syncStatus === 'syncing') ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1 hidden sm:block"></div>

                    <div className="relative">
                      <button
                        onClick={() => { setIsDateMenuOpen(!isDateMenuOpen); setIsDeviceMenuOpen(false); }}
                        className={`flex items-center gap-2 px-2.5 py-1 transition-all active:scale-95 group/date rounded-full border shadow-sm ${isDateMenuOpen
                          ? 'bg-brand-600 border-brand-500 text-white'
                          : 'bg-white/50 dark:bg-dark-surface/50 border-neutral-200/50 dark:border-neutral-800'
                          }`}
                      >
                        <CalendarIcon className={`w-3.5 h-3.5 ${isDateMenuOpen ? 'text-white' : 'text-brand-600'}`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isDateMenuOpen ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                          {preset === 'custom' ? 'Range' : preset}
                        </span>
                        <ChevronDownIcon className={`w-3 h-3 transition-transform ${isDateMenuOpen ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
                      </button>

                      {isDateMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 z-[100] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
                          {!isCustomDateMode ? (
                            <>
                              {[
                                { label: 'Today', value: 'today', days: 0 },
                                { label: 'Yesterday', value: 'yesterday', days: 1 },
                                { label: 'Last 7 Days', value: '7d', days: 7 },
                                { label: 'Last 28 Days', value: '28d', days: 28 },
                                { label: 'Last 90 Days', value: '90d', days: 90 },
                                { label: 'Last Year', value: '1y', days: 365 },
                                { label: 'Custom Range', value: 'custom', icon: CalendarIcon },
                              ].map((p) => (
                                <button
                                  key={p.value}
                                  onClick={() => handleDatePresetSelect(p)}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-between ${preset === p.value
                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                    }`}
                                >
                                  {p.label}
                                  {p.value === 'custom' && <ChevronRightIcon className="w-3 h-3 opacity-50" />}
                                </button>
                              ))}
                            </>
                          ) : (
                            <div className="p-2 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-neutral-400">Custom</span>
                                <button onClick={() => setIsCustomDateMode(false)} className="text-[10px] font-bold text-brand-600 hover:underline">Back</button>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[8px] font-black text-neutral-400 uppercase ml-1">Start</label>
                                  <input
                                    type="date"
                                    value={tempDateRange.start}
                                    onChange={(e) => setTempDateRange({ ...tempDateRange, start: e.target.value })}
                                    className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-black text-neutral-400 uppercase ml-1">End</label>
                                  <input
                                    type="date"
                                    value={tempDateRange.end}
                                    onChange={(e) => setTempDateRange({ ...tempDateRange, end: e.target.value })}
                                    className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={handleApplyCustomDate}
                                className="w-full py-2 bg-brand-600 text-white text-[10px] font-black rounded-lg shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
                              >
                                APPLY RANGE
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1 hidden sm:block"></div>

                    <div className="relative">
                      <button
                        onClick={() => { setIsDeviceMenuOpen(!isDeviceMenuOpen); setIsDateMenuOpen(false); }}
                        className={`flex items-center gap-2 px-2.5 py-1 transition-all active:scale-95 group/device rounded-full border shadow-sm ${isDeviceMenuOpen
                          ? 'bg-amber-500 border-amber-400 text-white'
                          : 'bg-white/50 dark:bg-dark-surface/50 border-neutral-200/50 dark:border-neutral-800'
                          }`}
                      >
                        <ComputerDesktopIcon className={`w-3.5 h-3.5 ${isDeviceMenuOpen ? 'text-white' : 'text-amber-500'}`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isDeviceMenuOpen ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                          {device || 'All'}
                        </span>
                        <ChevronDownIcon className={`w-3 h-3 transition-transform ${isDeviceMenuOpen ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
                      </button>

                      {isDeviceMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 z-[100] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-1.5 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
                          {[
                            { label: 'All Devices', value: '', icon: FunnelIcon },
                            { label: 'Mobile', value: 'mobile', icon: DevicePhoneMobileIcon },
                            { label: 'Desktop', value: 'desktop', icon: ComputerDesktopIcon },
                            { label: 'Tablet', value: 'tablet', icon: DeviceTabletIcon },
                          ].map((d) => (
                            <button
                              key={d.value}
                              onClick={() => handleDeviceSelect(d.value)}
                              className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 ${(device || '') === d.value
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                            >
                              <d.icon className="w-3 h-3" />
                              {d.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 lg:items-center">
                  <div className="grid grid-cols-2 gap-3 shrink-0">
                    {[
                      { id: 'ga4', active: !!activeGa4PropertyId, label: 'GA4 Analytics', value: (overviewData.ga4?.sessions) ? formatNumber(overviewData.ga4.sessions) : 'NOT CONNECTED', sublabel: 'Sessions', logo: <Ga4Logo className="w-5 h-5" />, color: 'bg-orange-50' },
                      { id: 'google-ads', active: !!activeGoogleAdsCustomerId, label: 'Google Ads', value: (overviewData.googleAds?.clicks) ? formatNumber(overviewData.googleAds.clicks) : 'NOT CONNECTED', sublabel: 'Clicks', logo: <GoogleAdsLogo className="w-5 h-5" />, color: 'bg-amber-50' },
                      { id: 'gsc', active: !!activeGscSite, label: 'Search Console', value: (overviewData.gsc?.impressions) ? formatNumber(overviewData.gsc.impressions) : 'NOT CONNECTED', sublabel: 'Impressions', logo: <GscLogo className="w-5 h-5" />, color: 'bg-blue-50' },
                      { id: 'facebook', active: !!activeFacebookAdAccountId, label: 'Facebook Ads', value: (overviewData.facebookAds?.reach) ? formatNumber(overviewData.facebookAds.reach) : 'NOT CONNECTED', sublabel: 'Reach', logo: <FacebookAdsLogo className="w-5 h-5" />, color: 'bg-blue-50' }
                    ].map((card) => (
                      <div key={card.id} className="flex flex-col gap-1.5 p-3 bg-white dark:bg-dark-surface border border-neutral-100 dark:border-neutral-800 rounded-2xl w-40 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <div className={`w-8 h-8 rounded-xl ${card.color} dark:bg-opacity-10 flex items-center justify-center shrink-0`}>{card.logo}</div>
                          {card.active && <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter bg-green-100 text-green-600 dark:bg-green-500/10">Connected</div>}
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 leading-none">{card.label}</p>
                          <p className={`font-black text-neutral-900 dark:text-white tabular-nums leading-none tracking-tight mt-1 ${card.value === 'NOT CONNECTED' ? 'text-[10px]' : 'text-xl'}`}>{card.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <AiSectionChat
                      label="AI Brand Summary"
                      sectionTitle="Total Dashboard Summary"
                      activeSources={['ga4', 'gsc', 'google-ads', 'facebook-ads']}
                      contextPrompt={`Analyze complete brand dashboard for ${startDate} to ${endDate}. 
                        - Total Web Traffic (GA4 Sessions): ${formatNumber(totalTraffic || 0)}
                        - Total Organic Clicks (GSC): ${formatNumber(searchClicks || 0)}
                        - Total Ad Spend (Meta + Google): ${formatCurrency(totalAdSpend || 0)}
                        - Total Ad Conversions: ${formatNumber(totalConversions || 0)}
                        - Overall Health Score: ${healthScore}/100.
                        Strategic review: Brannd Performance, Efficiency, Strategy.`}
                    />
                    <button
                      onClick={() => exportToPdf('dashboard-report', `RankPilot-Dashboard-${activeSite?.siteName || 'Report'}`)}
                      className="px-4 py-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-sm active:scale-95 w-full uppercase tracking-wider"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Download PDF
                    </button>
                    <div className="flex flex-col gap-2.5 p-3.5 bg-brand-50/30 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-500/20 rounded-2xl shadow-sm relative overflow-hidden group">
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 font-black text-xs">H</div>
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black uppercase text-brand-600 dark:text-brand-400 tracking-widest leading-none">Audit Score</p>
                            <div className={`px-1.5 py-0.5 rounded text-[6px] font-black uppercase tracking-tighter ${healthScore >= 80 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'} w-fit`}>
                              {healthScore >= 80 ? 'Optimal' : 'Needs Review'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-brand-600 dark:text-brand-400 tracking-tighter leading-none">
                            {healthScore}<span className="text-[8px] text-neutral-400 ml-0.5 font-bold">/100</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!activeGscSite && !activeGa4PropertyId && !activeGoogleAdsCustomerId && !activeFacebookAdAccountId && !loading ? (
            <div className="flex flex-col items-center justify-center p-12 py-24 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-[3rem] text-center shadow-2xl relative overflow-hidden group/empty">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/5 rounded-full blur-[100px] pointer-events-none"></div>
              <div className="relative z-10 max-w-md w-full animate-fade-in-up">
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-4 tracking-tight">Your Dashboard is Unlinked</h2>
                <p className="text-neutral-500 dark:text-neutral-400 font-bold leading-relaxed mb-10">Connect search console, analytics, or ad platforms to activate real-time intelligence.</p>
                <button onClick={() => navigate('/connect-accounts')} className="w-full px-10 py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl text-sm font-black uppercase tracking-[.2em]">Connect Accounts</button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 mt-4">
                {[
                  { label: 'GA4 Source', title: 'Traffic + Trends', metric: activeGa4PropertyId ? (overviewData.ga4 ? formatNumber(overviewData.ga4.sessions) : '0') : null, desc: activeGa4PropertyId ? (overviewData.intelligence?.overviewGA4 || `Analyzing traffic across engagement.`) : 'Connect your GA4 property to activate traffic insights.', icon: <Ga4Logo className="w-3.5 h-3.5" />, color: 'bg-green-100/50 text-green-700 dark:bg-green-500/10 dark:text-green-400', active: !!activeGa4PropertyId, path: activeGa4PropertyId ? '/dashboard/ga4' : '/connect-accounts' },
                  { label: 'Search Console', title: 'Organic Visibility', metric: activeGscSite ? (overviewData.gsc ? formatNumber(overviewData.gsc.impressions) : '0') : null, desc: activeGscSite ? (overviewData.intelligence?.overviewGSC || `Visibility on keywords.`) : 'Link GSC to track search impressions and organic clicks.', icon: <GscLogo className="w-3.5 h-3.5" />, color: 'bg-blue-100/50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400', active: !!activeGscSite, path: activeGscSite ? '/dashboard/gsc' : '/connect-accounts' },
                  { label: 'Google Ads', title: 'Ad Performance', metric: activeGoogleAdsCustomerId ? (overviewData.googleAds ? formatNumber(overviewData.googleAds.clicks || 0) : '0') : null, desc: activeGoogleAdsCustomerId ? (overviewData.intelligence?.overviewGAds || `Monitoring ad campaigns.`) : 'Enable Google Ads to monitor total clicks and budget efficiency.', icon: <GoogleAdsLogo className="w-3.5 h-3.5" />, color: 'bg-amber-100/50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', active: !!activeGoogleAdsCustomerId, path: activeGoogleAdsCustomerId ? '/dashboard/google-ads' : '/connect-accounts' },
                  { label: 'Facebook Ads', title: 'Ad Reach', metric: activeFacebookAdAccountId ? (overviewData.facebookAds ? formatNumber(overviewData.facebookAds.reach || 0) : '0') : null, desc: activeFacebookAdAccountId ? (overviewData.intelligence?.overviewFAds || 'Reach from Facebook ads.') : 'Connect Facebook Ads to measure reach and total impressions.', icon: <FacebookAdsLogo className="w-3.5 h-3.5" />, color: 'bg-blue-100/50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400', active: !!activeFacebookAdAccountId, path: activeFacebookAdAccountId ? '/dashboard/facebook-ads' : '/connect-accounts' },
                  { label: 'Site Health', title: 'Audit Score', metric: healthScore, desc: overviewData.intelligence?.overviewHealth || (healthScore >= 80 ? 'Exceptional health score optimized.' : 'Optimization required for issues.'), icon: <RankPilotLogo className="w-3.5 h-3.5" />, color: healthScore >= 80 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700', active: true, path: '/dashboard/site-audit' }
                ].map((card, i) => (
                  <div key={i} onClick={() => navigate(card.path)} className={`bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-800/60 rounded-[3rem] p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl group cursor-pointer overflow-hidden relative flex flex-col h-full min-h-[300px]`}>
                    {!card.active && <div className="absolute top-6 right-6"><div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-center border border-neutral-100 dark:border-neutral-700/50 transition-all duration-500"><PlusIcon className="w-4 h-4" /></div></div>}
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${card.color} text-[10px] font-black mb-6 w-fit`}>{card.icon}{card.label}</div>
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white mb-2">{card.title}</h3>
                    {card.metric ? <div className="text-4xl font-black text-neutral-900 dark:text-white tabular-nums mb-4">{card.metric}</div> : <div className="mb-4 py-1"><div className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest opacity-60">Connect to Unlock</div></div>}
                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6 flex-grow">{card.desc}</p>
                    <div className="mt-auto pt-4 border-t border-neutral-50 dark:border-neutral-800/50 flex items-center justify-between text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest">
                      <span>{card.active ? 'View Analytics' : 'Activate Insights'}</span>
                      <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <KpiCard title="Audience Traffic" value={formatNumber(totalTraffic)} change={overviewData.ga4?.growth || 0} isPositive={(overviewData.ga4?.growth || 0) >= 0} loading={loading} Icon={Ga4Logo} changeText="vs. last period" chartData={timeseriesData.map(d => d.Sessions)} disconnected={!activeGa4PropertyId} onClick={() => navigate(!activeGa4PropertyId ? '/connect-accounts' : '/dashboard/ga4')} insight={overviewData.intelligence?.metricTraffic} />
                <KpiCard title="Google Search Clicks" value={formatNumber(searchClicks)} change={overviewData.gsc?.growth || 0} isPositive={(overviewData.gsc?.growth || 0) >= 0} loading={loading} Icon={GscLogo} changeText="organic search" chartData={timeseriesData.map(d => d.Clicks)} disconnected={!activeGscSite} onClick={() => navigate(!activeGscSite ? '/connect-accounts' : '/dashboard/gsc')} insight={overviewData.intelligence?.metricClicks} />
                <KpiCard title="Total Ad Investment" value={formatCurrency(totalAdSpend)} change={Math.abs(overviewData.googleAds?.growth || 0)} isPositive={true} loading={loading} Icon={GoogleAdsLogo} changeText="combined spend" chartData={timeseriesData.map(d => d.Spend || 0)} disconnected={!activeGoogleAdsCustomerId && !activeFacebookAdAccountId} onClick={() => navigate((!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? '/connect-accounts' : '/dashboard/google-ads')} insight={overviewData.intelligence?.metricSpend} />
                <KpiCard title="Conversion Goals" value={formatNumber(totalConversions)} change={overviewData.googleAds?.growth || 0} isPositive={(overviewData.googleAds?.growth || 0) >= 0} loading={loading} Icon={SuccessLogo} changeText="all platforms" chartData={timeseriesData.map(d => d.Conversions || 0)} disconnected={!activeGoogleAdsCustomerId && !activeFacebookAdAccountId} onClick={() => navigate((!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? '/connect-accounts' : '/dashboard/google-ads')} insight={overviewData.intelligence?.metricConversions} />
                <KpiCard title="Marketing Impressions" value={formatNumber(totalAdImpressions)} change={overviewData.facebookAds?.growth || 0} isPositive={(overviewData.facebookAds?.growth || 0) >= 0} loading={loading} Icon={FacebookAdsLogo} changeText="paid reach" chartData={timeseriesData.map(d => d.Impressions || 0)} disconnected={!activeGoogleAdsCustomerId && !activeFacebookAdAccountId} onClick={() => navigate((!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? '/connect-accounts' : '/dashboard/facebook-ads')} insight={overviewData.intelligence?.metricImpressions} />
                <KpiCard title="Efficiency Score" value={totalAdSpend > 0 ? `${(totalConversions / (totalAdSpend / 100)).toFixed(1)}x` : '0.0x'} change={4.2} isPositive={true} loading={loading} Icon={PerformanceLogo} changeText="conversions per $100" chartData={timeseriesData.map(d => d.Spend > 0 ? (d.Conversions || 0) / ((d.Spend || 1) / 100) : 0)} disconnected={!activeGoogleAdsCustomerId && !activeFacebookAdAccountId} onClick={() => navigate((!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? '/connect-accounts' : '/dashboard/google-ads')} insight={overviewData.intelligence?.metricEfficiency} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm transition-all shadow-orange-500/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0"><Ga4Logo className="w-4 h-4" /></div>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Google Analytics 4</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeGa4PropertyId && (
                        <>
                          <AiSectionChat sectionTitle="Overview - GA4 Summary" contextPrompt={`Quick GA4 summary: ${formatNumber(overviewData.ga4?.users)} users, ${formatNumber(overviewData.ga4?.sessions)} sessions, bounce rate ${formatPct(overviewData.ga4?.bounceRate || 0)}. Insights?`} activeSources={['ga4']} />
                          <button onClick={() => navigate('/dashboard/ga4')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">View Full <ArrowRightIcon className="w-3 h-3" /></button>
                        </>
                      )}
                    </div>
                  </div>
                  {!activeGa4PropertyId ? <div className="h-[148px]"><EmptyState message="Google Analytics Not Linked" sub="Connect GA4 for traffic analysis." onAction={() => navigate('/connect-accounts')} /></div> : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Users', value: formatNumber(overviewData.ga4?.users) },
                        { label: 'Sessions', value: formatNumber(overviewData.ga4?.sessions) },
                        { label: 'Bounce', value: formatPct(overviewData.ga4?.bounceRate || 0) },
                        { label: 'Avg Time', value: formatTime(overviewData.ga4?.avgSessionDuration) },
                        { label: 'Views', value: formatNumber(overviewData.ga4?.pageViews) },
                        { label: 'Growth', value: `${(overviewData.ga4?.growth || 0) >= 0 ? '+' : ''}${(overviewData.ga4?.growth || 0).toFixed(1)}%` },
                      ].map((m, i) => (
                        <div key={i} className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl transition-all">
                          <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 font-bold uppercase tracking-tight">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm transition-all shadow-green-500/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0"><GscLogo className="w-4 h-4" /></div>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Search Console</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeGscSite && (
                        <>
                          <AiSectionChat sectionTitle="Overview - GSC Summary" contextPrompt={`Quick GSC: ${formatNumber(overviewData.gsc?.clicks)} clicks, ${formatNumber(overviewData.gsc?.impressions)} impressions. Avg position #${(overviewData.gsc?.avgPosition || 0).toFixed(1)}.`} activeSources={['gsc']} />
                          <button onClick={() => navigate('/dashboard/gsc')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">View Full <ArrowRightIcon className="w-3 h-3" /></button>
                        </>
                      )}
                    </div>
                  </div>
                  {!activeGscSite ? <div className="h-[148px]"><EmptyState message="Search Console Disconnected" sub="Connect to track rankings." onAction={() => navigate('/connect-accounts')} /></div> : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Clicks', value: formatNumber(overviewData.gsc?.clicks) },
                        { label: 'Impressions', value: formatNumber(overviewData.gsc?.impressions) },
                        { label: 'CTR', value: formatPct((overviewData.gsc?.ctr || 0) * 100) },
                        { label: 'Avg Pos', value: `#${(overviewData.gsc?.avgPosition || 0).toFixed(1)}` },
                        { label: 'Growth', value: `${(overviewData.gsc?.growth || 0) >= 0 ? '+' : ''}${(overviewData.gsc?.growth || 0).toFixed(1)}%` },
                        { label: 'Status', value: 'Live' },
                      ].map((m, i) => (
                        <div key={i} className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl transition-all">
                          <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 font-bold uppercase tracking-tight">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm transition-all shadow-amber-500/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0"><GoogleAdsLogo className="w-4 h-4" /></div>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Google Ads</h3>
                    </div>
                    {activeGoogleAdsCustomerId && <button onClick={() => navigate('/dashboard/google-ads')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">View Full <ArrowRightIcon className="w-3 h-3" /></button>}
                  </div>
                  {!activeGoogleAdsCustomerId ? <div className="h-[148px]"><EmptyState message="Google Ads Not Found" sub="Link to track spend." onAction={() => navigate('/connect-accounts')} /></div> : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Spend', value: formatCurrency(overviewData.googleAds?.spend) },
                        { label: 'Clicks', value: formatNumber(overviewData.googleAds?.clicks) },
                        { label: 'Impressions', value: formatNumber(overviewData.googleAds?.impressions) },
                        { label: 'Conv.', value: formatNumber(overviewData.googleAds?.conversions) },
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

                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm transition-all shadow-blue-500/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0"><FacebookAdsLogo className="w-4 h-4" /></div>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Facebook Ads</h3>
                    </div>
                    {activeFacebookAdAccountId && <button onClick={() => navigate('/dashboard/facebook-ads')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">View Full <ArrowRightIcon className="w-3 h-3" /></button>}
                  </div>
                  {!activeFacebookAdAccountId ? <div className="h-[148px]"><EmptyState message="Meta Ads Not Found" sub="Connect to analyze spend." onAction={() => navigate('/connect-accounts')} /></div> : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Spend', value: formatCurrency(overviewData.facebookAds?.spend) },
                        { label: 'Reach', value: formatNumber(overviewData.facebookAds?.reach) },
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

                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-8 mb-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Ad Platform Comparison</h3>
                      <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mt-1">
                        {overviewData.intelligence?.adWinnerInsight || "Platform performance comparison shows clear efficiency leaders."}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!overviewData.connectionStatus?.googleAds && <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black uppercase border border-amber-100/50">Google Ads Missing</span>}
                      {!overviewData.connectionStatus?.facebookAds && <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black uppercase border border-blue-100/50">Meta Ads Missing</span>}
                      <span className="px-4 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-neutral-200/50 dark:border-neutral-700/50">Cumulative Data</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-black uppercase text-neutral-400 text-left">
                          <th className="pb-4">Metric</th>
                          <th className="pb-4">Google Ads</th>
                          <th className="pb-4">Facebook Ads</th>
                          <th className="pb-4 text-right pr-4">Winning Asset</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                        {(!overviewData.connectionStatus?.googleAds && !overviewData.connectionStatus?.facebookAds) ? (
                          <tr>
                            <td colSpan="4" className="py-20 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <p className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">No Ad Sources Connected</p>
                                <p className="text-xs font-bold text-neutral-400 mb-6">Connect your ad platforms to unlock competitive analysis.</p>
                                <button onClick={() => navigate('/connect-accounts')} className="px-6 py-2.5 bg-brand-600 text-white text-[10px] font-black rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all uppercase tracking-widest">Connect First Account</button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          [
                            { label: 'Total Spend', g: formatCurrency(overviewData.googleAds?.spend), f: formatCurrency(overviewData.facebookAds?.spend), w: overviewData.adWinners?.spend, gc: overviewData.connectionStatus?.googleAds, fc: overviewData.connectionStatus?.facebookAds },
                            { label: 'Total Clicks', g: formatNumber(overviewData.googleAds?.clicks), f: formatNumber(overviewData.facebookAds?.clicks), w: overviewData.adWinners?.clicks, gc: overviewData.connectionStatus?.googleAds, fc: overviewData.connectionStatus?.facebookAds },
                            { label: 'Conversions', g: formatNumber(overviewData.googleAds?.conversions), f: formatNumber(overviewData.facebookAds?.conversions), w: overviewData.adWinners?.conversions, gc: overviewData.connectionStatus?.googleAds, fc: overviewData.connectionStatus?.facebookAds },
                            { label: 'Avg CPC', g: formatCurrency(overviewData.googleAds?.cpc), f: formatCurrency(overviewData.facebookAds?.cpc), w: overviewData.adWinners?.cpc, gc: overviewData.connectionStatus?.googleAds, fc: overviewData.connectionStatus?.facebookAds },
                            { label: 'Avg CTR', g: formatPct((overviewData.googleAds?.ctr || 0) * 100), f: formatPct((overviewData.facebookAds?.ctr || 0) * 100), w: overviewData.adWinners?.ctr, gc: overviewData.connectionStatus?.googleAds, fc: overviewData.connectionStatus?.facebookAds }
                          ].map((row, i) => (
                            <tr key={i} className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-all">
                              <td className="py-4 font-bold text-neutral-500 dark:text-neutral-400 flex items-center gap-2 uppercase text-[10px] tracking-wide">{row.label}</td>
                              <td className={`py-4 font-black tabular-nums ${!row.gc ? 'text-neutral-300 dark:text-neutral-700 italic font-bold text-[10px]' : 'text-neutral-900 dark:text-white'}`}>
                                {row.gc ? row.g : 'NOT LINKED'}
                              </td>
                              <td className={`py-4 font-black tabular-nums ${!row.fc ? 'text-neutral-300 dark:text-neutral-700 italic font-bold text-[10px]' : 'text-neutral-900 dark:text-white'}`}>
                                {row.fc ? row.f : 'NOT LINKED'}
                              </td>
                              <td className="py-4 text-right pr-4">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight ${row.w === 'Google Ads' && row.gc ? 'bg-amber-50 text-amber-600 border border-amber-100' : row.w === 'Facebook Ads' && row.fc ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-neutral-50 text-neutral-400 border border-neutral-100'}`}>
                                  {(row.gc && row.fc) ? (row.w || 'Analyzing...') : 'N/A'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>


              <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-8 mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-8">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tight">Growth Trajectory</h3>
                    <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                      {overviewData.intelligence?.growthMatrixInsight || "Real-time performance distribution across timeframe."}
                    </p>
                  </div>
                  <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-1.5 overflow-x-auto w-full sm:w-auto">
                    {['Sessions', 'Clicks', 'Impressions', 'Spend', 'Conversions'].map((m) => (
                      <button key={m} onClick={() => setSelectedMetric(m)} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${selectedMetric === m ? 'bg-white dark:bg-dark-card text-brand-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-400'}`}>{m}</button>
                    ))}
                  </div>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartDataToUse}>
                      <defs><linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={metricColor} stopOpacity={0.25} /><stop offset="95%" stopColor={metricColor} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800/20" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(str) => { const d = new Date(str); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }} minTickGap={30} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', background: '#FFFFFF', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey={selectedMetric} stroke={metricColor} strokeWidth={4} fill="url(#colorMetric)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* AI Performance Insight Footer */}
                <div className="mt-8 p-4 bg-blue-50/30 dark:bg-blue-500/5 border border-blue-100/50 dark:border-blue-500/20 rounded-2xl flex items-center gap-3">
                   <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-600/20">
                      <ArrowTrendingUpIcon className="w-4 h-4" />
                   </div>
                   <p className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      <span className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mr-2 text-[9px]">Growth Analysis:</span>
                      {overviewData.intelligence?.growthMatrixInsight || "Organic and paid growth trends are being correlated to identify scaling triggers."}
                   </p>
                </div>
              </div>



              <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm mb-8">
                <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white uppercase">Engagement & Audit</h3>
                    <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">🕵️ Analyzing your most valuable landing pages & audit status.</p>
                  </div>
                  <button onClick={downloadCSV} className="text-[10px] font-black px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl uppercase">Export CSV</button>
                </div>
                <div className="p-4">
                    <DataTable columns={pageColumns} data={filteredPages} loading={loading} initialLimit={5} className="border-none" />
                </div>

                {/* Strategic Page Insight Footer */}
                <div className="mx-6 mb-6 p-4 bg-emerald-50/30 dark:bg-emerald-500/5 border border-emerald-100/50 dark:border-emerald-500/20 rounded-2xl flex items-center gap-3">
                   <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-600/20">
                      <MagnifyingGlassIcon className="w-4 h-4" />
                   </div>
                   <p className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      <span className="text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-widest mr-2 text-[9px]">SEO Strategy:</span>
                      {overviewData.intelligence?.topPagesInsight || "Engaging content distribution is being analyzed to identify high-potential growth opportunities."}
                   </p>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-8 mb-8 pb-4">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Overall Period Comparison</h3>
                    <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mt-1">
                      Detailed performance mapping across your marketing stack.
                    </p>
                  </div>
                   <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-3 py-1 rounded-full border border-purple-100 uppercase tracking-widest flex items-center gap-2">
                     <SparklesIcon className="w-3 h-3" /> vs Last Period
                   </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-black uppercase text-neutral-400 text-left"><th className="pb-4">Source</th><th className="pb-4">Metric</th><th className="pb-4">THIS PERIOD</th><th className="pb-4">LAST PERIOD</th><th className="pb-4">CHANGE</th></tr></thead>
                    <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                       {[
                         { s: '📈 GA4', m: 'Sessions', val: overviewData.ga4?.sessions, prior: overviewData.ga4?.priorSessions, grow: overviewData.ga4?.growthSessions },
                         { s: '📈 GA4', m: 'Users', val: overviewData.ga4?.users, prior: overviewData.ga4?.priorUsers, grow: overviewData.ga4?.growthUsers },
                         { s: '🔍 GSC', m: 'Impressions', val: overviewData.gsc?.impressions, prior: overviewData.gsc?.priorImpressions, grow: overviewData.gsc?.growthImpressions },
                         { s: '🔍 GSC', m: 'Clicks', val: overviewData.gsc?.clicks, prior: overviewData.gsc?.priorClicks, grow: overviewData.gsc?.growthClicks },
                         { s: '💰 Google Ads', m: 'Spend', val: overviewData.googleAds?.spend, prior: overviewData.googleAds?.priorSpend, grow: overviewData.googleAds?.growthSpend, isCurr: true },
                         { s: '💰 Google Ads', m: 'Conversions', val: overviewData.googleAds?.conversions, prior: overviewData.googleAds?.priorConversions, grow: overviewData.googleAds?.growthConversions },
                         { s: '📘 Facebook Ads', m: 'Spend', val: overviewData.facebookAds?.spend, prior: overviewData.facebookAds?.priorSpend, grow: overviewData.facebookAds?.growthSpend, isCurr: true },
                         { s: '📱 Facebook Ads', m: 'Reach', val: overviewData.facebookAds?.reach, prior: overviewData.facebookAds?.priorReach, grow: overviewData.facebookAds?.growthReach },
                       ].map((row, i) => {
                         const priorValue = row.prior || 0;
                         return (
                           <tr key={i} className="hover:bg-neutral-50/50 transition-colors">
                             <td className="py-4 font-black text-neutral-500 text-[11px]">{row.s}</td>
                             <td className="py-4 font-bold text-neutral-700 dark:text-neutral-300">{row.m}</td>
                             <td className="py-4 font-black tabular-nums">{loading ? '—' : row.isCurr ? formatCurrency(row.val) : formatNumber(row.val)}</td>
                             <td className="py-4 font-bold text-neutral-400 tabular-nums">{loading ? '—' : row.isCurr ? formatCurrency(priorValue) : formatNumber(priorValue)}</td>
                             <td className="py-4">
                               <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 w-fit ${row.grow >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                 {row.grow >= 0 ? <ArrowUpIcon className="w-2.5 h-2.5" /> : <ArrowDownIcon className="w-2.5 h-2.5" />}
                                 {Math.abs(row.grow || 0).toFixed(1)}%
                               </span>
                             </td>
                           </tr>
                         );
                       })}
                    </tbody>
                  </table>
                </div>

                {/* AI Footer Insight for Comparison */}
                <div className="mt-8 p-4 bg-brand-50/30 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-500/20 rounded-2xl flex items-center gap-3 animate-pulse-slow">
                   <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-600/20">
                      <SparklesIcon className="w-4 h-4" />
                   </div>
                   <p className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      <span className="text-brand-600 dark:text-brand-400 font-black uppercase tracking-widest mr-2 text-[9px]">AI Analysis:</span>
                      {overviewData.intelligence?.comparisonInsight || "Historical performance growth is being mapped against previous cycle benchmarks."}
                   </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
