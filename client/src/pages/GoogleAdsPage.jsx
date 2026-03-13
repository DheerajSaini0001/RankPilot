import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import FilterBar from '../components/dashboard/FilterBar';
import { useFilterStore } from '../store/filterStore';

const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (num) => Number(num).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const GoogleAdsPage = () => {
    const { startDate, endDate } = useDateRangeStore();
    const { device, campaign } = useFilterStore();
    const { connectedSources, activeGoogleAdsCustomerId, activeSiteId } = useAccountsStore();
    const isConnected = connectedSources.includes('google-ads');
    const hasAccount = !!activeGoogleAdsCustomerId;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [overview, setOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [keywords, setKeywords] = useState([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate,
                endDate,
                ...(device && { device }),
                ...(campaign && { campaign }),
                ...(activeSiteId && { siteId: activeSiteId })
            }).toString();
            
            const res = await api.get(`/analytics/google-ads-summary?${query}`);
            const data = res.data;

            setOverview(data.overview);
            setTimeseries(data.timeseries);
            setCampaigns(data.campaigns);
            setKeywords(data.keywords);
        } catch (err) {
            console.error("Google Ads fetch err", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isConnected || !hasAccount) return;
        loadData();
    }, [isConnected, hasAccount, startDate, endDate, device, campaign, activeSiteId]);

    // Auto-refresh every 10 minutes
    useEffect(() => {
        if (!isConnected || !hasAccount) return;
        const interval = setInterval(() => {
            console.log('Auto-refreshing Google Ads data...');
            loadData();
        }, 10 * 60 * 1000);

        return () => clearInterval(interval);
    }, [isConnected, hasAccount, startDate, endDate, device, campaign, activeSiteId]);


    if (!isConnected) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm">
                        <ExclamationTriangleIcon className="w-12 h-12 text-neutral-400 mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Google Ads Not Connected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-5">Please go to Integrations to connect your Google Ads account.</p>
                        <button onClick={() => navigate('/connect-accounts')} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">Go to Integrations</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!hasAccount) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm">
                        <ExclamationTriangleIcon className="w-12 h-12 text-amber-400 mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">No Ads Account Selected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-5">Google Ads is connected, but you haven't selected a customer account yet. Go to Integrations to pick one.</p>
                        <button onClick={() => navigate('/connect-accounts')} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">Select Ads Account</button>
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

                <FilterBar showCampaign />

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
