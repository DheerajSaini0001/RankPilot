import React, { useState, useEffect, useCallback } from 'react';
import AiSectionChat from '../components/ai/AiSectionChat';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import KpiCard from '../components/dashboard/KpiCard';
import DataTable from '../components/dashboard/DataTable';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import api from '../api';
import { getActiveAccounts } from '../api/accountApi';
import {
    CursorArrowRaysIcon,
    MagnifyingGlassIcon,
    ChartBarIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    SparklesIcon,
    GlobeAltIcon,
    ArrowDownTrayIcon,
    UserCircleIcon,
    ArrowPathIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    CalendarIcon,
    FunnelIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { exportToPdf } from '../utils/reportExport';
import { 
    ResponsiveContainer, 
    AreaChart, Area, 
    LineChart, Line,
    BarChart, Bar,
    XAxis, YAxis, 
    Tooltip, CartesianGrid,
    PieChart, Pie, Cell
} from 'recharts';
import FilterBar from '../components/dashboard/FilterBar';
import { useFilterStore } from '../store/filterStore';
import { useAiChatStore } from '../store/aiChatStore';

const formatNumber = (num) => Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

const GscLogo = ({ className = "w-6 h-6" }) => (
    <div className={`${className} bg-brand-600 rounded-lg flex items-center justify-center p-1`}>
        <MagnifyingGlassIcon className="w-full h-full text-white" />
    </div>
);

const SectionAiSummary = ({ insight, loading, sectionTitle, title = "AI SUMMARY" }) => (
    <div className="mt-4 p-4 bg-brand-50/10 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-500/20 rounded-[1.5rem] animate-in fade-in duration-700">
        <h4 className="text-[10px] font-black text-neutral-900 dark:text-white uppercase tracking-[0.15em] mb-3">{sectionTitle || title}</h4>
        {loading ? (
            <div className="space-y-2 animate-pulse mb-4">
                <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full" />
                <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[85%]" />
            </div>
        ) : (
            <p className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                {insight || "Analyzing section data for strategic intelligence..."}
            </p>
        )}
    </div>
);

const EmptyState = ({ message='No data for this period', sub='Try selecting a wider date range' }) => (
  <div className="flex flex-col items-center justify-center py-12 text-neutral-400 dark:text-neutral-500">
    <div className="text-4xl mb-3 opacity-50">📭</div>
    <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300">{message}</p>
    <p className="text-xs mt-1 font-medium">{sub}</p>
  </div>
);

const GscPage = () => {
    const startDate = useDateRangeStore(s => s.startDate);
    const endDate = useDateRangeStore(s => s.endDate);
    const preset = useDateRangeStore(s => s.preset);
    const setPreset = useDateRangeStore(s => s.setPreset);
    
    const searchQuery = useFilterStore(s => s.searchQuery);
    const setSearchQuery = useFilterStore(s => s.setSearchQuery);
    const device = useFilterStore(s => s.device);
    const setFilters = useFilterStore(s => s.setFilters);

    const activeGscSite = useAccountsStore(s => s.activeGscSite);
    const connectedSources = useAccountsStore(s => s.connectedSources);
    const activeSiteId = useAccountsStore(s => s.activeSiteId);
    const syncMetadata = useAccountsStore(s => s.syncMetadata);
    const setAccounts = useAccountsStore(s => s.setAccounts);
    const userSites = useAccountsStore(s => s.userSites);
    
    const openWithQuestion = useAiChatStore(s => s.openWithQuestion);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [overview, setOverview] = useState(null);
    const [priorOverview, setPriorOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [queries, setQueries] = useState([]);
    const [pages, setPages] = useState([]);
    const [intelligence, setIntelligence] = useState(null);

    const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
    const [isCustomDateMode, setIsCustomDateMode] = useState(false);
    const [tempDateRange, setTempDateRange] = useState({ start: startDate, end: endDate });

    const presetLabels = {
        'today': 'Today',
        'yesterday': 'Yesterday',
        '7d': 'Last 7 Days',
        '28d': 'Last 28 Days',
        '90d': 'Last 90 Days',
        '1y': 'Last Year',
        'custom': 'Custom Range'
    };

    const loadData = useCallback(async () => {
        if (!activeGscSite) return;
        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate,
                endDate,
                ...(device && { device }),
                ...(activeSiteId && { siteId: activeSiteId })
            }).toString();
            
            const res = await api.get(`/analytics/gsc-summary?${query}`);
            const data = res.data;

            setOverview(data.overview);
            setPriorOverview(data.priorOverview);
            setTimeseries(data.timeseries || []);
            setQueries(data.queries || []);
            setPages(data.pages || []);
            setIntelligence(data.intelligence || null);

            if (data.syncMetadata) {
                setAccounts({
                    syncStatus: data.syncMetadata.syncStatus,
                    lastDailySyncAt: data.syncMetadata.lastDailySyncAt,
                    isHistoricalSyncComplete: data.syncMetadata.isHistoricalSyncComplete
                });
            }
            
            console.log('GSC timeseries:', data.timeseries);
        } catch (err) {
            console.error("GSC fetch err", err);
        } finally {
            setLoading(false);
        }
    }, [activeGscSite, startDate, endDate, device, activeSiteId]);

    const handleManualRefresh = async () => {
        if (!activeSiteId) return;
        setLoading(true);
        // 1. Set status to syncing in store
        setAccounts({ syncStatus: 'syncing' });

        try {
            // 2. Perform sync
            await api.post('/analytics/sync', { siteId: activeSiteId });

            // 3. Update store with latest metadata (time, status)
            const res = await getActiveAccounts(activeSiteId);
            const data = res.data || {};
            setAccounts({
                syncMetadata: {
                    isHistoricalSyncComplete: data.isHistoricalSyncComplete || false,
                    lastDailySyncAt: data.lastDailySyncAt || null,
                    syncStatus: data.syncStatus || 'idle'
                }
            });

            // 4. Load the dashboard data
            await loadData();
        } catch (err) {
            console.error('Manual sync failed:', err);
            // Even on error, update metadata to clear syncing status
            const res = await getActiveAccounts(activeSiteId).catch(() => ({ data: {} }));
            const data = res.data || {};
            setAccounts({
                syncMetadata: {
                    isHistoricalSyncComplete: data.isHistoricalSyncComplete || false,
                    lastDailySyncAt: data.lastDailySyncAt || null,
                    syncStatus: data.syncStatus || 'error'
                }
            });
            await loadData();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const interval = setInterval(() => {
            console.log('Auto-refreshing GSC data...');
            loadData();
        }, 30 * 60 * 1000);

        return () => clearInterval(interval);
    }, [loadData]);
    
    // Refresh data when sync completes
    useEffect(() => {
        if (syncMetadata?.syncStatus !== 'syncing' && activeSiteId) {
            console.log('GSC Sync completed or idle, refreshing data...');
            loadData();
        }
    }, [syncMetadata?.syncStatus, activeSiteId, loadData]);


    if (!connectedSources.includes('ga4') && !connectedSources.includes('gsc')) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm">
                        <ExclamationTriangleIcon className="w-12 h-12 text-neutral-400 mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Google Not Connected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-5">Please go to Integrations to connect your Google account to enable Search Console data.</p>
                        <button onClick={() => navigate('/connect-accounts')} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">Go to Integrations</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!activeGscSite) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm">
                        <MagnifyingGlassIcon className="w-12 h-12 text-amber-400 mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">No Site Selected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-5">Google is connected, but no Search Console site has been selected. Pick one from the sidebar dropdown or go to Integrations.</p>
                        <button onClick={() => navigate('/connect-accounts')} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">Select a Site</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }



    const filteredQueries = queries.filter(q => 
        (q.query?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const filteredPages = pages.filter(p => 
        (p.page?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const queryColumns = [
        { header: 'Query', accessor: 'query' },
        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
        { header: 'Impressions', cell: (row) => formatNumber(row.impressions) },
        { header: 'CTR', cell: (row) => `${(row.ctr * 100).toFixed(2)}%` },
        { header: 'Avg. Position', cell: (row) => row.position.toFixed(1) },
    ];

    const pageColumns = [
        { header: 'Page URL', cell: (row) => <div className="max-w-[300px] truncate" title={row.page}>{row.page.replace('https://', '').replace('http://', '')}</div> },
        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
        { header: 'Impressions', cell: (row) => formatNumber(row.impressions) },
    ];

    // Derived Data
    const avgCTR = overview ? (overview.ctr * 100).toFixed(2) : '0';
    const totalQueries = queries ? queries.length : 0;
    const topPosition = queries && queries.length > 0
      ? Math.min(...queries.map(q => q.position || 100)).toFixed(1)
      : '—';

    const ctrTrend = timeseries.map(d => ({
        date: d.date,
        ctr: d.ctr ? parseFloat((d.ctr * 100).toFixed(2)) : 0
    }));

    const positionTrend = timeseries.map((d) => ({
        date: d.date,
        position: d.position ? parseFloat(d.position.toFixed(1)) : 0
    }));

    const opportunities = queries
      ? queries
          .filter(q => q.impressions > 50 && q.ctr < 0.05)
          .sort((a,b) => b.impressions - a.impressions)
          .slice(0, 5)
      : [];

    const nearPageOne = queries
      ? queries
          .filter(q => (q.position || 0) >= 8 && (q.position || 0) <= 20)
          .sort((a,b) => a.position - b.position)
          .slice(0, 5)
      : [];

    const calculateChange = (curr, prior) => {
        if (!prior || prior === 0) return 0;
        return parseFloat(((curr - prior) / prior * 100).toFixed(1));
    };

    const comparison = (overview && priorOverview) ? [
        { metric:'🖱️ Clicks',       current: overview.clicks,                           prior: priorOverview.clicks,             change: calculateChange(overview.clicks, priorOverview.clicks), up: overview.clicks >= priorOverview.clicks },
        { metric:'👁️ Impressions',  current: overview.impressions,                      prior: priorOverview.impressions,        change: calculateChange(overview.impressions, priorOverview.impressions), up: overview.impressions >= priorOverview.impressions },
        { metric:'🎯 CTR',          current: `${(overview.ctr*100).toFixed(2)}%`,        prior: `${(priorOverview.ctr*100).toFixed(2)}%`,       change: calculateChange(overview.ctr, priorOverview.ctr),  up: overview.ctr >= priorOverview.ctr },
        { metric:'📍 Avg Position',  current: `#${overview.position?.toFixed(1)}`,    prior: `#${priorOverview.position?.toFixed(1)}`,   change: calculateChange(priorOverview.position, overview.position), up: overview.position <= priorOverview.position },
    ] : [];

    return (
        <DashboardLayout>
            <div id="gsc-report" className="flex flex-col space-y-8">
                {/* Compact Professional Header */}
                <div className={`bg-white dark:bg-[#0d0d0d] px-6 py-4 rounded-[1.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm relative transition-all duration-300 ${isDateMenuOpen ? 'z-50' : 'z-10'}`}>
                    <div className="relative z-10 flex flex-col xl:flex-row xl:items-center gap-6 xl:gap-10">
                        {/* 1. Logo & Identity Section */}
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="w-12 h-12 bg-white dark:bg-neutral-800/80 rounded-xl flex items-center justify-center shrink-0 border border-neutral-100 dark:border-neutral-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                                <GscLogo className="w-7 h-7" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-lg md:text-xl font-black text-neutral-900 dark:text-white tracking-tight leading-none">Search Console</h1>
                                    {activeSiteId && (
                                        <div className="px-2 py-0.5 bg-neutral-900 dark:bg-neutral-800 text-white rounded text-[7px] font-black uppercase tracking-widest">
                                            {userSites?.find(s => s._id === activeSiteId)?.siteName || 'ACTIVE SITE'}
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium leading-none mt-1.5 selection:bg-brand-500/20">
                                    Monitor your search performance and optimize keywords with AI-powered SEO intelligence.
                                </p>
                                <div className="mt-2.5 flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                                        <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Connected</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 font-bold uppercase tracking-widest">
                                            Synced: <span className="text-neutral-700 dark:text-neutral-300 tabular-nums font-black">{syncMetadata?.lastDailySyncAt ? new Date(syncMetadata.lastDailySyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
                                            <button onClick={handleManualRefresh} className="hover:text-brand-500 transition-all active:rotate-180 ml-1">
                                                <ArrowPathIcon className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block"></div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                                                className={`flex items-center gap-2 px-2.5 py-1 transition-all active:scale-95 group/date rounded-full border shadow-sm ${isDateMenuOpen
                                                    ? 'bg-brand-600 border-brand-500 text-white'
                                                    : 'bg-white/50 dark:bg-dark-surface/50 border-neutral-200/50 dark:border-neutral-800/60'
                                                    }`}
                                            >
                                                <CalendarIcon className={`w-3.5 h-3.5 ${isDateMenuOpen ? 'text-white' : 'text-brand-600'}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${isDateMenuOpen ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                                                    {preset === 'custom' ? 'Range' : preset}
                                                </span>
                                                <ChevronDownIcon className={`w-3 h-3 transition-transform ${isDateMenuOpen ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
                                            </button>
                                            {isDateMenuOpen && (
                                                <div className="absolute top-full left-0 mt-2 z-[100] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-200 normal-case tracking-normal">
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
                                                                        className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none text-neutral-900 dark:text-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[8px] font-black text-neutral-400 uppercase ml-1">End</label>
                                                                    <input
                                                                        type="date"
                                                                        value={tempDateRange.end}
                                                                        onChange={(e) => setTempDateRange({ ...tempDateRange, end: e.target.value })}
                                                                        className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none text-neutral-900 dark:text-white"
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
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Divider (Desktop) */}
                        <div className="hidden xl:block w-[1px] h-8 bg-neutral-100 dark:bg-neutral-800/60"></div>

                        {/* 3. Information Row */}
                        <div className="flex-1 flex flex-wrap items-center gap-x-10 gap-y-3">
                            {[
                                { label: 'PROPERTY URL', value: activeGscSite?.replace('https://', '').replace('http://', '') || 'website.com', icon: GlobeAltIcon },
                                { label: 'SYNC ACCOUNT', value: userSites?.find(s => s._id === activeSiteId)?.gscTokenId?.email || 'seo@slt.work', icon: UserCircleIcon }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2.5 min-w-max">
                                    <div className="w-8 h-8 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 flex items-center justify-center border border-neutral-100 dark:border-neutral-700/30">
                                        <item.icon className="w-4 h-4 text-neutral-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-0.5">{item.label}</span>
                                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200 tracking-tight">{item.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 4. Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <button
                                onClick={() => openWithQuestion(`Analyze my GSC performance for ${startDate} to ${endDate}. Clicks: ${formatNumber(overview?.clicks || 0)}, Impressions: ${formatNumber(overview?.impressions || 0)}`)}
                                className="h-8 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                AI SUMMARY
                            </button>
                            <button
                                onClick={() => exportToPdf('gsc-report', `RankPilot-GSC-${activeSiteId}`)}
                                className="h-8 px-3 bg-white dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg text-[9px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all"
                            >
                                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                PDF REPORT
                            </button>
                        </div>
                    </div>
                </div>

                {/* Refined Search Bar */}
                <div className="flex justify-start">
                    <div className="group bg-white/70 dark:bg-dark-card/70 backdrop-blur-lg border border-neutral-200/60 dark:border-neutral-700/50 rounded-full px-4 py-2 shadow-sm flex items-center gap-3 w-full max-w-md transition-all hover:shadow-md hover:border-brand-500/30">
                        <FunnelIcon className="w-4 h-4 text-neutral-400 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search queries or pages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs font-bold text-neutral-900 dark:text-white placeholder:text-neutral-400 flex-1"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="text-neutral-400 hover:text-red-500 transition-colors"
                            >
                                <XMarkIcon className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Search Clicks"
                        value={overview ? formatNumber(overview.clicks || 0) : '0'}
                        loading={loading}
                        Icon={CursorArrowRaysIcon}
                        change={calculateChange(overview?.clicks, priorOverview?.clicks)}
                        isPositive={overview?.clicks >= priorOverview?.clicks}
                        changeText="last 28 days"
                        chartData={timeseries.map(d => d.clicks).slice(-10)}
                    />
                    <KpiCard
                        title="Impressions"
                        value={overview ? formatNumber(overview.impressions || 0) : '0'}
                        loading={loading}
                        Icon={MagnifyingGlassIcon}
                        change={calculateChange(overview?.impressions, priorOverview?.impressions)}
                        isPositive={overview?.impressions >= priorOverview?.impressions}
                        changeText="visibility surge"
                        chartData={timeseries.map(d => d.impressions).slice(-10)}
                    />
                    <KpiCard
                        title="CTR Node"
                        value={overview ? `${((overview.ctr || 0) * 100).toFixed(2)}%` : '0%'}
                        loading={loading}
                        Icon={ChartBarIcon}
                        change={calculateChange(overview?.ctr, priorOverview?.ctr)}
                        isPositive={overview?.ctr >= priorOverview?.ctr}
                        changeText="click efficiency"
                    />
                    <KpiCard
                        title="Avg. Position"
                        value={overview ? (overview.position || 0).toFixed(1) : '0.0'}
                        loading={loading}
                        Icon={InformationCircleIcon}
                        change={calculateChange(priorOverview?.position, overview?.position)}
                        isPositive={overview?.position <= priorOverview?.position}
                        changeText="rank delta"
                    />
                </div>

                {/* ADD 2 — Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'Total Queries', value: formatNumber(totalQueries), icon: <MagnifyingGlassIcon className="w-5 h-5 text-blue-500" />, insight: intelligence?.kpiQueries },
                        { label: 'Avg CTR', value: `${avgCTR}%`, icon: <CursorArrowRaysIcon className="w-5 h-5 text-emerald-500" />, insight: intelligence?.kpiCtr },
                        { label: 'Top Position', value: topPosition, icon: <ChartBarIcon className="w-5 h-5 text-purple-500" />, insight: intelligence?.kpiPosition }
                    ].map((card, idx) => (
                        <div key={idx} className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 shadow-sm group hover:border-brand-500/30 transition-all flex flex-col">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-center border border-neutral-100 dark:border-neutral-700/50 group-hover:scale-110 transition-transform">
                                    {card.icon}
                                </div>
                                <div>
                                    <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                                        {loading ? <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /> : card.value}
                                    </div>
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">{card.label}</div>
                                </div>
                            </div>
                            {card.insight && !loading && (
                                <p className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 leading-relaxed italic border-t border-neutral-50 dark:border-neutral-800 pt-2 mt-auto">
                                    "{card.insight}"
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Performance Resonance Section */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[450px] group relative">
                    <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-blue-500/5">
                        <div>
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Search Performance resonance</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">{presetLabels[preset] || 'Custom Range'}</p>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center gap-2">
                             <button
                                onClick={() => openWithQuestion(`Analyze my GSC clicks and impressions trend. Clicks: ${overview?.clicks || 0}, Impressions: ${overview?.impressions || 0}, CTR: ${((overview?.ctr || 0) * 100).toFixed(2)}%. What patterns do you see?`)}
                                className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                            <div className="w-10 h-10 flex items-center justify-center bg-blue-500 rounded-xl">
                                <ChartBarIcon className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-8 min-h-[350px]">
                        {loading ? (
                            <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                        ) : timeseries.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <>
                            <ResponsiveContainer width="100%" height={350}>
                                <AreaChart data={timeseries} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} 
                                        dy={10} 
                                    />
                                    <YAxis 
                                        yAxisId="left"
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#3B82F6', fontWeight: 'bold' }} 
                                        tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} 
                                    />
                                    <YAxis 
                                        yAxisId="right"
                                        orientation="right"
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#10B981', fontWeight: 'bold' }} 
                                        tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} 
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: '16px', 
                                            border: 'none', 
                                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                            background: document.documentElement.classList.contains('dark') ? '#111827' : 'rgba(255, 255, 255, 0.95)',
                                            padding: '12px',
                                            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                        }} 
                                        itemStyle={{ fontWeight: '900', fontSize: '12px' }} 
                                    />
                                    <Area yAxisId="left" type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" name="Clicks" strokeLinecap="round" />
                                    <Area yAxisId="right" type="monotone" dataKey="impressions" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorImpressions)" name="Impressions" strokeLinecap="round" strokeDasharray="5 3" />
                                </AreaChart>
                            </ResponsiveContainer>
                            <div className="flex items-center gap-6 mt-3 px-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"/>Clicks
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                                    <div className="w-3 h-3 rounded-sm bg-green-500 border border-green-200 border-dashed"/>Impressions
                                </div>
                            </div>
                            </>
                        )}
                    </div>
                    <div className="px-8 pb-8">
                        <SectionAiSummary 
                            insight={intelligence?.traffic} 
                            loading={loading} 
                            sectionTitle="AI PERFORMANCE INSIGHT"
                        />
                    </div>
                </div>

                {/* ADD 3 — CTR Trend + Position Trend charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* CTR Trend */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">CTR Trend</h3>
                            <AiSectionChat
                                sectionTitle="GSC - CTR Trend"
                                contextPrompt={`My Google Search Console CTR is ${((overview?.ctr || 0) * 100).toFixed(2)}% with ${overview?.clicks || 0} clicks from ${overview?.impressions || 0} impressions. Is this CTR good? How can I improve it?`}
                                activeSources={['gsc']}
                            />
                        </div>
                        <p className="text-xs text-neutral-400 mb-4">Click-through rate over time</p>
                        {loading ? (
                            <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>
                        ) : ctrTrend.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <ResponsiveContainer width="100%" height={190}>
                                <AreaChart data={ctrTrend} margin={{top:5, right:10, left:-20, bottom:0}}>
                                    <defs>
                                        <linearGradient id="ctrGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" className="dark:stroke-neutral-800/20"/>
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}}/>
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}} tickFormatter={v=>`${v}%`}/>
                                    <Tooltip 
                                        formatter={v=>[`${v}%`, 'CTR']} 
                                        contentStyle={{
                                            borderRadius:'12px', 
                                            border:'none', 
                                            fontSize:'12px',
                                            background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="ctr" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#ctrGrad)" name="CTR %" dot={false}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Position Trend */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">Position Trend</h3>
                            <div className="flex items-center gap-2">
                                <AiSectionChat
                                    sectionTitle="GSC - Ranking Position Trend"
                                    contextPrompt={`My average Google Search Console ranking position is #${(overview?.position || 0).toFixed(1)}. What's a good average position benchmark? What actions can I take to improve my rankings?`}
                                    activeSources={['gsc']}
                                />
                                <span className="text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full border border-amber-100 dark:border-amber-800">Lower = Better</span>
                            </div>
                        </div>
                        <p className="text-xs text-neutral-400 mb-4">Average ranking position over time</p>
                        {loading ? (
                            <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>
                        ) : positionTrend.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <ResponsiveContainer width="100%" height={190}>
                                <LineChart data={positionTrend} margin={{top:5, right:10, left:-20, bottom:0}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" className="dark:stroke-neutral-800/20"/>
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}}/>
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}} reversed={true} domain={[1, 'auto']}/>
                                    <Tooltip 
                                        formatter={v=>[`#${v}`, 'Position']} 
                                        contentStyle={{
                                            borderRadius:'12px', 
                                            border:'none', 
                                            fontSize:'12px',
                                            background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                        }}
                                    />
                                    <Line type="monotone" dataKey="position" stroke="#F59E0B" strokeWidth={2.5} dot={false} name="Avg Position"/>
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* ADD 4 — Keyword Opportunities Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Low CTR Opportunities */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">💡 CTR Opportunities</h3>
                            <AiSectionChat
                                sectionTitle="GSC - CTR Opportunities"
                                contextPrompt={`I have ${opportunities.length} keywords with high impressions but low CTR (under 5%). Top ones: ${opportunities.slice(0,3).map(q => `"${q.query}" (${formatNumber(q.impressions)} impr, ${(q.ctr*100).toFixed(1)}% CTR)`).join(', ')}. How should I improve the CTR for these keywords?`}
                                activeSources={['gsc']}
                            />
                        </div>
                        <p className="text-xs text-neutral-400 mb-4">High impressions but low CTR — improve your title &amp; meta description</p>
                        {loading ? (
                            <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>)}</div>
                        ) : opportunities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                <div className="text-3xl mb-2">🎉</div>
                                <p className="text-xs font-semibold">No low-CTR keywords found</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {opportunities.map((q,i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-neutral-800 dark:text-white truncate">{q.query}</div>
                                            <div className="text-[11px] text-neutral-400 mt-0.5">{formatNumber(q.impressions)} impressions • pos #{q.position?.toFixed(1)}</div>
                                        </div>
                                        <div className="text-right ml-3">
                                            <div className="text-xs font-black text-amber-600 dark:text-amber-400">{(q.ctr * 100).toFixed(1)}% CTR</div>
                                            <div className="text-[11px] text-neutral-400">{q.clicks} clicks</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Near Page 1 */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">🚀 Close to Page 1</h3>
                            <AiSectionChat
                                sectionTitle="GSC - Near Page 1 Keywords"
                                contextPrompt={`I have ${nearPageOne.length} keywords ranking between positions 8-20 that are close to reaching page 1. Keywords: ${nearPageOne.slice(0,3).map(q => `"${q.query}" at pos #${q.position?.toFixed(1)}`).join(', ')}. What specific SEO strategies should I use to push these to page 1?`}
                                activeSources={['gsc']}
                            />
                        </div>
                        <p className="text-xs text-neutral-400 mb-4">Keywords ranking 8–20 — small push could reach page 1</p>
                        {loading ? (
                            <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>)}</div>
                        ) : nearPageOne.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                <div className="text-3xl mb-2">🎯</div>
                                <p className="text-xs font-semibold">No near-page-1 keywords</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {nearPageOne.map((q,i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/30">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-neutral-800 dark:text-white truncate">{q.query}</div>
                                            <div className="text-[11px] text-neutral-400 mt-0.5">{formatNumber(q.impressions)} impressions • {q.clicks} clicks</div>
                                        </div>
                                        <div className="text-right ml-3">
                                            <div className="text-xs font-black text-green-600 dark:text-green-400">Pos #{q.position?.toFixed(1)}</div>
                                            <div className="text-[11px] text-neutral-400">{(q.ctr * 100).toFixed(1)}% CTR</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub-Reports (Queries & Pages) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4 text-brand-500" />
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Queries</h3>
                            </div>
                            <AiSectionChat
                                sectionTitle="GSC - Top Search Queries"
                                contextPrompt={`My top GSC search queries are: ${queries.slice(0,5).map(q => `"${q.query}" (${q.clicks} clicks, pos #${q.position?.toFixed(1)})`).join(', ')}. Which queries should I focus on for content optimization?`}
                                activeSources={['gsc']}
                            />
                        </div>
                        <div className="p-0">
                            <DataTable columns={queryColumns} data={filteredQueries} loading={loading} initialLimit={5} />
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <GlobeAltIcon className="w-4 h-4 text-brand-500" />
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Landing Pages</h3>
                            </div>
                            <AiSectionChat
                                sectionTitle="GSC - Top Landing Pages"
                                contextPrompt={`My top GSC landing pages are: ${pages.slice(0,5).map(p => `${p.page} (${p.clicks} clicks, ${p.impressions} impressions)`).join(', ')}. Which pages have the biggest SEO improvement potential?`}
                                activeSources={['gsc']}
                            />
                        </div>
                        <div className="p-0">
                            <DataTable columns={pageColumns} data={filteredPages} loading={loading} initialLimit={5} />
                        </div>
                    </div>
                </div>

                {/* ADD 7 — Impressions Breakdown Bar Chart */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-[2.5rem] p-8 shadow-sm group">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Daily Impression Volume</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Search visibility density per interval</p>
                        </div>
                        <AiSectionChat
                            sectionTitle="GSC - Daily Impression Volume"
                            contextPrompt={`My total GSC impressions are ${formatNumber(overview?.impressions || 0)} for this period. Are there any significant dips or spikes I should be concerned about? What does impression volume indicate about my SEO health?`}
                            activeSources={['gsc']}
                        />
                    </div>
                    <div className="h-[250px]">
                        {loading ? (
                            <div className="w-full h-full animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-3xl"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={timeseries}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF', fontWeight:'bold'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF', fontWeight:'bold'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} 
                                        contentStyle={{
                                            borderRadius:'15px', 
                                            border:'none', 
                                            boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                        }} 
                                    />
                                    <Bar dataKey="impressions" fill="#3B82F6" radius={[6,6,0,0]} name="Impressions" fillOpacity={0.8} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* ADD 5 — Period Comparison Table */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Period Comparison</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">This period vs last period — all key metrics</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AiSectionChat
                          sectionTitle="GSC - Period Comparison"
                          contextPrompt={`Compare my GSC performance: Clicks ${overview?.clicks || 0} vs prior ${priorOverview?.clicks || 0}, Impressions ${overview?.impressions || 0} vs ${priorOverview?.impressions || 0}, CTR ${((overview?.ctr||0)*100).toFixed(2)}% vs ${((priorOverview?.ctr||0)*100).toFixed(2)}%. What's the biggest improvement or decline, and what caused it?`}
                          activeSources={['gsc']}
                      />
                      <span className="text-xs font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800">
                        vs Last Period
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-neutral-100 dark:border-neutral-800">
                          <tr>
                            {['Metric', 'This Period', 'Last Period', 'Change'].map(h => (
                                <th key={h} className="pb-3 text-left text-[11px] font-black uppercase tracking-wider text-neutral-400 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            Array(4).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={4} className="py-3"><div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"></div></td>
                                </tr>
                            ))
                          ) : (
                            comparison.map((row, i) => (
                                <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                  <td className="py-3 text-xs font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{row.metric}</td>
                                  <td className="py-3 text-xs font-black text-neutral-900 dark:text-white tabular-nums">
                                    {typeof row.current === 'number' ? row.current.toLocaleString() : row.current}
                                  </td>
                                  <td className="py-3 text-xs text-neutral-400 tabular-nums">
                                    {typeof row.prior === 'number' ? row.prior.toLocaleString() : row.prior}
                                  </td>
                                  <td className="py-3">
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${
                                      row.up
                                        ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                        : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                    }`}>
                                      {row.up ? '▲' : '▼'} {Math.abs(row.change)}%
                                    </span>
                                  </td>
                                </tr>
                            ))
                          )}
                        </tbody>
                    </table>
                  </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default GscPage;
