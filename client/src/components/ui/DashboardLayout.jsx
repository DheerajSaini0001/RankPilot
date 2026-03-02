import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    HomeIcon,
    Cog6ToothIcon,
    WrenchIcon,
    ArrowRightOnRectangleIcon,
    MoonIcon,
    SunIcon
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
        { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { label: 'Integrations', path: '/connect-accounts', icon: Cog6ToothIcon },
        { label: 'Settings', path: '/settings', icon: WrenchIcon }
    ];

    if (isAdmin) {
        navItems.push({ label: 'Super Admin', path: '/dashboard/admin', icon: WrenchIcon });
    }

    return (
        <div className="flex h-screen bg-neutral-50 dark:bg-dark-bg font-sans overflow-hidden transition-colors">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-dark-surface border-r border-neutral-200 dark:border-neutral-700 hidden md:flex flex-col flex-shrink-0">
                <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
                    <h2 className="text-xl font-bold text-brand-600 dark:text-brand-400">RankPilot AI</h2>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item, i) => (
                        <NavLink
                            key={i}
                            to={item.path}
                            className={({ isActive }) => `flex items-center p-3 rounded-lg font-medium transition-colors ${isActive
                                    ? 'bg-brand-50 text-brand-600 dark:bg-dark-card dark:text-brand-400'
                                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                                }`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-dark-surface">
                    <div className="flex items-center mb-4">
                        <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=3B8ED4&color=fff`} alt="Avatar" className="w-8 h-8 rounded-full" />
                        <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={toggleDark} className="flex-1 p-2 rounded-lg bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 flex items-center justify-center">
                            {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                        </button>
                        <button onClick={handleLogout} className="flex-1 p-2 rounded-lg bg-semantic-error text-white hover:bg-red-700 flex items-center justify-center">
                            <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-neutral-50 dark:bg-dark-bg p-6 md:p-8">
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
