import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useThemeStore } from '../../store/themeStore';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useThemeStore();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 transition-all duration-500 hover:scale-105 active:scale-95 overflow-hidden shadow-sm hover:shadow-md dark:shadow-none"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {/* Dynamic Background Gradient */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr ${
                isDark ? 'from-indigo-500/20 to-purple-500/20' : 'from-amber-500/20 to-orange-500/20'
            }`} />
            
            <div className="relative w-5 h-5 flex items-center justify-center">
                {/* Sun Icon — rotates and scales out when dark */}
                <SunIcon 
                    className={`absolute w-full h-full text-amber-500 transition-all duration-500 ease-out transform ${
                        isDark 
                        ? 'rotate-[90deg] scale-0 opacity-0' 
                        : 'rotate-0 scale-100 opacity-100'
                    }`}
                />
                
                {/* Moon Icon — rotates and scales in when dark */}
                <MoonIcon 
                    className={`absolute w-full h-full text-indigo-400 transition-all duration-500 ease-out transform ${
                        isDark 
                        ? 'rotate-0 scale-100 opacity-100' 
                        : 'rotate-[-90deg] scale-0 opacity-0'
                    }`}
                />
            </div>

            {/* Shine effect on hover */}
            <div className="absolute top-0 -left-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/20 dark:to-white/10 opacity-40 group-hover:animate-shine" />

            <style>{`
                @keyframes shine {
                    from { left: -100%; }
                    to { left: 200%; }
                }
                .group:hover .animate-shine {
                    animation: shine 0.8s ease-in-out;
                }
            `}</style>
        </button>
    );
};

export default ThemeToggle;
