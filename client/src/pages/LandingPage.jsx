import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    ChartBarIcon, 
    CpuChipIcon, 
    ShieldCheckIcon, 
    ArrowRightIcon,
    CloudIcon,
    SunIcon,
    MoonIcon
} from '@heroicons/react/24/outline';
import { useThemeStore } from '../store/themeStore';
import Logo from '../components/ui/Logo';


const LandingPage = () => {
    const { theme, toggleTheme } = useThemeStore();
    const isDark = theme === 'dark';

    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30 selection:text-brand-200 transition-colors duration-500">

            {/* 1. NAVIGATION — glassmorphism sticky nav */}
            <nav className="sticky top-0 z-50 border-b border-neutral-200 dark:border-white/5">
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl"/>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 sm:h-20">

                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>

                    {/* Center links - Hidden on mobile */}
                    <div className="hidden md:flex items-center gap-8">
                        {['Features','Integrations','Pricing'].map(link => (
                            <a key={link} href={`#${link === 'Features' ? 'features' : link === 'Integrations' ? 'how-it-works' : link.toLowerCase()}`}
                                className="text-sm font-semibold text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-colors">
                                {link}
                            </a>
                        ))}
                        <NavLink to="/about" className="text-sm font-semibold text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-colors">
                            About
                        </NavLink>
                    </div>

                    {/* CTA buttons and Toggle */}
                    <div className="flex items-center gap-1 sm:gap-3">
                        <button 
                            onClick={toggleTheme}
                            className="p-2 text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-colors"
                        >
                            {isDark ? <SunIcon className="w-5 h-5"/> : <MoonIcon className="w-5 h-5"/>}
                        </button>
                        
                        <div className="hidden sm:flex items-center gap-3">
                            <NavLink to="/login" className="text-sm font-bold text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-colors px-4 py-2">
                                Log in
                            </NavLink>
                            <NavLink to="/register"
                                className="text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 active:scale-95">
                                Get Started
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
                            {['Features','Integrations','Pricing'].map(link => (
                                <a key={link} 
                                    href={`#${link === 'Features' ? 'features' : link === 'Integrations' ? 'how-it-works' : link.toLowerCase()}`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-lg font-bold text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-white/5 pb-2">
                                    {link}
                                </a>
                            ))}
                            <NavLink to="/about" 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-lg font-bold text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-white/5 pb-2">
                                About
                            </NavLink>
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

            {/* 2. HERO SECTION — dramatic bg */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-white dark:bg-slate-950 px-6 py-24 transition-colors duration-500">

                {/* Animated background mesh */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-[140px] animate-pulse"/>
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[120px] animate-pulse" style={{animationDelay:'1s'}}/>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-[100px]"/>
                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"/>
                </div>

                <div className="relative z-10 max-w-5xl mx-auto text-center">

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"/>
                        <span className="text-xs font-black text-brand-400 uppercase tracking-widest">AI-Powered Analytics Platform</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-neutral-900 dark:text-white tracking-tighter leading-[1.1] sm:leading-[0.9] mb-6">
                        Your Data.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-blue-500 to-indigo-600 dark:from-brand-400 dark:via-blue-400 dark:to-indigo-400">
                            Finally Clear.
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-xl text-neutral-500 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
                        Stop switching between GA4, Search Console, Google Ads, and Facebook Ads.
                        RankPilot unifies your entire marketing stack — then lets your AI analyst explain it in plain English.
                    </p>

                    {/* CTA buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <NavLink to="/register"
                            className="group flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-2xl transition-all shadow-2xl shadow-brand-500/30 hover:-translate-y-1 active:scale-95 text-base">
                            Start Free Trial
                            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                        </NavLink>
                        <NavLink to="/login"
                            className="flex items-center gap-2 px-8 py-4 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white font-bold rounded-2xl border border-neutral-200 dark:border-white/10 transition-all text-base shadow-sm dark:shadow-none">
                            Sign In
                        </NavLink>
                    </div>

                    {/* Social proof strip */}
                    <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-neutral-400 dark:text-slate-500">
                        {['No credit card required','Setup in 2 minutes','GA4 · GSC · Google Ads · Meta'].map((item,i) => (
                            <span key={i} className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-brand-500"/>
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* 3. INTEGRATION LOGOS STRIP */}
            <section className="bg-neutral-50 dark:bg-slate-900 border-y border-neutral-200 dark:border-white/5 py-10 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <p className="text-center text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-slate-500 mb-8">Natively connects with</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        {[
                            { name:'Google Analytics 4', emoji:'📊' },
                            { name:'Search Console',     emoji:'🔍' },
                            { name:'Google Ads',         emoji:'📢' },
                            { name:'Facebook Ads',       emoji:'📘' },
                        ].map(tool => (
                            <div key={tool.name}
                                className="flex items-center gap-2.5 px-5 py-3 bg-white dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/8 border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-600 dark:text-slate-300 text-sm font-bold transition-colors shadow-sm dark:shadow-none">
                                <span>{tool.emoji}</span>
                                {tool.name}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. FEATURES SECTION — 3 cards with icons */}
            <section id="features" className="py-28 bg-white dark:bg-slate-950 transition-colors duration-500">
                <div className="max-w-7xl mx-auto px-6">

                    {/* Section header */}
                    <div className="text-center mb-20">
                        <p className="text-brand-600 dark:text-brand-500 font-bold text-xs tracking-[0.3em] uppercase mb-4">The Platform</p>
                        <h2 className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-4">
                            Everything in one place.
                        </h2>
                        <p className="text-neutral-500 dark:text-slate-400 text-lg font-medium max-w-xl mx-auto">
                            Connect your tools once. Get unified insights forever.
                        </p>
                    </div>

                    {/* Feature cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: CpuChipIcon,
                                color: 'text-brand-400',
                                bg: 'bg-brand-500/10 border-brand-500/20',
                                title: 'AI Data Chat',
                                desc: 'Ask "What\'s my ROAS this week vs last month?" and get an instant analyzed answer with visualizations — no SQL, no formulas.'
                            },
                            {
                                icon: CloudIcon,
                                color: 'text-indigo-400',
                                bg: 'bg-indigo-500/10 border-indigo-500/20',
                                title: 'Unified Stack',
                                desc: 'Connect GA4, GSC, Google Ads, and Facebook Ads in seconds. One dashboard. One source of truth.'
                            },
                            {
                                icon: ShieldCheckIcon,
                                color: 'text-teal-400',
                                bg: 'bg-teal-500/10 border-teal-500/20',
                                title: 'Privacy First',
                                desc: 'Enterprise-grade AES-256 encryption. Your data is your property — we only query it on demand.'
                            },
                        ].map((f, i) => (
                            <div key={i}
                                className="group bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/8 rounded-3xl p-8 hover:border-brand-500/30 dark:hover:border-brand-500/30 hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl dark:shadow-none">
                                <div className={`w-12 h-12 rounded-2xl ${f.bg} border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <f.icon className={`w-6 h-6 ${f.color}`}/>
                                </div>
                                <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-3 tracking-tight">{f.title}</h3>
                                <p className="text-neutral-500 dark:text-slate-400 leading-relaxed font-medium text-sm">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. HOW IT WORKS SECTION — 3 steps */}
            <section id="how-it-works" className="py-28 bg-neutral-100 dark:bg-slate-900 transition-colors">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <p className="text-brand-600 dark:text-brand-500 font-bold text-xs tracking-[0.3em] uppercase mb-4">How It Works</p>
                    <h2 className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-16">Up and running in minutes.</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { step:'01', title:'Connect', desc:'Link your Google and Facebook accounts in one click. OAuth — no API keys needed.' },
                            { step:'02', title:'Sync',    desc:'RankPilot automatically pulls your data and builds your unified dashboard.' },
                            { step:'03', title:'Ask',     desc:'Type any question about your marketing performance. Get instant AI-powered answers.' },
                        ].map((s,i) => (
                            <div key={i} className="relative flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-2xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center mb-5">
                                    <span className="text-xl font-black text-brand-400">{s.step}</span>
                                </div>
                                {i < 2 && (
                                    <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-brand-500/30 to-transparent"/>
                                )}
                                <h3 className="text-lg font-black text-neutral-900 dark:text-white mb-2">{s.title}</h3>
                                <p className="text-neutral-500 dark:text-slate-400 text-sm font-medium leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. CTA SECTION — full width dramatic */}
            <section className="py-28 bg-white dark:bg-slate-950 relative overflow-hidden transition-colors">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-600/20 rounded-full blur-[100px]"/>
                </div>
                <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-4">
                        Ready to understand your data?
                    </h2>
                    <p className="text-neutral-500 dark:text-slate-400 text-lg font-medium mb-10">
                        Join hundreds of marketers who replaced their spreadsheets with RankPilot.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <NavLink to="/register"
                            className="group flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-2xl transition-all shadow-2xl shadow-brand-500/30 hover:-translate-y-1 active:scale-95 text-base">
                            Start Free Trial
                            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                        </NavLink>
                        <NavLink to="/login"
                            className="px-8 py-4 text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white font-bold transition-colors text-base">
                            Already have an account →
                        </NavLink>
                    </div>
                </div>
            </section>

            {/* 7. FOOTER — clean */}
            <footer className="bg-neutral-50 dark:bg-slate-950 border-t border-neutral-100 dark:border-white/5 py-16 transition-colors">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">

                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <Logo className="w-7 h-7" textClassName="text-base text-neutral-900 dark:text-white" />
                            </div>
                            <p className="text-neutral-400 dark:text-slate-500 text-xs font-medium leading-relaxed max-w-[200px]">
                                AI-powered analytics for the next generation of marketing teams.
                            </p>
                        </div>

                        {/* Product */}
                        <div>
                            <h5 className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-widest mb-4">Product</h5>
                            <ul className="space-y-3">
                                {['Features','Pricing','Integrations'].map(l => (
                                    <li key={l}><a href="#" className="text-xs font-semibold text-neutral-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-white transition-colors">{l}</a></li>
                                ))}
                            </ul>
                        </div>

                        {/* Company */}
                        <div>
                            <h5 className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-widest mb-4">Company</h5>
                            <ul className="space-y-3">
                                <li><NavLink to="/about"   className="text-xs font-semibold text-neutral-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-white transition-colors">About</NavLink></li>
                                <li><a href="#" className="text-xs font-semibold text-neutral-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-white transition-colors">Privacy</a></li>
                                <li><a href="#" className="text-xs font-semibold text-neutral-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-white transition-colors">Terms</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs font-medium text-slate-600">© {new Date().getFullYear()} RankPilot AI. All rights reserved.</p>
                        <div className="flex items-center gap-6">
                            {['Twitter','LinkedIn','GitHub'].map(s => (
                                <a key={s} href="#" className="text-xs font-semibold text-slate-600 hover:text-white transition-colors">{s}</a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;


