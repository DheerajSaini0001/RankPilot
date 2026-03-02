import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/ui/DashboardLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
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

    const groups = ['google', 'facebook', 'anthropic', 'openai', 'other'];

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto pb-10">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Super Admin Panel</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">Manage global system configurations and API credentials securely.</p>
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
                                <div key={group} className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 shadow-sm mb-6">
                                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white capitalize mb-4 border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                        {group} Configuration
                                    </h3>
                                    <div className="space-y-4 pt-2">
                                        {groupConfigs.map(config => {
                                            const originalIdx = configs.findIndex(c => c.key === config.key);
                                            return (
                                                <div key={config.key} className="flex flex-col sm:flex-row gap-4 items-end bg-neutral-50 dark:bg-dark-surface p-4 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                                    <div className="flex-1 w-full">
                                                        <Input
                                                            label={config.label}
                                                            value={configs[originalIdx].maskedValue}
                                                            onChange={e => handleConfigChange(originalIdx, e.target.value)}
                                                            className="mb-0"
                                                        />
                                                        <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wider">{config.key}</p>
                                                    </div>
                                                    <div className="flex shrink-0 space-x-2 w-full sm:w-auto mt-2 sm:mt-0">
                                                        <Button variant="secondary" onClick={() => testConfig(config.key)} className="flex-1 sm:flex-none">
                                                            Test
                                                        </Button>
                                                        <Button onClick={() => saveConfig(originalIdx)} className="flex-1 sm:flex-none" disabled={configs[originalIdx].maskedValue.includes('****')}>
                                                            Save
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
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
