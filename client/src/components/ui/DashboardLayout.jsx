import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
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
    ChartBarIcon,
    GlobeAltIcon,
    SparklesIcon,
    ArrowRightIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { useAccountsStore } from '../../store/accountsStore';
import { useFilterStore } from '../../store/filterStore';
import { listSites, getActiveAccounts, selectAccounts } from '../../api/accountApi';

const DashboardLayout = ({ children }) => {
    const { user, clearAuth } = useAuthStore();
    const { 
        connectedSources = [], 
        userSites = [], 
        activeSiteId, 
        setAccounts 
    } = useAccountsStore();
    const navigate = useNavigate();
    const isAdmin = user?.email === import.meta.env.VITE_SUPER_ADMIN_EMAIL;

    useEffect(() => {
        if (user) {
            listSites()
                .then(res => {
                    const sites = res.data || [];
                    setAccounts({ userSites: sites });
                    // If no activeSiteId is set but we have sites, pick the first one
                    if (!activeSiteId && sites.length > 0) {
                        setAccounts({ activeSiteId: sites[0]._id });
                    }
                })
                .catch(() => { });

            getActiveAccounts(activeSiteId)
                .then(res => {
                    const data = res.data || {};
                    setAccounts({
                        activeGscSite: data.gscSiteUrl || '',
                        activeGa4PropertyId: data.ga4PropertyId || '',
                        activeGoogleAdsCustomerId: data.googleAdsCustomerId || '',
                        activeFacebookAdAccountId: data.facebookAdAccountId || '',
                        syncMetadata: {
                            isHistoricalSyncComplete: data.isHistoricalSyncComplete || false,
                            lastDailySyncAt: data.lastDailySyncAt || null,
                            syncStatus: data.syncStatus || 'idle'
                        }
                    });
                })
                .catch(() => { });
        }
    }, [user, activeSiteId, setAccounts]);

    const handleSiteChange = (e) => {
        const id = e.target.value;
        if (id === 'new') {
            navigate('/connect-accounts?new=true');
        } else {
            setAccounts({ activeSiteId: id });
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
        clearAuth();
        setAccounts({ ga4: {}, gsc: {}, googleAds: {}, facebook: {}, connectedSources: [], gscSites: [], activeGscSite: null });
        localStorage.clear();
        sessionStorage.clear();
        navigate('/');
    };

    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: ChartPieIcon },
        { label: 'Connected Sites', path: '/dashboard/sites', icon: GlobeAltIcon },
        { label: 'AI Analyst', path: '/dashboard/ai-chat', icon: ChatBubbleLeftRightIcon },
        { label: 'Google Search Console', path: '/dashboard/gsc', icon: ChartBarIcon, isSubItem: true },
        { label: 'Google Analytics 4', path: '/dashboard/ga4', icon: ChartBarIcon, isSubItem: true },
        { label: 'Google Ads', path: '/dashboard/google-ads', icon: ChartBarIcon, isSubItem: true },
        { label: 'Facebook Ads', path: '/dashboard/facebook-ads', icon: ChartBarIcon, isSubItem: true },
    ];

    const { searchQuery, setSearchQuery } = useFilterStore();
    const searchInputRef = React.useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) && 
                document.activeElement.tagName !== 'INPUT' && 
                document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="flex h-screen bg-neutral-50 dark:bg-dark-bg font-sans overflow-hidden transition-colors selection:bg-brand-500 selection:text-white">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-dark-surface border-r border-neutral-200 dark:border-neutral-800 hidden md:flex flex-col flex-shrink-0 z-20 shadow-sm relative">
                {/* Decorative background for sidebar */}
                <div className="absolute inset-0 bg-gradient-to-b from-brand-50/30 to-transparent dark:from-brand-900/5 pointer-events-none"></div>

                <div className="p-7 relative z-10">
                    <NavLink to="/dashboard" className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <ChartBarIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                            RankPilot
                        </span>
                    </NavLink>
                </div>

                <div className="px-4 pb-6 relative z-10">
                    <div className="relative group">
                        <div className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 rounded-2xl text-sm font-black text-neutral-800 dark:text-neutral-100 shadow-sm cursor-pointer hover:border-brand-500/50 transition-all active:scale-[0.98]">
                            <div className="flex items-center gap-2.5 truncate">
                                <div className="w-6 h-6 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
                                    <GlobeAltIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                                </div>
                                <span className="truncate">
                                    {userSites.find(s => s._id === activeSiteId)?.siteName || 'Switch Website...'}
                                </span>
                            </div>
                            <ChevronDownIcon className="h-4 w-4 text-neutral-400 group-hover:text-brand-500 transition-colors" strokeWidth={3} />
                        </div>
                        {/* Custom Dropdown Simulation for CSS purposes - would normally be a state-controlled div */}
                        <select
                            value={activeSiteId || ''}
                            onChange={handleSiteChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        >
                            {userSites.length === 0 ? (
                                <option value="">No websites added</option>
                            ) : (
                                userSites.map(site => (
                                    <option key={site._id} value={site._id}>
                                        {site.siteName}
                                    </option>
                                ))
                            )}
                            <option value="new">+ Add Website</option>
                        </select>
                    </div>
                </div>


                <nav className="flex-1 px-3 space-y-1 overflow-y-auto relative z-10 scrollbar-hide">
                    <div className="px-4 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">Main Menu</p>
                    </div>
                    {navItems.filter(i => !i.isSubItem).map((item, i) => (
                        <NavLink
                            key={`nav-${i}`}
                            to={item.path}
                            end={item.path === '/dashboard'}
                            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 group ${isActive
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
                                }`}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-brand-500'} transition-colors`} strokeWidth={2.5} />
                                    <span className="flex-1">{item.label}</span>
                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                                </>
                            )}
                        </NavLink>
                    ))}

                    <div className="px-4 py-4 mt-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">Connections</p>
                    </div>
                    {navItems.filter(i => i.isSubItem).map((item, i) => (
                        <NavLink
                            key={`sub-${i}`}
                            to={item.path}
                            className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 group ${isActive
                                ? 'bg-accent-600/10 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400'
                                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
                                }`}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className={`w-4 h-4 ${isActive ? 'text-accent-500' : 'text-neutral-400 group-hover:text-accent-500'} transition-colors`} strokeWidth={2.5} />
                                    <span>{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 mt-auto">
                    <div className="bg-gradient-to-br from-brand-600 to-accent-600 rounded-2xl p-4 text-white shadow-xl shadow-brand-500/20 relative overflow-hidden group cursor-pointer">
                         <div className="absolute -right-6 -top-6 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                         <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Scale your growth</p>
                         <h4 className="text-xs font-black">Upgrade to Pilot Pro</h4>
                         <button className="mt-3 w-full py-2 bg-white text-brand-600 rounded-lg text-xs font-black hover:bg-neutral-50 transition-colors shadow-sm">
                             View Plans
                         </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-dark-bg relative overflow-hidden">
                {/* Header */}
                <header className="flex-shrink-0 flex items-center justify-between px-8 py-4 bg-white/50 dark:bg-dark-bg/50 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 z-20">
                    <div className="flex items-center gap-8 flex-1">
                        <div className="hidden xl:flex flex-col">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                <span>Platform</span>
                                <span className="text-neutral-300">/</span>
                                <span className="text-brand-500">Overview</span>
                            </div>
                            <h2 className="text-lg font-black text-neutral-900 dark:text-white leading-tight">Insight Dashboard</h2>
                        </div>

                        <div className="hidden lg:flex flex-col flex-1 max-w-md relative group">
                            <div className="flex items-center bg-neutral-100 dark:bg-dark-surface border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-2.5 w-full group focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all shadow-inner relative z-30">
                                <MagnifyingGlassIcon className="w-4 h-4 text-neutral-400 group-focus-within:text-brand-500" strokeWidth={3} />
                                <input 
                                    ref={searchInputRef}
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Press / to search anything..." 
                                    className="bg-transparent border-none focus:ring-0 text-sm font-bold w-full ml-3 text-neutral-900 dark:text-white placeholder:text-neutral-400"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors mr-2"
                                    >
                                        <span className="text-xs font-black">×</span>
                                    </button>
                                )}
                                <div className="hidden sm:flex items-center gap-1.5 ml-1">
                                    <kbd className="px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-card text-[10px] font-black text-neutral-400 shadow-sm transition-colors group-focus-within:border-brand-500/30 group-focus-within:text-brand-500 uppercase">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} K</kbd>
                                </div>
                            </div>

                            {/* Global Search Results Dropdown */}
                            {searchQuery && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-3xl shadow-2xl p-4 z-20 animate-slide-up origin-top overflow-hidden">
                                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-4">
                                        <div className="px-4 py-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Quick Results for "{searchQuery}"</p>
                                            
                                            <div className="space-y-1">
                                                {/* Dashboard Sections */}
                                                {['Growth Matrix', 'Active Insights', 'Top Performing Pages'].filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).map((section, idx) => (
                                                    <button 
                                                        key={`section-res-${idx}`}
                                                        onClick={() => { 
                                                            const id = section.toLowerCase().includes('matrix') ? 'growth-matrix' : 
                                                                       section.toLowerCase().includes('insights') ? 'insights-panel' : 'top-pages-table';
                                                            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                                                            setSearchQuery(''); 
                                                        }}
                                                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-dark-bg transition-all text-left group/sec"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-accent-500/10 text-accent-600 flex items-center justify-center group-hover/sec:bg-accent-500 group-hover/sec:text-white transition-all">
                                                            <ChartBarIcon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-neutral-900 dark:text-white">{section}</p>
                                                            <p className="text-[10px] font-bold text-neutral-500">Dashboard Section</p>
                                                        </div>
                                                        <ArrowRightIcon className="w-4 h-4 ml-auto text-neutral-300 group-hover/sec:text-accent-500 transition-colors" />
                                                    </button>
                                                ))}

                                                {/* Nav Items */}
                                                {navItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase())).map((item, idx) => (
                                                    <button 
                                                        key={`search-res-${idx}`}
                                                        onClick={() => { navigate(item.path); setSearchQuery(''); }}
                                                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all text-left group/res"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-dark-bg flex items-center justify-center group-hover/res:bg-brand-500 group-hover/res:text-white transition-all">
                                                            <item.icon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-neutral-900 dark:text-white">{item.label}</p>
                                                            <p className="text-[10px] font-bold text-neutral-500">Navigation Item</p>
                                                        </div>
                                                        <ChevronRightIcon className="w-4 h-4 ml-auto text-neutral-300 group-hover/res:text-brand-500 transition-colors" />
                                                    </button>
                                                ))}
                                                <button 
                                                    onClick={() => { setSearchQuery(''); navigate('/dashboard/ai-chat'); }}
                                                    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-brand-50 group/ai transition-all text-left"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white">
                                                        <SparklesIcon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-brand-600">Ask AI about "{searchQuery}"</p>
                                                        <p className="text-[10px] font-bold text-brand-400">Natural Language Query</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-neutral-50 dark:bg-dark-surface/50 border-t border-neutral-100 dark:border-neutral-800 mt-2 flex justify-between items-center px-6">
                                        <span className="text-[10px] font-bold text-neutral-400">Tip: Results filter the dashboard table automatically</span>
                                        <span className="text-[10px] font-black text-brand-500">ESC to close</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-neutral-100 dark:bg-dark-surface rounded-xl p-1 border border-neutral-200 dark:border-neutral-800">
                            <button onClick={toggleDark} className="p-2 text-neutral-500 hover:text-brand-500 dark:text-neutral-400 dark:hover:text-brand-400 transition-colors">
                                {isDark ? <SunIcon className="w-5 h-5" strokeWidth={2} /> : <MoonIcon className="w-5 h-5" strokeWidth={2} />}
                            </button>
                            <button className="p-2 text-neutral-500 hover:text-brand-500 dark:text-neutral-400 dark:hover:text-brand-400 transition-colors relative">
                                <BellIcon className="w-5 h-5" strokeWidth={2} />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-semantic-error rounded-full border-2 border-white dark:border-dark-surface animate-bounce"></span>
                            </button>
                        </div>

                        <div className="h-8 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-2"></div>

                        <div className="relative">
                            <button
                                className="flex items-center gap-3 p-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all group"
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            >
                                <div className="relative">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-xl object-cover ring-2 ring-transparent group-hover:ring-brand-500/20 transition-all" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white flex items-center justify-center text-xs font-black shadow-md">
                                            {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U'}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-semantic-success rounded-full border-2 border-white dark:border-dark-bg"></div>
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-xs font-black text-neutral-900 dark:text-white leading-none mb-0.5">{user?.name?.split(' ')[0] || 'User'}</p>
                                    <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 leading-none lowercase">{isAdmin ? 'Admin' : 'Pro Pilot'}</p>
                                </div>
                                <ChevronDownIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 transition-colors" strokeWidth={3} />
                            </button>

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
