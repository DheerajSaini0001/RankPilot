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

const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (num) => Number(num).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const DashboardPage = () => {
    const navigate = useNavigate();
    const { preset, startDate, endDate } = useDateRangeStore();
    const { device, campaign, channel } = useFilterStore();
    const { connectedSources, activeGscSite, syncMetadata, setAccounts, activeSiteId } = useAccountsStore();
    const [loading, setLoading] = useState(true);
    const [overviewData, setOverviewData] = useState({ ga4: null, gsc: null, googleAds: null, facebookAds: null });
    const [timeseriesData, setTimeseriesData] = useState([]);
    const [topPages, setTopPages] = useState([]);
    const [insights, setInsights] = useState([]);
    const [selectedMetric, setSelectedMetric] = useState('Sessions');
    const [showSummary, setShowSummary] = useState(false);

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

    const handleExecutiveSummary = () => {
        setShowSummary(true);
    };

    useEffect(() => {
        loadDashboardData();
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
                    
                    {/* Hero Section */}
                    <div className="relative overflow-hidden rounded-[2.5rem] bg-neutral-900 dark:bg-dark-surface p-10 text-white shadow-2xl shadow-brand-500/10 group min-h-[260px] flex items-center">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px] group-hover:bg-brand-500/20 transition-all duration-1000"></div>
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-accent-500/10 rounded-full blur-[100px] group-hover:bg-accent-500/20 transition-all duration-1000"></div>
                        
                        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12 w-full">
                            <div className="flex-1 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-6 animate-fade-in text-[10px]">
                                    <span className="w-2 h-2 rounded-full bg-semantic-green-500 animate-pulse"></span>
                                    <span className="font-black uppercase tracking-widest text-brand-100">Quantum Performance Node</span>
                                </div>
                                <h1 className="text-4xl lg:text-6xl font-black tracking-tight mb-4 leading-tight">
                                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, <span className="text-brand-400 capitalize">{user?.name?.split(' ')[0] || 'Pilot'}</span>.
                                </h1>
                                <p className="text-neutral-400 font-medium max-w-xl text-lg leading-relaxed">
                                    Your ecosystem is thriving. Traffic has seen a <span className="text-white font-black underline decoration-brand-500 decoration-4 underline-offset-8">{(trafficGrowth >= 0 ? '+' : '') + trafficGrowth.toFixed(1)}% {trafficGrowth >= 0 ? 'surge' : 'shift'}</span> this period across all connected nodes.
                                </p>
                            </div>

                            <div className="flex items-center gap-10 shrink-0">
                                {/* Health Score Gauge */}
                                <div 
                                    onClick={() => document.getElementById('insights-panel')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="relative w-36 h-36 flex items-center justify-center group/score cursor-pointer hover:scale-105 transition-transform"
                                >
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                                        <circle cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="415" strokeDashoffset={415 - (415 * healthScore) / 100} className="text-brand-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-black text-white leading-none">{healthScore}</span>
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-neutral-400 mt-1">Health</span>
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-semantic-green-500 border-2 border-neutral-900 animate-pulse"></div>
                                </div>

                                <div className="h-24 w-[1px] bg-white/10 hidden lg:block"></div>

                                <div className="flex flex-col gap-4">
                                    <button 
                                        onClick={handleExecutiveSummary}
                                        className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-black shadow-xl shadow-brand-500/20 transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
                                    >
                                        Executive Summary
                                    </button>
                                    <button 
                                        onClick={() => navigate('/settings')}
                                        className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 rounded-2xl text-xs font-black transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
                                    >
                                        Quick Actions
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <FilterBar 
                        onRefresh={loadDashboardData}
                        loading={loading}
                    />

                    {isDataEmpty && !loading && (preset === 'today' || preset === 'yesterday') && (
                        <div className="relative overflow-hidden bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 p-6 rounded-[2.5rem] flex items-center gap-6 animate-shimmer group mt-2">
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
                             <div className="hidden md:block w-32 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-500 w-1/3 animate-shimmer"></div>
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


                    {/* Main Charts & Data Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Chart Section */}
                        <div id="growth-matrix" className="xl:col-span-2 glass-card rounded-[2.5rem] overflow-hidden flex flex-col min-h-[500px]">
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
                                                    <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
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

                        {/* Recent Insights Panel */}
                        <div id="insights-panel" className="glass-card rounded-[2.5rem] p-10 flex flex-col h-full bg-white dark:bg-dark-card relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
                                <ChatBubbleLeftRightIcon className="w-32 h-32 text-brand-500" />
                             </div>
                             <div className="relative z-10 mb-8">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500 mb-2">Intelligence Stream</h3>
                                <h4 className="text-2xl font-black text-neutral-900 dark:text-white">Active Insights</h4>
                             </div>
                             
                             <div className="space-y-6 relative z-10 flex-1">
                                {insights.length > 0 ? insights.map((item, i) => {
                                    const IconNode = {
                                        UsersIcon,
                                        MagnifyingGlassIcon,
                                        CheckCircleIcon,
                                        CloudArrowUpIcon,
                                        BanknotesIcon
                                    }[item.icon] || SparklesIcon;

                                    const colorMap = {
                                        'brand': 'bg-brand-500/10 text-brand-500',
                                        'semantic-green': 'bg-semantic-green-500/10 text-semantic-green-500',
                                        'accent': 'bg-accent-500/10 text-accent-500',
                                        'neutral': 'bg-neutral-500/10 text-neutral-500'
                                    };

                                    const colorClasses = colorMap[item.color] || 'bg-brand-500/10 text-brand-500';

                                    return (
                                        <div key={i} className="flex gap-5 p-5 rounded-3xl hover:bg-neutral-50 dark:hover:bg-dark-surface/50 transition-all group/item cursor-pointer border border-transparent hover:border-neutral-100 dark:hover:border-neutral-800">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover/item:scale-110 transition-transform ${colorClasses.split(' ')[0]}`}>
                                                <IconNode className={`w-6 h-6 ${colorClasses.split(' ')[1]}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <h4 className="text-sm font-black text-neutral-900 dark:text-white truncate">{item.title}</h4>
                                                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter shrink-0">Real-time</span>
                                                </div>
                                                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 leading-relaxed group-hover/item:text-neutral-700 dark:group-hover/item:text-neutral-200 transition-colors">{item.desc}</p>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="flex flex-col items-center justify-center h-48 opacity-40">
                                        <SparklesIcon className="w-12 h-12 mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Awaiting Signals</p>
                                    </div>
                                )}
                             </div>
                             
                             <button 
                                onClick={() => document.getElementById('top-pages-table')?.scrollIntoView({ behavior: 'smooth' })}
                                className="mt-8 py-4 w-full rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 text-xs font-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-dark-surface hover:text-brand-600 transition-all flex items-center justify-center gap-2"
                             >
                                Explore Full Intelligence Feed
                                <ArrowRightIcon className="w-4 h-4" />
                             </button>
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
                </div>

            </div>
        </DashboardLayout>

        {/* Executive Summary Modal Overlay */}
        {showSummary && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40 animate-fade-in">
                <div className="bg-white dark:bg-dark-card w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up border border-white/20">
                    <div className="p-10 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-brand-500/5">
                        <div>
                            <h2 className="text-2xl font-black text-neutral-900 dark:text-white">Executive Intelligence Summary</h2>
                            <p className="text-sm font-bold text-neutral-400 italic">Automated analysis of current period performance</p>
                        </div>
                        <button onClick={() => setShowSummary(false)} className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-dark-bg flex items-center justify-center hover:bg-semantic-rose-500 hover:text-white transition-all">
                            <span className="text-2xl">×</span>
                        </button>
                    </div>
                    <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-500 mb-4">Core Performance</h3>
                            <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300 leading-relaxed">
                                Your ecosystem is currently operating with a **Health Score of {healthScore}**. 
                                Total traffic is {trafficGrowth >= 0 ? 'up' : 'down'} by **{Math.abs(trafficGrowth).toFixed(1)}%**, 
                                reaching a total volume of **{formatNumber(totalTraffic)} sessions**.
                            </p>
                        </section>
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent-500 mb-4">Marketing Efficiency</h3>
                            <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300 leading-relaxed">
                                With a total investment of **{formatCurrency(totalAdSpend)}**, your campaigns have generated **{formatNumber(totalConversions)} conversions**. 
                                The current efficiency multiplier stands at **{(totalAdSpend > 0 ? totalConversions / (totalAdSpend / 100) : 0).toFixed(1)}x ROI**.
                            </p>
                        </section>
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 mb-4">Key Action Items</h3>
                            <ul className="space-y-3">
                                {insights.map((ins, i) => (
                                    <li key={i} className="flex gap-3 text-xs font-bold text-neutral-500 dark:text-neutral-400">
                                        <span className="text-brand-500">•</span>
                                        {ins.desc}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>
                    <div className="p-10 bg-neutral-50 dark:bg-dark-surface/50 flex gap-4">
                        <button 
                            onClick={() => {
                                const text = `Executive Summary\n\nHealth Score: ${healthScore}\nTraffic: ${formatNumber(totalTraffic)} (${trafficGrowth.toFixed(1)}%)\nConversions: ${formatNumber(totalConversions)}\nROI: ${(totalAdSpend > 0 ? totalConversions / (totalAdSpend / 100) : 0).toFixed(1)}x`;
                                navigator.clipboard.writeText(text);
                                alert('Summary copied to clipboard!');
                            }}
                            className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black shadow-lg shadow-brand-500/20 hover:bg-brand-500 transition-all"
                        >
                            Copy to Clipboard
                        </button>
                        <button onClick={() => setShowSummary(false)} className="px-8 py-4 bg-white dark:bg-dark-bg border border-neutral-200 dark:border-neutral-800 rounded-2xl font-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 transition-all">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default DashboardPage;
