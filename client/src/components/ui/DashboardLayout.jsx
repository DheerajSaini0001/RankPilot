import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    HomeIcon,
    Cog6ToothIcon,
    WrenchIcon,
    ArrowRightOnRectangleIcon,
    MoonIcon,
    SunIcon,
    ShieldCheckIcon,
    ChartPieIcon,
    ChatBubbleLeftRightIcon,
    MagnifyingGlassIcon,
    ChevronDownIcon,
    PlusIcon,
    QuestionMarkCircleIcon,
    BellIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { useAccountsStore } from '../../store/accountsStore';
import { listGsc, getActiveAccounts, selectAccounts } from '../../api/accountApi';

const DashboardLayout = ({ children }) => {
    const { user, clearAuth } = useAuthStore();
    const { connectedSources = [], activeGscSite, gscSites = [], setAccounts } = useAccountsStore();
    const navigate = useNavigate();
    const isAdmin = user?.email === import.meta.env.VITE_SUPER_ADMIN_EMAIL;

    useEffect(() => {
        if (user) {
            listGsc()
                .then(res => {
                    const data = res.data || [];
                    if (data.length > 0) {
                        setAccounts({ gscSites: data });
                    }
                })
                .catch(() => { });

            getActiveAccounts()
                .then(res => {
                    if (res.data?.gscSiteUrl) {
                        setAccounts({ activeGscSite: res.data.gscSiteUrl });
                    }
                })
                .catch(() => { });
        }
    }, [user, connectedSources, setAccounts]);

    const handleSiteChange = async (e) => {
        const url = e.target.value === 'none' ? '' : e.target.value;
        setAccounts({ activeGscSite: url });
        try {
            await selectAccounts({ gscSiteUrl: url });
            window.location.reload();
        } catch (err) {
            console.error('Failed to change site');
        }
    };

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

    const toggleDark = () => {
        const next = !isDark;
        setIsDark(next);
        if (next) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const handleLogout = () => {
        // Clean out all stores explicitly
        clearAuth();
        setAccounts({ ga4: {}, gsc: {}, googleAds: {}, facebook: {}, connectedSources: [], gscSites: [], activeGscSite: null });
        // Force flush anything that might cause a 401 loop
        localStorage.clear();
        sessionStorage.clear();
        
        // Push user safely to the unauthenticated Landing Page
        navigate('/');
    };

    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: ChartPieIcon },
        { label: 'AI Analyst', path: '/dashboard/ai-chat', icon: ChatBubbleLeftRightIcon },
        { label: 'Google Search Console', path: '/dashboard/gsc', icon: ChartBarIcon, isSubItem: true },
        { label: 'Google Analytics 4', path: '/dashboard/ga4', icon: ChartBarIcon, isSubItem: true },
        { label: 'Google Ads', path: '/dashboard/google-ads', icon: ChartBarIcon, isSubItem: true },
        { label: 'Facebook Ads', path: '/dashboard/facebook-ads', icon: ChartBarIcon, isSubItem: true },
    ];

    if (isAdmin) {
        navItems.push({ label: 'Super Admin', path: '/dashboard/admin', icon: ShieldCheckIcon });
    }

    return (
        <div className="flex h-screen bg-neutral-50 dark:bg-dark-bg font-sans overflow-hidden transition-colors selection:bg-brand-500 selection:text-white">
            {/* Sidebar */}
            <aside className="w-64 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-r border-neutral-200/60 dark:border-neutral-700/60 hidden md:flex flex-col flex-shrink-0 z-20 shadow-sm relative">
                {/* Subtle gradient flair */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none"></div>

                <div className="p-6 border-b border-neutral-100 dark:border-neutral-800/80 relative z-10">
                    <NavLink to="/" className="flex items-center">
                        <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">
                            RankPilot
                        </span>
                        <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                            AI
                        </span>
                    </NavLink>
                </div>

                <div className="px-4 pt-6 pb-2 relative z-10 space-y-3">
                    <div className="relative group cursor-pointer">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                            <MagnifyingGlassIcon className="h-4 w-4 text-neutral-400" aria-hidden="true" strokeWidth={2} />
                        </div>
                        <select
                            value={activeGscSite && gscSites?.some(s => s.siteUrl === activeGscSite) ? activeGscSite : ''}
                            onChange={handleSiteChange}
                            disabled={!gscSites || gscSites.length === 0}
                            className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 flex items-center justify-between shadow-sm hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {(!gscSites || gscSites.length === 0) ? (
                                <option value="" disabled>Search websites...</option>
                            ) : (
                                <>
                                    <option value="" disabled hidden>Search websites...</option>
                                    <option value="none">None Selected</option>
                                    {gscSites.map(s => (
                                        <option key={s.siteUrl} value={s.siteUrl}>
                                            {s.siteUrl.replace('https://', '').replace('http://', '').replace('sc-domain:', '').replace(/\/$/, '')}
                                        </option>
                                    ))}
                                </>
                            )}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
                            <ChevronDownIcon className="h-4 w-4 text-neutral-400" aria-hidden="true" strokeWidth={2} />
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/connect-accounts')}
                        className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] dark:bg-brand-600 dark:hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
                    >
                        <PlusIcon className="h-4 w-4 mr-1.5" aria-hidden="true" strokeWidth={2.5} />
                        Add website
                    </button>
                </div>

                <nav className="flex-1 px-4 pb-4 space-y-1.5 overflow-y-auto relative z-10">
                    {navItems.map((item, i) => {
                        if (item.type === 'divider') {
                            return (
                                <div key={`div-${i}`} className="pt-4 pb-2 px-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                        {item.title}
                                    </p>
                                </div>
                            );
                        }

                        return (
                            <NavLink
                                key={`nav-${i}`}
                                to={item.path}
                                end={item.path === '/dashboard'}
                                className={({ isActive }) => `flex items-center p-3 rounded-xl font-semibold transition-all duration-200 ${isActive
                                    ? 'bg-gradient-to-r from-brand-50 to-white dark:from-brand-900/20 dark:to-dark-card text-brand-700 dark:text-brand-400 shadow-sm border border-brand-100 dark:border-brand-800/50'
                                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white border border-transparent'
                                    } ${item.isSubItem ? 'ml-2 text-sm' : ''}`}
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon className={`${item.isSubItem ? 'w-4 h-4' : 'w-5 h-5'} mr-3`} strokeWidth={isActive ? 2 : 1.5} />
                                        {item.label}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full bg-neutral-50/50 dark:bg-dark-bg relative">
                {/* Top Header Navbar */}
                <header className="flex-shrink-0 flex items-center justify-between px-6 md:px-8 py-3.5 bg-white/70 dark:bg-dark-surface/70 backdrop-blur-md border-b border-neutral-200/60 dark:border-neutral-700/60 z-20">
                    <div>
                        <h2 className="text-xl font-medium text-neutral-800 dark:text-neutral-100 tracking-tight">Hi {user?.name?.split(' ')[0] || 'User'},</h2>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Manage your analytics, campaigns, and AI insights</p>
                    </div>
                    <div className="flex items-center space-x-5">
                        <button className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors">
                            <QuestionMarkCircleIcon className="w-5 h-5" strokeWidth={1.5} />
                        </button>
                        <button onClick={toggleDark} className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors">
                            {isDark ? <SunIcon className="w-5 h-5" strokeWidth={1.5} /> : <MoonIcon className="w-5 h-5" strokeWidth={1.5} />}
                        </button>
                        <button className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors">
                            <BellIcon className="w-5 h-5" strokeWidth={1.5} />
                        </button>
                        <div className="relative">
                            <div
                                className="flex items-center space-x-1.5 cursor-pointer group ml-2"
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            >
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full shadow-sm hover:opacity-90 transition-opacity drop-shadow-sm" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#7CB342] text-white flex items-center justify-center text-xs font-bold tracking-wider uppercase shadow-sm hover:opacity-90 transition-opacity">
                                        {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U'}
                                    </div>
                                )}
                                <ChevronDownIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300 transition-colors" strokeWidth={3} />
                            </div>

                            {isUserMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                                    <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 rounded-xl shadow-xl py-1 z-50 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
                                        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-dark-surface/50">
                                            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{user?.name || 'User'}</p>
                                            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate tracking-wide">{user?.email}</p>
                                        </div>
                                        <div className="py-1">
                                            <button
                                                onClick={() => { setIsUserMenuOpen(false); navigate('/connect-accounts'); }}
                                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center"
                                            >
                                                <Cog6ToothIcon className="w-4 h-4 mr-2.5 text-neutral-400" />
                                                Integrations
                                            </button>
                                            <button
                                                onClick={() => { setIsUserMenuOpen(false); navigate('/settings'); }}
                                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center"
                                            >
                                                <WrenchIcon className="w-4 h-4 mr-2.5 text-neutral-400" />
                                                Settings
                                            </button>
                                        </div>
                                        <div className="py-1 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-dark-surface/50">
                                            <button
                                                onClick={() => { 
                                                    setIsUserMenuOpen(false); 
                                                    if (window.confirm("Are you sure you want to log out?")) {
                                                        handleLogout();
                                                    }
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center"
                                            >
                                                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2.5 text-red-500" strokeWidth={2} />
                                                Log out
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-8 relative">
                    {/* Top Subtle Gradient */}
                    <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none z-0"></div>
                    <div className="relative z-10">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
