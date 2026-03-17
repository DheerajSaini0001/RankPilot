import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import KpiCard from '../components/dashboard/KpiCard';
import DataTable from '../components/dashboard/DataTable';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import api from '../api';
import {
    UsersIcon,
    CursorArrowRaysIcon,
    ClockIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import FilterBar from '../components/dashboard/FilterBar';
import { useFilterStore } from '../store/filterStore';

const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatTime = (secs) => {
    const min = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${min}m ${s}s`;
};

const Ga4Page = () => {
    const { startDate, endDate } = useDateRangeStore();
    const { device, campaign, channel } = useFilterStore();
    const { connectedSources, activeGa4PropertyId, activeSiteId } = useAccountsStore();
    const isConnected = connectedSources.includes('ga4');
    const hasProperty = !!activeGa4PropertyId;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [overview, setOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [traffic, setTraffic] = useState([]);
    const [pages, setPages] = useState([]);
    const [breakdowns, setBreakdowns] = useState({ devices: [], locations: [] });

    const loadData = async () => {
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
                pageViews: data.overview.pageViews
            });

            setTimeseries(data.timeseries);
            setTraffic(data.traffic);
            setPages(data.pages);
            setBreakdowns(data.breakdowns || { devices: [], locations: [] });
        } catch (err) {
            console.error("GA4 fetch err", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [isConnected, hasProperty, startDate, endDate, device, campaign, channel, activeSiteId]);

    // Auto-refresh every 10 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('Auto-refreshing GA4 data...');
            loadData();
        }, 4 * 60 * 60 * 1000); // Sync with 4h Cron

        return () => clearInterval(interval);
    }, [isConnected, hasProperty, startDate, endDate, device, campaign, channel, activeSiteId]);


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

    return (
        <DashboardLayout>
            <div className="flex flex-col space-y-8">
                <div className="flex items-center justify-between bg-white dark:bg-dark-card p-6 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-emerald-500/10 transition-colors duration-700"></div>
                     <div className="relative z-10">
                        <h1 className="text-2xl lg:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Google Analytics 4</h1>
                        <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mt-1">Website traffic and engagement metrics</p>
                     </div>
                     <div className="relative z-10 p-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <ChartBarIcon className="w-6 h-6 text-emerald-500" />
                     </div>
                </div>

                <FilterBar 
                    showChannel 
                    onRefresh={loadData}
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
                        value={overview ? `${((1 - overview.bounceRate) * 100).toFixed(1)}%` : '0%'}
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

                {/* Timeseries Chart */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[450px] group">
                    <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-emerald-500/5">
                        <div>
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Engagement Resonance Matrix</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">Cross-period session liquidity analysis</p>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                            <ChartBarIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                    </div>
                    <div className="flex-1 p-8 min-h-[350px]">
                        {loading ? (
                            <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
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
                                            background: 'rgba(255, 255, 255, 0.95)',
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Traffic Sources</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={trafficColumns} data={filteredTraffic} loading={loading} />
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Pages</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={pageColumns} data={filteredPages} loading={loading} />
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
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="w-[200px] h-[200px]">
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
                                            contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontWeight: 'bold', fontSize: '10px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
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
                        <div className="mb-6">
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Geographical Reach</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Top 5 conversion landscapes</p>
                        </div>
                        <div className="space-y-4">
                            {breakdowns.locations.map((loc, i) => {
                                const maxVal = Math.max(...breakdowns.locations.map(l => l.value));
                                const width = (loc.value / maxVal) * 100;
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                                <span className="w-5 h-5 flex items-center justify-center bg-neutral-100 dark:bg-dark-surface rounded-md text-[10px]">{i+1}</span>
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
            </div>
        </DashboardLayout>
    );
};

export default Ga4Page;
