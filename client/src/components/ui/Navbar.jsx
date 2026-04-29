import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const navLinks = [
        { label: "Features", path: "/features" },
        { label: "Integrations", path: "/features" },
        { label: "Pricing", path: "/pricing" },
        { label: "About", path: "/about" }
    ];

    return (
        <nav className="sticky top-0 z-50 border-b border-neutral-200 dark:border-white/5">
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl"/>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 sm:h-20">

                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5">
                    <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
                </Link>

                {/* Center links - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-1 bg-neutral-100/50 dark:bg-white/5 p-1 rounded-2xl border border-neutral-200 dark:border-white/5">
                    {navLinks.map(item => (
                        <NavLink 
                            key={item.label} 
                            to={item.path}
                            className={({ isActive }) => `
                                px-4 py-2 text-sm font-bold rounded-xl transition-all duration-300 relative group
                                ${isActive 
                                    ? 'text-brand-600 dark:text-white bg-white dark:bg-white/10 shadow-sm' 
                                    : 'text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white'}
                            `}
                        >
                            {item.label}
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        </NavLink>
                    ))}
                </div>

                {/* CTA buttons and Toggle */}
                <div className="flex items-center gap-1 sm:gap-3">
                    <ThemeToggle />
                    
                    <div className="hidden sm:flex items-center gap-3 ml-1 sm:ml-2">
                        <NavLink to="/login" className="text-sm font-bold text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-colors px-4 py-2">
                            Log in
                        </NavLink>
                        <NavLink to="/register"
                            className="text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 active:scale-95 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer-slide_1.5s_infinite]" />
                            <span className="relative z-10">Get Started</span>
                        </NavLink>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-colors"
                    >
                        {isMobileMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Drawer */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-white/5 animate-in slide-in-from-top duration-300">
                    <div className="flex flex-col p-6 gap-4">
                        {navLinks.map(item => (
                            <NavLink 
                                key={item.label} 
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-lg font-bold text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-white/5 pb-2"
                            >
                                {item.label}
                            </NavLink>
                        ))}
                        <div className="flex flex-col gap-3 pt-2">
                            <NavLink to="/login" 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center justify-center w-full py-4 text-neutral-900 dark:text-white font-bold border border-neutral-200 dark:border-white/10 rounded-2xl">
                                Log in
                            </NavLink>
                            <NavLink to="/register"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center justify-center w-full py-4 bg-brand-600 text-white font-black rounded-2xl shadow-lg shadow-brand-500/25">
                                Get Started
                            </NavLink>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
