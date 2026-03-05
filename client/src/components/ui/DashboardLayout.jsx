import React, { useState } from 'react';
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
    ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';

const DashboardLayout = ({ children }) => {
    const { user, clearAuth } = useAuthStore();
    const navigate = useNavigate();
    const isAdmin = user?.email === import.meta.env.VITE_SUPER_ADMIN_EMAIL;

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
        navigate('/login');
    };

    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: ChartPieIcon },
        { label: 'AI Analyst', path: '/dashboard/ai-chat', icon: ChatBubbleLeftRightIcon },
        { label: 'Integrations', path: '/connect-accounts', icon: Cog6ToothIcon },
        { label: 'Settings', path: '/settings', icon: WrenchIcon }
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

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto relative z-10">
                    {navItems.map((item, i) => (
                        <NavLink
                            key={i}
                            to={item.path}
                            end={item.path === '/dashboard' || item.path === '/'}
                            className={({ isActive }) => `flex items-center p-3 rounded-xl font-semibold transition-all duration-200 ${isActive
                                ? 'bg-gradient-to-r from-brand-50 to-white dark:from-brand-900/20 dark:to-dark-card text-brand-700 dark:text-brand-400 shadow-sm border border-brand-100 dark:border-brand-800/50'
                                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white border border-transparent'
                                }`}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className="w-5 h-5 mr-3" strokeWidth={isActive ? 2 : 1.5} />
                                    {item.label}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-dark-surface/20 relative z-10">
                    <div className="flex items-center p-3 mb-4 rounded-xl bg-white dark:bg-dark-card border border-neutral-100 dark:border-neutral-800 shadow-sm">
                        <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=3B8ED4&color=fff`} alt="Avatar" className="w-10 h-10 rounded-full ring-2 ring-brand-50 dark:ring-brand-900/30" />
                        <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate tracking-wide">{user?.email}</p>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <button onClick={toggleDark} className="flex-1 p-2.5 rounded-xl bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors shadow-sm">
                            {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                        </button>
                        <button onClick={handleLogout} className="flex-1 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors shadow-sm">
                            <ArrowRightOnRectangleIcon className="w-5 h-5" strokeWidth={2} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-neutral-50/50 dark:bg-dark-bg p-6 md:p-8 relative">
                {/* Top Subtle Gradient */}
                <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none z-0"></div>
                <div className="relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
