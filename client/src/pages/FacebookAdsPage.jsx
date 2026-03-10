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
    BanknotesIcon,
    ExclamationTriangleIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (num) => Number(num).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const FacebookAdsPage = () => {
    const { startDate, endDate } = useDateRangeStore();
    const { connectedSources, activeFacebookAdAccountId } = useAccountsStore();
    const isConnected = connectedSources.includes('facebook-ads');
    const hasAccount = !!activeFacebookAdAccountId;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [overview, setOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [adsets, setAdsets] = useState([]);

    useEffect(() => {
        if (!isConnected || !hasAccount) return;
        
        const loadData = async () => {
            setLoading(true);
            try {
                const [overviewRes, timeseriesRes, campaignsRes, adsetsRes] = await Promise.all([
                    api.get(`/facebook-ads/overview?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: { data: [] } })),
                    api.get(`/facebook-ads/timeseries?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: { data: [] } })),
                    api.get(`/facebook-ads/campaigns?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: { data: [] } })),
                    api.get(`/facebook-ads/adsets?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: { data: [] } })),
                ]);

                if (overviewRes.data && overviewRes.data.data && overviewRes.data.data.length > 0) {
                    const row = overviewRes.data.data[0];
                    setOverview({
                        spend: parseFloat(row.spend || 0),
                        impressions: parseInt(row.impressions || 0),
                        clicks: parseInt(row.clicks || 0),
                        cpc: parseFloat(row.cpc || 0),
                        ctr: parseFloat(row.ctr || 0)
                    });
                } else {
                    setOverview({ spend: 0, impressions: 0, clicks: 0, cpc: 0, ctr: 0 });
                }

                if (timeseriesRes.data && timeseriesRes.data.data) {
                    const formattedChart = timeseriesRes.data.data.map(row => ({
                        date: row.date_start,
                        clicks: parseInt(row.clicks || 0),
                        spend: parseFloat(row.spend || 0)
                    })).sort((a, b) => new Date(a.date) - new Date(b.date));
                    setTimeseries(formattedChart);
                } else {
                    setTimeseries([]);
                }

                if (campaignsRes.data && campaignsRes.data.data) {
                    setCampaigns(campaignsRes.data.data.slice(0, 20).map(r => ({
                        id: r.campaign_id,
                        name: r.campaign_name,
                        spend: parseFloat(r.spend || 0),
                        impressions: parseInt(r.impressions || 0),
                        clicks: parseInt(r.clicks || 0),
                    })));
                } else {
                    setCampaigns([]);
                }

                if (adsetsRes.data && adsetsRes.data.data) {
                    setAdsets(adsetsRes.data.data.slice(0, 20).map(r => ({
                        id: r.adset_id,
                        name: r.adset_name,
                        spend: parseFloat(r.spend || 0),
                        impressions: parseInt(r.impressions || 0),
                        clicks: parseInt(r.clicks || 0),
                    })));
                } else {
                    setAdsets([]);
                }
            } catch (err) {
                console.error("Facebook Ads fetch err", err);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [isConnected, hasAccount, startDate, endDate]);

    if (!isConnected) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm">
                        <ExclamationTriangleIcon className="w-12 h-12 text-neutral-400 mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Facebook Ads Not Connected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-5">Please go to Integrations to connect your Meta/Facebook Ads account.</p>
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
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">No Ad Account Selected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-5">Your Facebook Ads account is connected, but you haven't picked an ad account yet. Go to Integrations to select one.</p>
                        <button onClick={() => navigate('/connect-accounts')} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">Select Ad Account</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const campaignColumns = [
        { header: 'Campaign Name', cell: (row) => <div className="max-w-[200px] truncate" title={row.name}>{row.name}</div> },
        { header: 'Spend', cell: (row) => formatCurrency(row.spend) },
        { header: 'Impressions', cell: (row) => formatNumber(row.impressions) },
        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
    ];

    const adsetColumns = [
        { header: 'Ad Set Name', cell: (row) => <div className="max-w-[200px] truncate" title={row.name}>{row.name}</div> },
        { header: 'Spend', cell: (row) => formatCurrency(row.spend) },
        { header: 'Impressions', cell: (row) => formatNumber(row.impressions) },
        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Facebook Ads</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Social media advertising metrics</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Total Spend"
                        value={overview ? formatCurrency(overview.spend || 0) : '0'}
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
                        title="Average CTR"
                        value={overview ? `${overview.ctr.toFixed(2)}%` : '0%'}
                        loading={loading}
                        Icon={ChartBarIcon}
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
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Spend & Clicks Trend</h3>
                    </div>
                    <div className="flex-1 p-5 min-h-[300px]">
                        {loading ? (
                            <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1877F2" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#1877F2" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                                    <Area yAxisId="left" type="monotone" dataKey="spend" stroke="#1877F2" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" name="Spend ($)" />
                                    <Area yAxisId="right" type="monotone" dataKey="clicks" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" name="Clicks" />
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
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Ad Sets</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={adsetColumns} data={adsets} loading={loading} />
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default FacebookAdsPage;
