import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/ui/DashboardLayout';
import Button from '../components/ui/Button';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import { useAuthStore } from '../store/authStore';
import {
    ChatBubbleLeftRightIcon,
    PaperAirplaneIcon,
    SparklesIcon,
    UserCircleIcon
} from '@heroicons/react/24/outline';
import api from '../api';

const AIChatPage = () => {
    const { startDate, endDate } = useDateRangeStore();
    const { connectedSources } = useAccountsStore();
    const { user } = useAuthStore();

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hello! I'm your RankPilot AI Analyst. What would you like to know about your marketing performance?"
        }
    ]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!query.trim() || loading) return;

        const currentQuery = query.trim();
        setQuery('');

        // Add user message to UI
        setMessages(prev => [...prev, { role: 'user', content: currentQuery }]);
        setLoading(true);

        try {
            // First fetch current snapshot data to feed the AI context
            let overviewData = {};
            if (connectedSources.length > 0) {
                const promises = [];

                if (connectedSources.includes('ga4')) {
                    promises.push(api.get(`/ga4/overview?startDate=${startDate}&endDate=${endDate}`)
                        .then(r => {
                            const rows = r.data.rows?.[0]?.metricValues || [];
                            overviewData.ga4 = {
                                users: rows[0]?.value || 0,
                                sessions: rows[1]?.value || 0,
                                bounceRate: rows[2]?.value || 0,
                                avgSessionDuration: rows[3]?.value || 0,
                                screenPageViews: rows[4]?.value || 0
                            };
                        }).catch(() => null));
                }

                if (connectedSources.includes('gsc-site')) {
                    promises.push(api.get(`/gsc/overview?startDate=${startDate}&endDate=${endDate}`)
                        .then(r => {
                            const totals = r.data.rows?.[0] || {};
                            overviewData.gsc = {
                                clicks: totals.clicks || 0,
                                impressions: totals.impressions || 0,
                                ctr: (totals.ctr * 100).toFixed(2) || 0,
                                position: totals.position?.toFixed(1) || 0
                            };
                        }).catch(() => null));
                }

                if (connectedSources.includes('google-ads')) {
                    promises.push(api.get(`/google-ads/overview?startDate=${startDate}&endDate=${endDate}`)
                        .then(r => {
                            // Sum up campaign metrics
                            const totals = r.data.reduce((acc, row) => {
                                acc.spend += (row.metrics.costMicros / 1000000);
                                acc.impressions += parseInt(row.metrics.impressions);
                                acc.clicks += parseInt(row.metrics.clicks);
                                acc.conversions += parseFloat(row.metrics.conversions);
                                return acc;
                            }, { spend: 0, impressions: 0, clicks: 0, conversions: 0 });

                            overviewData.googleAds = {
                                currencyCode: '$', // Defaulting for now
                                spend: totals.spend.toFixed(2),
                                impressions: totals.impressions,
                                clicks: totals.clicks,
                                ctr: totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : 0,
                                cpc: totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : 0,
                                conversions: totals.conversions.toFixed(1),
                                roas: totals.spend > 0 ? (totals.conversions / totals.spend).toFixed(2) : 0 // Simplified
                            };
                        }).catch(() => null));
                }

                if (connectedSources.includes('facebook-ads')) {
                    promises.push(api.get(`/facebook-ads/overview?startDate=${startDate}&endDate=${endDate}`)
                        .then(r => {
                            const insight = r.data.data?.[0] || {};
                            overviewData.facebookAds = {
                                currency: insight.account_currency || '$',
                                spend: insight.spend || 0,
                                reach: insight.reach || 0,
                                impressions: insight.impressions || 0,
                                clicks: insight.clicks || 0,
                                ctr: insight.ctr || 0,
                                cpm: insight.cpm || 0,
                                cpc: insight.cpc || 0,
                                roas: insight.purchase_roas?.[0]?.value || 0
                            };
                        }).catch(() => null));
                }

                await Promise.all(promises);
            }

            const res = await api.post('/ai/ask', {
                question: currentQuery,
                dateRangeStart: startDate,
                dateRangeEnd: endDate,
                activeSources: connectedSources,
                data: overviewData
            });

            // Add response
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }]);
        } catch (err) {
            console.error("AI Error:", err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm sorry, I encountered an error while analyzing your data. Please ensure your accounts are connected and try again."
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-140px)] relative">
                {/* Header */}
                <div className="flex items-center space-x-4 mb-6 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                        <SparklesIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                            AI Marketing Analyst
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                            Ask me anything about your campaigns, ROI, or traffic trends.
                        </p>
                    </div>
                </div>

                {/* Chat Container */}
                <div className="flex-1 bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col min-h-0 relative z-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-neutral-50 dark:from-dark-card dark:to-neutral-900/50 pointer-events-none opacity-50"></div>

                    {/* Message Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>

                                    {/* Avatar */}
                                    <div className="shrink-0 mb-1">
                                        {msg.role === 'user' ? (
                                            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=3B8ED4&color=fff`} alt="User" className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-dark-card shadow-sm" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center ring-2 ring-white dark:ring-dark-card shadow-sm">
                                                <SparklesIcon className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Bubble */}
                                    <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user'
                                        ? 'bg-brand-600 text-white rounded-br-none'
                                        : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 rounded-bl-none border border-neutral-200/50 dark:border-neutral-700/50'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="flex items-end gap-3 max-w-[80%]">
                                    <div className="w-8 h-8 mb-1 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center ring-2 ring-white dark:ring-dark-card shadow-sm shrink-0">
                                        <SparklesIcon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="px-5 py-4 rounded-2xl rounded-bl-none bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 sm:p-6 border-t border-neutral-100 dark:border-neutral-800/80 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm relative z-10 shrink-0">
                        <form onSubmit={handleSendMessage} className="relative flex items-center max-w-4xl mx-auto">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ask about 'Conversions yesterday' or 'Ad Spend vs Revenue'..."
                                className="w-full bg-neutral-100 dark:bg-neutral-900/50 border border-neutral-200/80 dark:border-neutral-700 rounded-2xl py-4 pl-5 pr-14 text-sm font-medium text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-brand-400 focus:border-brand-400 focus:bg-white dark:focus:bg-dark-card transition-all duration-300 shadow-inner"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={!query.trim() || loading}
                                className="absolute right-2 p-2.5 bg-brand-600 hover:bg-brand-700 rounded-xl text-white disabled:opacity-50 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 transition-all duration-200 shadow-md flex items-center justify-center group"
                            >
                                <PaperAirplaneIcon className="w-5 h-5 transform -rotate-45 group-hover:scale-110 transition-transform ml-1 mb-1" strokeWidth={2} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AIChatPage;
