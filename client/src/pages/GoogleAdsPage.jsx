import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/ui/DashboardLayout';
import KpiCard from '../components/dashboard/KpiCard';
import DataTable from '../components/dashboard/DataTable';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import api from '../api';
import {
    CurrencyDollarIcon,
    CursorArrowRaysIcon,
    CheckCircleIcon,
    BanknotesIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (num) => Number(num).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const GoogleAdsPage = () => {
    const { startDate, endDate } = useDateRangeStore();
    const { connectedSources } = useAccountsStore();
    const isConnected = connectedSources.includes('google-ads');
    const [loading, setLoading] = useState(false);
    
    const [overview, setOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [keywords, setKeywords] = useState([]);

    useEffect(() => {
        if (!isConnected) return;
        
        const loadData = async () => {
            setLoading(true);
            try {
                const [overviewRes, timeseriesRes, campaignsRes, keywordsRes] = await Promise.all([
                    api.get(`/google-ads/overview?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: [] })),
                    api.get(`/google-ads/timeseries?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: [] })),
                    api.get(`/google-ads/campaigns?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: [] })),
                    api.get(`/google-ads/keywords?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: [] })),
                ]);

                if (overviewRes.data && overviewRes.data.length > 0) {
                    setOverview({
                        cost: overviewRes.data[0].metrics.costMicros / 1000000,
                        impressions: overviewRes.data[0].metrics.impressions,
                        clicks: overviewRes.data[0].metrics.clicks,
                        conversions: overviewRes.data[0].metrics.conversions,
                        ctr: overviewRes.data[0].metrics.ctr,
                        cpc: overviewRes.data[0].metrics.averageCpc / 1000000,
                    });
                } else {
                    setOverview({ cost: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0 });
                }

                if (timeseriesRes.data && timeseriesRes.data.length > 0) {
                    const formattedChart = timeseriesRes.data.map(row => ({
                        date: row.segments.date,
                        clicks: row.metrics.clicks,
                        cost: row.metrics.costMicros / 1000000
                    })).sort((a, b) => new Date(a.date) - new Date(b.date));
                    setTimeseries(formattedChart);
                } else {
                    setTimeseries([]);
                }

                if (campaignsRes.data && campaignsRes.data.length > 0) {
                    setCampaigns(campaignsRes.data.map(r => ({
                        name: r.campaign.name,
                        status: r.campaign.status,
                        cost: r.metrics.costMicros / 1000000,
                        impressions: r.metrics.impressions,
                        clicks: r.metrics.clicks,
                        conversions: r.metrics.conversions
                    })));
                } else {
                    setCampaigns([]);
                }

                if (keywordsRes.data && keywordsRes.data.length > 0) {
                    setKeywords(keywordsRes.data.map(r => ({
                        name: r.keywordView ? r.keywordView.resourceName : 'Unknown',
                        cost: r.metrics.costMicros / 1000000,
                        impressions: r.metrics.impressions,
                        clicks: r.metrics.clicks
                    })));
                } else {
                    setKeywords([]);
                }
            } catch (err) {
                console.error("Google Ads fetch err", err);
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
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Google Ads Not Connected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">Please go to Integrations to connect your Google Ads account.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const campaignColumns = [
        { header: 'Campaign Name', accessor: 'name' },
        { header: 'Status', cell: (row) => <span className="capitalize">{row.status}</span> },
        { header: 'Cost', cell: (row) => formatCurrency(row.cost) },
        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
        { header: 'Conversions', cell: (row) => formatNumber(row.conversions) },
    ];

    const keywordColumns = [
        { header: 'Keyword (Resource)', cell: (row) => <div className="max-w-[200px] truncate" title={row.name}>{row.name}</div> },
        { header: 'Cost', cell: (row) => formatCurrency(row.cost) },
        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
        { header: 'Impressions', cell: (row) => formatNumber(row.impressions) },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Google Ads</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Campaign and Search Ad metrics</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Total Cost"
                        value={overview ? formatCurrency(overview.cost || 0) : '0'}
                        loading={loading}
                        Icon={BanknotesIcon}
                    />
                    <KpiCard
                        title="Total Impressions"
                        value={overview ? formatNumber(overview.impressions || 0) : '0'}
                        loading={loading}
                        Icon={CursorArrowRaysIcon}
                    />
                    <KpiCard
                        title="Total Conversions"
                        value={overview ? formatNumber(overview.conversions || 0) : '0'}
                        loading={loading}
                        Icon={CheckCircleIcon}
                    />
                    <KpiCard
                        title="Avg. Cost Per Click"
                        value={overview ? formatCurrency(overview.cpc || 0) : '0'}
                        loading={loading}
                        Icon={CurrencyDollarIcon}
                    />
                </div>

                {/* Timeseries Chart */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                    <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Cost & Clicks Trend</h3>
                    </div>
                    <div className="flex-1 p-5 min-h-[300px]">
                        {loading ? (
                            <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B8ED4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B8ED4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                                    <Area yAxisId="left" type="monotone" dataKey="cost" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" name="Cost ($)" />
                                    <Area yAxisId="right" type="monotone" dataKey="clicks" stroke="#3B8ED4" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" name="Clicks" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Campaigns</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={campaignColumns} data={campaigns} loading={loading} />
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Target Keywords</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={keywordColumns} data={keywords} loading={loading} />
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default GoogleAdsPage;
