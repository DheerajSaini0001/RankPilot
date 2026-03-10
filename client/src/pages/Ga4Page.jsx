import React, { useState, useEffect } from 'react';
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

const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatTime = (secs) => {
    const min = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${min}m ${s}s`;
};

const Ga4Page = () => {
    const { startDate, endDate } = useDateRangeStore();
    const { connectedSources } = useAccountsStore();
    const isConnected = connectedSources.includes('ga4');
    const [loading, setLoading] = useState(false);
    
    const [overview, setOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [traffic, setTraffic] = useState([]);
    const [pages, setPages] = useState([]);

    useEffect(() => {
        if (!isConnected) return;
        
        const loadData = async () => {
            setLoading(true);
            try {
                const [overviewRes, timeseriesRes, trafficRes, pagesRes] = await Promise.all([
                    api.get(`/ga4/overview?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: null })),
                    api.get(`/ga4/timeseries?startDate=${startDate}&endDate=${endDate}&metric=sessions`).catch(() => ({ data: null })),
                    api.get(`/ga4/traffic?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: null })),
                    api.get(`/ga4/pages?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: null })),
                ]);

                if (overviewRes.data && overviewRes.data.rows && overviewRes.data.rows[0]) {
                    setOverview({
                        activeUsers: overviewRes.data.rows[0].metricValues[0].value,
                        sessions: overviewRes.data.rows[0].metricValues[1].value,
                        bounceRate: overviewRes.data.rows[0].metricValues[2].value,
                        avgSessionDuration: overviewRes.data.rows[0].metricValues[3].value,
                        pageViews: overviewRes.data.rows[0].metricValues[4].value
                    });
                } else {
                    setOverview({ activeUsers: 0, sessions: 0, bounceRate: 0, avgSessionDuration: 0, pageViews: 0 });
                }

                if (timeseriesRes.data && timeseriesRes.data.rows) {
                    const formattedChart = timeseriesRes.data.rows.map(row => ({
                        date: row.dimensionValues[0].value,
                        sessions: parseInt(row.metricValues[0].value, 10),
                    })).sort((a, b) => new Date(a.date) - new Date(b.date));
                    setTimeseries(formattedChart);
                } else {
                    setTimeseries([]);
                }

                if (trafficRes.data && trafficRes.data.rows) {
                    setTraffic(trafficRes.data.rows.slice(0, 10).map(r => ({
                        channel: r.dimensionValues[0].value,
                        source: r.dimensionValues[1].value,
                        sessions: parseFloat(r.metricValues[0].value),
                        activeUsers: parseFloat(r.metricValues[1].value)
                    })));
                } else {
                    setTraffic([]);
                }

                if (pagesRes.data && pagesRes.data.rows) {
                    setPages(pagesRes.data.rows.slice(0, 10).map(r => ({
                        path: r.dimensionValues[0].value,
                        title: r.dimensionValues[1].value,
                        views: parseFloat(r.metricValues[0].value),
                        users: parseFloat(r.metricValues[1].value)
                    })));
                } else {
                    setPages([]);
                }
            } catch (err) {
                console.error("GA4 fetch err", err);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [isConnected, startDate, endDate]);

    if (!isConnected) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-8 rounded-2xl flex flex-col items-center">
                        <ExclamationTriangleIcon className="w-12 h-12 text-neutral-400 mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Google Analytics 4 Not Connected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">Please go to Integrations to connect your GA4 account.</p>
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
