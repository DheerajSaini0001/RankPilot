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
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
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
    const { connectedSources, activeGa4PropertyId } = useAccountsStore();
    const isConnected = connectedSources.includes('ga4');
    const hasProperty = !!activeGa4PropertyId;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [overview, setOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [traffic, setTraffic] = useState([]);
    const [pages, setPages] = useState([]);

    useEffect(() => {
        if (!isConnected || !hasProperty) return;
        
        const loadData = async () => {
            setLoading(true);
            try {
                const query = new URLSearchParams({
                    startDate,
                    endDate,
                    ...(device && { device }),
                    ...(campaign && { campaign }),
                    ...(channel && { channel })
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
            } catch (err) {
                console.error("GA4 fetch err", err);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [isConnected, hasProperty, startDate, endDate, device, campaign, channel]);

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

    const trafficColumns = [
        { header: 'Channel', accessor: 'channel' },
        { header: 'Source', accessor: 'source' },
        { header: 'Sessions', cell: (row) => formatNumber(row.sessions) },
        { header: 'Active Users', cell: (row) => formatNumber(row.activeUsers) },
    ];

    const pageColumns = [
        { header: 'Page Title', cell: (row) => <div className="max-w-[200px] truncate" title={row.title}>{row.title}</div> },
        { header: 'Path', cell: (row) => <div className="max-w-[200px] truncate text-brand-600 dark:text-brand-400" title={row.path}>{row.path}</div> },
        { header: 'Views', cell: (row) => formatNumber(row.views) },
        { header: 'Users', cell: (row) => formatNumber(row.users) },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Google Analytics 4</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Website traffic and engagement metrics</p>
                </div>

                <FilterBar showChannel />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Active Users"
                        value={overview ? formatNumber(overview.activeUsers || 0) : '0'}
                        loading={loading}
                        Icon={UsersIcon}
                    />
                    <KpiCard
                        title="Total Sessions"
                        value={overview ? formatNumber(overview.sessions || 0) : '0'}
                        loading={loading}
                        Icon={CursorArrowRaysIcon}
                    />
                    <KpiCard
                        title="Bounce Rate"
                        value={overview ? `${(overview.bounceRate * 100).toFixed(1)}%` : '0%'}
                        loading={loading}
                        Icon={ArrowPathIcon}
                    />
                    <KpiCard
                        title="Avg. Session Duration"
                        value={overview ? formatTime(overview.avgSessionDuration) : '0m 0s'}
                        loading={loading}
                        Icon={ClockIcon}
                    />
                </div>

                {/* Timeseries Chart */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                    <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Sessions Trend</h3>
                    </div>
                    <div className="flex-1 p-5 min-h-[300px]">
                        {loading ? (
                            <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                                    <Area type="monotone" dataKey="sessions" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorSessions)" name="Sessions" />
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
                            <DataTable columns={trafficColumns} data={traffic} loading={loading} />
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Pages</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={pageColumns} data={pages} loading={loading} />
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Ga4Page;
