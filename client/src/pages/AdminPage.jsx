import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/ui/DashboardLayout';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import api from '../api';

const AdminPage = () => {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingMsg, setSavingMsg] = useState('');

    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/config');
            setConfigs(res.data);
        } catch (err) {
            toast.error('Failed to load configurations');
        } finally {
            setLoading(false);
        }
    };

    const handleConfigChange = (idx, value) => {
        const newConfigs = [...configs];
        newConfigs[idx].maskedValue = value;
        setConfigs(newConfigs);
    };

    const saveConfig = async (idx) => {
        const item = configs[idx];
        if (item.maskedValue.includes('****')) {
            toast.info('Cannot save masked value. Enter the actual value.');
            return;
        }
        setSavingMsg(`Saving ${item.key}...`);
        try {
            await api.post('/admin/config', { key: item.key, value: item.maskedValue });
            toast.success(`${item.label} updated successfully`);
            await loadConfigs();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to update ${item.label}`);
        } finally {
            setSavingMsg('');
        }
    };

    const testConfig = async (key) => {
        setSavingMsg(`Testing ${key}...`);
        try {
            const res = await api.post(`/admin/config/test/${key}`);
            if (res.data.success) {
                toast.success(res.data.message);
            } else {
                toast.error(res.data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || `Test failed for ${key}`);
        } finally {
            setSavingMsg('');
        }
    };

    const groups = ['server', 'security', 'database', 'google', 'facebook', 'gemini', 'other'];

    return (
        <DashboardLayout>
            <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
                        <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Super Admin Panel
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-2 font-medium">Manage global system configurations, API credentials, and security constants.</p>
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
                        <div className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {savingMsg && (
                            <div className="bg-brand-50 text-brand-700 p-3 rounded-lg border border-brand-200 flex items-center mb-4">
                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-brand-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {savingMsg}
                            </div>
                        )}
                        {groups.map(group => {
                            const groupConfigs = configs.filter(c => c.group === group);
                            if (groupConfigs.length === 0) return null;

                            return (
                                <div key={group} className="group bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-2xl hover:shadow-brand-500/5 hover:border-brand-400/50 dark:hover:border-brand-500/50 transition-all duration-500 relative overflow-hidden mb-8">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"></div>
                                    <div className="relative z-10">
                                        <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white capitalize mb-6 flex items-center gap-3">
                                            <span className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-sm">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
                                            </span>
                                            {group} Configuration
                                        </h3>
                                        <div className="space-y-4 pt-2">
                                            {groupConfigs.map(config => {
                                                const originalIdx = configs.findIndex(c => c.key === config.key);
                                                return (
                                                    <div key={config.key} className="bg-neutral-50 dark:bg-dark-surface/50 p-5 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 focus-within:border-brand-300 dark:focus-within:border-brand-700 transition-colors">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <label className="block text-xs font-bold text-neutral-900 dark:text-white tracking-wide">{config.label}</label>
                                                            <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-widest bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-md border border-brand-100 dark:border-brand-800/30">{config.key}</span>
                                                        </div>
                                                        <div className="flex flex-col xl:flex-row gap-4 items-center w-full">
                                                            <div className="flex-1 w-full relative">
                                                                <input
                                                                    type="text"
                                                                    value={configs[originalIdx].maskedValue}
                                                                    onChange={e => handleConfigChange(originalIdx, e.target.value)}
                                                                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-dark-card text-neutral-900 dark:text-white placeholder:text-neutral-500 transition-all duration-300 shadow-inner"
                                                                />
                                                            </div>
                                                            <div className="flex shrink-0 space-x-3 w-full xl:w-auto">
                                                                <Button variant="secondary" onClick={() => testConfig(config.key)} className="flex-1 xl:flex-none shadow-sm dark:bg-dark-card border-neutral-200 dark:border-neutral-700 h-[46px] px-5">
                                                                    Test Connection
                                                                </Button>
                                                                <Button onClick={() => saveConfig(originalIdx)} className="flex-1 xl:flex-none shadow-md shadow-brand-500/20 px-6 h-[46px]" disabled={configs[originalIdx].maskedValue.includes('****')}>
                                                                    Save API Key
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdminPage;
