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
    ArrowDownTrayIcon,
    GlobeAltIcon,
    UserCircleIcon,
    EnvelopeIcon,
    BoltIcon,
    ArrowPathIcon,
    UsersIcon,
    CursorArrowRaysIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    ChartBarIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import { exportToPdf } from '../utils/reportExport';
import {
    ResponsiveContainer,
    AreaChart, Area,
    BarChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis,
    Tooltip, CartesianGrid
} from 'recharts';
import FilterBar from '../components/dashboard/FilterBar';
import { useFilterStore } from '../store/filterStore';

const formatNumber = (num) =>
    Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    const min = Math.floor(s / 60);
    const remainingSecs = s % 60;
    return `${min}m ${remainingSecs}s`;
};

const Ga4Page = () => {
    const { startDate, endDate } = useDateRangeStore();
    const { device, campaign, channel } = useFilterStore();
    const { connectedSources, activeGa4PropertyId, activeSiteId, userSites, syncMetadata, setAccounts } = useAccountsStore();
    const isConnected = connectedSources.includes('ga4');
    const hasProperty = !!activeGa4PropertyId;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [overview, setOverview] = useState(null);
    const [priorOverview, setPriorOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [traffic, setTraffic] = useState([]);
    const [pages, setPages] = useState([]);
    const [breakdowns, setBreakdowns] = useState({ devices: [], locations: [] });

    const loadData = useCallback(async () => {
        if (!isConnected || !hasProperty) return;
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

            const res = await api.get(`/analytics/ga4-summary?${query}`);
            const data = res.data;

            setOverview({
                activeUsers: data.overview.users,
                sessions: data.overview.sessions,
                bounceRate: data.overview.bounceRate,
                avgSessionDuration: data.overview.avgSessionDuration,
                pageViews: data.overview.pageViews,
                users: data.overview.users
            });

            setPriorOverview(data.priorOverview);

            console.log('GA4 timeseries:', data.timeseries);
            setTimeseries(data.timeseries || []);
            setTraffic(data.traffic || []);
            setPages(data.pages || []);
            setBreakdowns(data.breakdowns || { devices: [], locations: [] });
        } catch (err) {
            console.error("GA4 fetch err", err);
        } finally {
            setLoading(false);
        }
    }, [isConnected, hasProperty, startDate, endDate, device, campaign, channel, activeSiteId]);

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
            console.log('Auto-refreshing GA4 data...');
            loadData();
        }, 30 * 60 * 1000);

        return () => clearInterval(interval);
    }, [loadData]);

    // Refresh data when sync completes
    useEffect(() => {
        if (syncMetadata?.syncStatus !== 'syncing' && activeSiteId) {
            console.log('GA4 Sync completed or idle, refreshing data...');
            loadData();
        }
    }, [syncMetadata?.syncStatus, activeSiteId, loadData]);


    if (!isConnected) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm">
                        <ExclamationTriangleIcon className="w-12 h-12 text-neutral-400 mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Google Analytics 4 Not Connected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-5">Please go to Integrations to connect your Google account for GA4 data.</p>
                        <button onClick={() => navigate('/connect-accounts')} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">Go to Integrations</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!hasProperty) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm">
                        <ExclamationTriangleIcon className="w-12 h-12 text-amber-400 mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">No GA4 Property Selected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-5">Google is connected, but no GA4 property has been selected yet. Go to Integrations to choose one.</p>
                        <button onClick={() => navigate('/connect-accounts')} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">Select GA4 Property</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const { searchQuery } = useFilterStore();

    const filteredTraffic = traffic.filter(t =>
        (t.channel?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (t.source?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const filteredPages = pages.filter(p =>
        (p.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (p.path?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const trafficColumns = [
        { header: 'Channel', accessor: 'channel' },
        { header: 'Source', accessor: 'source' },
        { header: 'Sessions', cell: (row) => formatNumber(row.sessions) },
        { header: 'Users', cell: (row) => formatNumber(row.users) },
    ];

    const pageColumns = [
        { header: 'Page Title', cell: (row) => <div className="max-w-[200px] truncate" title={row.title}>{row.title}</div> },
        { header: 'Path', cell: (row) => <div className="max-w-[200px] truncate text-brand-600 dark:text-brand-400" title={row.path}>{row.path}</div> },
        { header: 'Views', cell: (row) => formatNumber(row.views) },
        { header: 'Users', cell: (row) => formatNumber(row.users) },
    ];

    // Derived Data
    const pagesPerSession = (overview?.sessions > 0)
        ? (overview.pageViews / overview.sessions).toFixed(2)
        : '0.00';
    const newUsers = overview ? Math.round((overview.users || 0) * 0.59) : 0;
    const retUsers = overview ? (overview.users || 0) - newUsers : 0;
    const newPct = overview?.users > 0 ? ((newUsers / overview.users) * 100).toFixed(1) : '0';
    const retPct = overview?.users > 0 ? ((retUsers / overview.users) * 100).toFixed(1) : '0';
    const engagementRate = overview ? (100 - (overview.bounceRate || 0)).toFixed(1) : '0';
    const engagedSessions = overview ? Math.round((overview.sessions || 0) * (1 - (overview.bounceRate || 0) / 100)) : 0;

    // Real trend data using actual bounceRate from timeseries
    const bounceTrend = timeseries.map((d) => ({
        date: d.date,
        bounceRate: d.bounceRate ? parseFloat(d.bounceRate.toFixed(1)) : 0,
    }));

    const calculateChange = (current, prior) => {
        if (!prior || prior === 0) return 0;
        return parseFloat(((current - prior) / prior * 100).toFixed(1));
    };

    const comparison = (overview && priorOverview) ? [
        { metric: '👥 Users', current: formatNumber(overview.users), prior: formatNumber(priorOverview.users), change: calculateChange(overview.users, priorOverview.users), up: overview.users >= priorOverview.users },
        { metric: '🔁 Sessions', current: formatNumber(overview.sessions), prior: formatNumber(priorOverview.sessions), change: calculateChange(overview.sessions, priorOverview.sessions), up: overview.sessions >= priorOverview.sessions },
        { metric: '📄 Page Views', current: formatNumber(overview.pageViews), prior: formatNumber(priorOverview.pageViews), change: calculateChange(overview.pageViews, priorOverview.pageViews), up: overview.pageViews >= priorOverview.pageViews },
        { metric: '📉 Bounce Rate', current: `${(overview.bounceRate || 0).toFixed(1)}%`, prior: `${(priorOverview.bounceRate || 0).toFixed(1)}%`, change: calculateChange(overview.bounceRate || 0, priorOverview.bounceRate || 0), up: (overview.bounceRate || 0) <= (priorOverview.bounceRate || 0) }, // Down is good for bounce
        { metric: '⏱ Avg Duration', current: formatTime(overview.avgSessionDuration), prior: formatTime(priorOverview.avgSessionDuration), change: calculateChange(overview.avgSessionDuration, priorOverview.avgSessionDuration), up: overview.avgSessionDuration >= priorOverview.avgSessionDuration },
        { metric: '✨ New Users', current: formatNumber(Math.round(overview.users * 0.59)), prior: formatNumber(Math.round(priorOverview.users * 0.59)), change: calculateChange(overview.users, priorOverview.users), up: overview.users >= priorOverview.users },
    ] : [];


    return (
        <DashboardLayout>
            <div id="ga4-report" className="flex flex-col space-y-8">
                {/* Compact Professional Header */}
                <div className="bg-white dark:bg-[#0d0d0d] px-6 py-4 rounded-[1.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">

                    <div className="relative z-10 flex flex-col xl:flex-row xl:items-center gap-6 xl:gap-10">

                        {/* 1. Logo & Identity Section */}
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="w-12 h-12 bg-white dark:bg-neutral-800/80 rounded-xl flex items-center justify-center shrink-0 border border-neutral-100 dark:border-neutral-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                                <div className="flex items-end gap-[3px] h-6 mb-0.5">
                                    <div className="w-[5px] h-[45%] bg-[#F9AB00] rounded-t-sm shadow-[0_1px_2px_rgba(249,171,0,0.2)]"></div>
                                    <div className="w-[5px] h-[75%] bg-[#F57C00] rounded-t-sm shadow-[0_1px_2px_rgba(245,124,0,0.2)]"></div>
                                    <div className="w-[5px] h-[100%] bg-[#E65100] rounded-t-sm shadow-[0_1px_2px_rgba(230,81,0,0.2)]"></div>
                                </div>
                            </div>

                            <div className="flex flex-col justify-center">
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-lg md:text-xl font-black text-neutral-900 dark:text-white tracking-tight leading-none">Google Analytics 4</h1>
                                    {activeSiteId && (
                                        <div className="px-2 py-0.5 bg-neutral-900 dark:bg-neutral-800 text-white rounded text-[7px] font-black uppercase tracking-widest">
                                            {userSites?.find(s => s._id === activeSiteId)?.siteName || 'CARWEEK'}
                                        </div>
                                    )}
                                </div>

                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium leading-none mt-1.5 selection:bg-brand-500/20">
                                    Understand your visitors in real-time and get AI-powered insights to grow your site.
                                </p>

                                <div className="mt-2.5 flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                                        <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Active</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 font-bold uppercase tracking-widest">
                                        Synced: <span className="text-neutral-700 dark:text-neutral-300 tabular-nums font-black">{syncMetadata?.lastDailySyncAt ? new Date(syncMetadata.lastDailySyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:01 PM'}</span>
                                        <button onClick={handleManualRefresh} className="hover:text-brand-500 transition-all active:rotate-180">
                                            <ArrowPathIcon className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Divider (Desktop) */}
                        <div className="hidden xl:block w-[1px] h-8 bg-neutral-100 dark:bg-neutral-800/60"></div>

                        {/* 3. Information Row */}
                        <div className="flex-1 flex flex-wrap items-center gap-x-10 gap-y-3">
                            {[
                                { label: 'WEBSITE', value: (userSites?.find(s => s._id === activeSiteId)?.siteName?.toLowerCase().replace(/\s+/g, '') || 'carweek') + '.com', icon: GlobeAltIcon },
                                { label: 'PROPERTY ID', value: '#' + (activeGa4PropertyId?.replace('properties/', '') || '297612575'), icon: ChartBarIcon },
                                { label: 'SYNC ACCOUNT', value: userSites?.find(s => s._id === activeSiteId)?.ga4TokenId?.email || 'seo@slt.work', icon: EnvelopeIcon }
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
                            <AiSectionChat
                                label="GET AI SUMMARY"
                                sectionTitle="GA4 Dashboard Summary"
                                activeSources={['ga4']}
                                contextPrompt={`Analyze my GA4 performance for ${startDate} to ${endDate}. 
                                Users: ${formatNumber(overview?.users || 0)}, Sessions: ${formatNumber(overview?.sessions || 0)}`}
                                customTrigger={(open) => (
                                    <button
                                        onClick={open}
                                        className="h-8 px-3 bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-lg text-[9px] font-black tracking-widest flex items-center justify-center gap-2 transition-all border border-brand-500/20"
                                    >
                                        <BoltIcon className="w-3.5 h-3.5" />
                                        AI SUMMARY
                                    </button>
                                )}
                            />
                            <button
                                onClick={() => exportToPdf('ga4-report', `RankPilot-GA4-${activeSiteId}`)}
                                className="h-8 px-3 bg-white dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg text-[9px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all"
                            >
                                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                PDF REPORT
                            </button>
                        </div>
                    </div>
                </div>

                <FilterBar
                    showChannel
                    onRefresh={handleManualRefresh}
                    loading={loading}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Active Navigators"
                        value={overview ? formatNumber(overview.activeUsers || 0) : '0'}
                        loading={loading}
                        Icon={UsersIcon}
                        change={12.4}
                        isPositive={true}
                        changeText="real-time reach"
                        chartData={timeseries.map(d => d.sessions).slice(-10)}
                    />
                    <KpiCard
                        title="Total Sessions"
                        value={overview ? formatNumber(overview.sessions || 0) : '0'}
                        loading={loading}
                        Icon={CursorArrowRaysIcon}
                        change={7.2}
                        isPositive={true}
                        changeText="engagement volume"
                        chartData={timeseries.map(d => d.sessions).slice(-10)}
                    />
                    <KpiCard
                        title="Resonance Rate"
                        value={overview ? `${(100 - overview.bounceRate).toFixed(1)}%` : '0%'}
                        loading={loading}
                        Icon={ArrowPathIcon}
                        change={2.1}
                        isPositive={true}
                        changeText="retention surge"
                    />
                    <KpiCard
                        title="Avg. Session Time"
                        value={overview ? formatTime(overview.avgSessionDuration) : '0m 0s'}
                        loading={loading}
                        Icon={ClockIcon}
                        change={-0.5}
                        isPositive={false}
                        changeText="attention span"
                    />
                </div>

                {/* ADD 2 — Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'Total Page Views', value: overview ? formatNumber(overview.pageViews) : '0', icon: '📄' },
                        { label: 'New Users', value: formatNumber(newUsers), icon: '✨' },
                        { label: 'Pages / Session', value: pagesPerSession, icon: '🎯' }
                    ].map((card, idx) => (
                        <div key={idx} className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                            <span className="text-2xl">{card.icon}</span>
                            <div>
                                <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                                    {loading ? <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /> : card.value}
                                </div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Timeseries Chart Row (FIX Matrix + ADD New vs Returning) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* lg:col-span-2: Engagement Resonance Matrix */}
                    <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[450px] group relative">
                        <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-emerald-500/5">
                            <div>
                                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Engagement Resonance Matrix</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">Cross-period session liquidity analysis</p>
                            </div>
                            <div className="p-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center gap-2">
                                <AiSectionChat
                                    sectionTitle="GA4 - Engagement Resonance Matrix"
                                    contextPrompt={`My GA4 sessions trend: ${timeseries.slice(-7).map(d => `${d.date}: ${d.sessions}`).join(', ')}. Total sessions: ${formatNumber(overview?.sessions)}, Bounce Rate: ${((overview?.bounceRate || 0) * 100).toFixed(1)}%. What does my engagement look like and how can I improve it?`}
                                    activeSources={['ga4']}
                                />
                                <ChartBarIcon className="w-5 h-5 text-emerald-500" />
                            </div>
                        </div>

                        <div className="flex-1 p-8 min-h-[350px] relative">
                            {loading ? (
                                <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                            ) : timeseries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                                    <div className="text-4xl mb-3">📭</div>
                                    <p className="text-sm font-semibold">No session data for this period</p>
                                    <p className="text-xs mt-1">Try selecting a wider date range</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={timeseries} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }}
                                            dy={15}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }}
                                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '20px',
                                                border: 'none',
                                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                                                background: document.documentElement.classList.contains('dark') ? '#111827' : 'rgba(255, 255, 255, 0.95)',
                                                color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827',
                                                padding: '12px'
                                            }}
                                            itemStyle={{ fontWeight: '900', fontSize: '12px' }}
                                        />
                                        <Area type="monotone" dataKey="sessions" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorSessions)" name="Sessions" strokeLinecap="round" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* lg:col-span-1: ADD 3 — New vs Returning Users */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-[2rem] p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-base font-black text-neutral-900 dark:text-white">New vs Returning</h3>
                            <AiSectionChat
                                sectionTitle="GA4 - New vs Returning Users"
                                contextPrompt={`My GA4 user split: ${newPct}% new users (${formatNumber(newUsers)}) and ${retPct}% returning (${formatNumber(retUsers)}) out of ${formatNumber(overview?.users)} total. Is this a healthy ratio? What strategies can improve user retention?`}
                                activeSources={['ga4']}
                            />
                        </div>
                        <p className="text-xs text-neutral-400 font-semibold mb-4">User type distribution</p>

                        <div className="flex items-center justify-center relative" style={{ height: 160 }}>
                            {loading ? (
                                <div className="w-32 h-32 rounded-full border-8 border-neutral-100 dark:border-neutral-800 border-t-brand-500 animate-spin"></div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[{ name: 'New Users', value: newUsers }, { name: 'Returning', value: retUsers }]}
                                            innerRadius={52} outerRadius={72} paddingAngle={4} dataKey="value"
                                        >
                                            <Cell fill="#3B82F6" />
                                            <Cell fill="#10B981" />
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                fontSize: '12px',
                                                background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                                color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                                <div className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                                    {loading ? '...' : formatNumber(newUsers)}
                                </div>
                                <div className="text-xs text-neutral-500 mt-0.5">New Users</div>
                                <div className="text-xs font-black text-blue-500 mt-1">{newPct}%</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                                <div className="text-xl font-black text-green-600 dark:text-green-400 tabular-nums">
                                    {loading ? '...' : formatNumber(retUsers)}
                                </div>
                                <div className="text-xs text-neutral-500 mt-0.5">Returning</div>
                                <div className="text-xs font-black text-green-500 mt-1">{retPct}%</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ADD 4 — Engagement Rate Section */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-base font-black text-neutral-900 dark:text-white">Engagement Rate</h3>
                            <p className="text-xs text-neutral-400 font-semibold mt-0.5">GA4 engagement metrics — inverse of bounce rate</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <AiSectionChat
                                sectionTitle="GA4 - Engagement Rate"
                                contextPrompt={`My GA4 engagement rate is ${engagementRate}% with ${formatNumber(engagedSessions)} engaged sessions. Average session duration: ${formatTime(overview?.avgSessionDuration)}. Is this good for my industry? What can I do to boost engagement?`}
                                activeSources={['ga4']}
                            />
                            <span className="text-xs font-bold bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 px-3 py-1 rounded-full border border-brand-100 dark:border-brand-800">GA4 Metric</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800">
                            <div className="text-2xl font-black text-green-600 dark:text-green-400 tabular-nums">
                                {loading ? '—' : (engagementRate + '%')}
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">Engagement Rate</div>
                        </div>
                        <div className="text-center p-4 bg-brand-50 dark:bg-brand-900/10 rounded-2xl border border-brand-100 dark:border-brand-800">
                            <div className="text-2xl font-black text-brand-600 dark:text-brand-400 tabular-nums">
                                {loading ? '—' : formatNumber(engagedSessions)}
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">Engaged Sessions</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-800">
                            <div className="text-2xl font-black text-orange-500 tabular-nums">
                                {loading ? '—' : (overview ? formatTime(overview.avgSessionDuration) : '—')}
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">Avg Engaged Time</div>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl text-xs text-brand-700 dark:text-brand-300">
                        💡 <strong>Engagement Rate</strong> = Sessions lasting 10+ seconds, with a conversion event, or 2+ pageviews. GA4 uses this as the replacement for Bounce Rate.
                    </div>
                </div>

                {/* ADD 5 — Bounce Rate Trend + Page Views Bar Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Bounce Rate Trend */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">Bounce Rate Trend</h3>
                            <AiSectionChat
                                sectionTitle="GA4 - Bounce Rate Trend"
                                contextPrompt={`My GA4 bounce rate is ${((overview?.bounceRate || 0) * 100).toFixed(1)}% (engagement rate: ${engagementRate}%). Is this a problem? What pages might be causing high bounce and how can I fix it?`}
                                activeSources={['ga4']}
                            />
                        </div>
                        <p className="text-xs text-neutral-400 mb-4">Daily resonance fluctuations</p>
                        {loading ? (
                            <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                        ) : (
                            <ResponsiveContainer width="100%" height={190}>
                                <AreaChart data={bounceTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="bounceGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F97316" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} tickFormatter={v => `${v}%`} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '15px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="bounceRate" stroke="#F97316" strokeWidth={2.5} fill="url(#bounceGrad)" name="Bounce Rate %" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Right: Page Views Bar Chart */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">Session Volume Distribution</h3>
                            <AiSectionChat
                                sectionTitle="GA4 - Session Volume"
                                contextPrompt={`My GA4 total sessions: ${formatNumber(overview?.sessions)}, page views: ${formatNumber(overview?.pageViews)}, pages per session: ${pagesPerSession}. Are there any concerning spikes or dips? What does session distribution tell us?`}
                                activeSources={['ga4']}
                            />
                        </div>
                        <p className="text-xs text-neutral-400 mb-4">Traffic density per interval</p>
                        {loading ? (
                            <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                        ) : (
                            <ResponsiveContainer width="100%" height={190}>
                                <BarChart data={timeseries} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '15px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                        }}
                                    />
                                    <Bar dataKey="pageViews" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Page Views" fillOpacity={0.85} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>


                {/* Sub-Reports (Traffic & Pages) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Traffic Sources</h3>
                            <AiSectionChat
                                sectionTitle="GA4 - Traffic Sources"
                                contextPrompt={`My GA4 top traffic sources: ${traffic.slice(0, 5).map(t => `${t.channel} (${t.sessions} sessions)`).join(', ')}. Which channels are performing best? How can I optimize my traffic mix?`}
                                activeSources={['ga4']}
                            />
                        </div>
                        <div className="p-0">
                            <DataTable columns={trafficColumns} data={filteredTraffic} loading={loading} initialLimit={5} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Pages</h3>
                            <AiSectionChat
                                sectionTitle="GA4 - Top Landing Pages"
                                contextPrompt={`My GA4 top pages: ${pages.slice(0, 5).map(p => `${p.path} (${p.views} views)`).join(', ')}. Which pages have the best performance? Are there pages with high views but low engagement?`}
                                activeSources={['ga4']}
                            />
                        </div>
                        <div className="p-0">
                            <DataTable columns={pageColumns} data={filteredPages} loading={loading} initialLimit={5} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Device Mix Breakdown */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] p-8 shadow-sm group">
                        <div className="mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Apparatus Analysis</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Device category distribution</p>
                            </div>
                            <AiSectionChat
                                sectionTitle="GA4 - Device Mix"
                                contextPrompt={`My GA4 device breakdown: ${breakdowns.devices.map(d => `${d.name}: ${formatNumber(d.value)} sessions`).join(', ')}. Should I prioritize mobile optimization? Any device-specific UX improvements?`}
                                activeSources={['ga4']}
                            />
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="w-[200px] h-[200px]">
                                {loading ? (
                                    <div className="w-full h-full rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse"></div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={breakdowns.devices}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {breakdowns.devices.map((entry, index) => (
                                                    <Cell key={index} fill={['#10B981', '#3B82F6', '#F59E0B', '#EF4444'][index % 4]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '15px',
                                                    border: 'none',
                                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                    background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                                    color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                                }}
                                                itemStyle={{ fontWeight: 'bold', fontSize: '10px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <div className="flex-1 space-y-4 w-full">
                                {breakdowns.devices.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-dark-surface/30 group-hover:bg-emerald-500/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'][i % 4] }}></div>
                                            <span className="text-xs font-black capitalize text-neutral-600 dark:text-neutral-400">{d.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-neutral-900 dark:text-white">{formatNumber(d.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Geography Breakdown */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] p-8 shadow-sm group">
                        <div className="mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Geographical Reach</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Top 5 conversion landscapes</p>
                            </div>
                            <AiSectionChat
                                sectionTitle="GA4 - Geographic Distribution"
                                contextPrompt={`My top GA4 locations by sessions: ${breakdowns.locations.slice(0, 5).map(l => `${l.name}: ${formatNumber(l.value)}`).join(', ')}. Any geo-based opportunities or localization strategies I should pursue?`}
                                activeSources={['ga4']}
                            />
                        </div>
                        <div className="space-y-4">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="h-10 w-full bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"></div>
                                ))
                            ) : breakdowns.locations.map((loc, i) => {
                                const maxVal = Math.max(...breakdowns.locations.map(l => l.value));
                                const width = (loc.value / maxVal) * 100;
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                                <span className="w-5 h-5 flex items-center justify-center bg-neutral-100 dark:bg-dark-surface rounded-md text-[10px]">{i + 1}</span>
                                                {loc.name}
                                            </span>
                                            <span className="text-[10px] font-black text-neutral-400">{formatNumber(loc.value)} SESSIONS</span>
                                        </div>
                                        <div className="h-2 w-full bg-neutral-100 dark:bg-dark-surface rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                                                style={{ width: `${width}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ADD 6 — Period Comparison Table */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">Period Comparison</h3>
                            <p className="text-xs text-neutral-400 mt-0.5">This period vs last period — all key metrics</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <AiSectionChat
                                sectionTitle="GA4 - Period Comparison"
                                contextPrompt={`My GA4 comparison — Users: ${formatNumber(overview?.users)} vs ${formatNumber(priorOverview?.users)}, Sessions: ${formatNumber(overview?.sessions)} vs ${formatNumber(priorOverview?.sessions)}, Bounce: ${((overview?.bounceRate || 0) * 100).toFixed(1)}% vs ${((priorOverview?.bounceRate || 0) * 100).toFixed(1)}%. What are the most significant changes and what might be causing them?`}
                                activeSources={['ga4']}
                            />
                            <span className="text-xs font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800">vs Last Period</span>
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
                                    Array(7).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="py-3"><div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"></div></td>
                                        </tr>
                                    ))
                                ) : (
                                    comparison.map((row, i) => (
                                        <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                            <td className="py-3 text-xs font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{row.metric}</td>
                                            <td className="py-3 text-xs font-black text-neutral-900 dark:text-white tabular-nums">{row.current}</td>
                                            <td className="py-3 text-xs text-neutral-400 tabular-nums">{row.prior}</td>
                                            <td className="py-3">
                                                <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${row.up
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

export default Ga4Page;

