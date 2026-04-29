import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    ShieldCheckIcon, 
    SparklesIcon,
    ArrowRightIcon,
    GlobeAltIcon,
    BeakerIcon
} from '@heroicons/react/24/outline';
import { useThemeStore } from '../store/themeStore';
import Logo from '../components/ui/Logo';
import Footer from '../components/ui/Footer';
import ThemeToggle from '../components/ui/ThemeToggle';


const AboutPage = () => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30 selection:text-brand-200 transition-colors duration-500 overflow-x-hidden">

            {/* 1. NAVIGATION — glassmorphism sticky nav */}
            <nav className="sticky top-0 z-50 border-b border-neutral-200 dark:border-white/5">
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl"/>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 sm:h-20">

                    {/* Logo */}
                    <NavLink to="/" className="flex items-center gap-2.5">
                        <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
                    </NavLink>

                    {/* Center links - Hidden on mobile */}
                    <div className="hidden md:flex items-center gap-8">
                        {[
                            { label: 'Features', path: '/#features' },
                            { label: 'Integrations', path: '/#how-it-works' },
                            { label: 'Pricing', path: '/#pricing' },
                        ].map(link => (
                            <NavLink key={link.label} to={link.path}
                                className="text-sm font-semibold text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-colors">
                                {link.label}
                            </NavLink>
                        ))}
                        <NavLink to="/about" 
                            className={({ isActive }) => 
                                `text-sm font-semibold transition-colors ${isActive ? 'text-brand-600 dark:text-white' : 'text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white'}`
                            }>
                            About
                        </NavLink>
                    </div>

                    {/* CTA buttons and Toggle */}
                    <div className="flex items-center gap-1 sm:gap-3">
                        <ThemeToggle />
                        
                        <div className="hidden sm:flex items-center gap-3 ml-1 sm:ml-2">
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
                            {[
                                { label: 'Features', path: '/#features' },
                                { label: 'Integrations', path: '/#how-it-works' },
                                { label: 'Pricing', path: '/#pricing' },
                            ].map(link => (
                                <NavLink key={link.label} 
                                    to={link.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-lg font-bold text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-white/5 pb-2">
                                    {link.label}
                                </NavLink>
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

            {/* 2. HERO SECTION — dramatic full-width */}
            <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden bg-white dark:bg-slate-950 px-6 pt-12 pb-20">

                {/* Background mesh */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-brand-600/15 rounded-full blur-[120px] animate-pulse"/>
                    <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" style={{animationDelay:'1.5s'}}/>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]"/>
                </div>

                <div className="relative z-10 max-w-4xl mx-auto text-center">

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6">
                        <SparklesIcon className="w-3.5 h-3.5 text-brand-400"/>
                        <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Our Mission</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-neutral-900 dark:text-white tracking-tighter leading-[0.9] mb-6">
                        Data is complex.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-blue-400 to-indigo-400">
                            We make it human.
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-xl text-neutral-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
                        RankPilot was built so marketers spend less time collecting data and more time acting on it.
                        One AI-first platform. Your entire marketing stack. Plain English insights.
                    </p>
                </div>
            </section>



            {/* 3. CORE VALUES — 3 cards */}
            <section className="py-20 bg-neutral-50 dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-6">

                    {/* Section header */}
                    <div className="text-center mb-16">
                        <p className="text-brand-500 font-bold text-xs tracking-[0.3em] uppercase mb-4">What We Believe</p>
                        <h2 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
                            Our core principles.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: BeakerIcon,
                                color: 'text-brand-400',
                                bg:   'bg-brand-500/10 border-brand-500/20',
                                glow: 'group-hover:shadow-brand-500/20',
                                title: 'Intelligence First',
                                desc:  "We don't just show charts. Our AI analyzes patterns across GSC, GA4, and Ads to tell you exactly what to do next — in plain English.",
                                badge: '🧠 AI-Powered'
                            },
                            {
                                icon: ShieldCheckIcon,
                                color: 'text-teal-400',
                                bg:   'bg-teal-500/10 border-teal-500/20',
                                glow: 'group-hover:shadow-teal-500/20',
                                title: 'Privacy Locked',
                                desc:  "Your marketing data is your competitive edge. We use enterprise-grade AES-256 encryption and only query APIs on-demand.",
                                badge: '🔐 Encrypted'
                            },
                            {
                                icon: GlobeAltIcon,
                                color: 'text-indigo-400',
                                bg:   'bg-indigo-500/10 border-indigo-500/20',
                                glow: 'group-hover:shadow-indigo-500/20',
                                title: 'Unified Stack',
                                desc:  "Silos are for farms, not data. RankPilot unifies your entire marketing stack into one cohesive, queryable source of truth.",
                                badge: '🔗 Connected'
                            },
                        ].map((v, i) => (
                            <div key={i}
                                className={`group bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/8 rounded-3xl p-8 hover:border-brand-500/30 dark:hover:border-white/15 hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl ${v.glow}`}>

                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-2xl ${v.bg} border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <v.icon className={`w-6 h-6 ${v.color}`} strokeWidth={2}/>
                                </div>

                                {/* Badge */}
                                <div className="mb-4">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{v.badge}</span>
                                </div>

                                <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-3 tracking-tight">{v.title}</h3>
                                <p className="text-sm text-neutral-500 dark:text-slate-400 leading-relaxed font-medium">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. THE STORY — simplified text focus */}
            <section className="py-20 bg-white dark:bg-slate-900 border-y border-neutral-200 dark:border-white/5 overflow-hidden">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <p className="text-brand-500 font-bold text-xs tracking-[0.3em] uppercase mb-4">Our Story</p>
                        <h2 className="text-3xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-8 leading-tight">
                            Why we built RankPilot.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                        <div className="space-y-6">
                            {[
                                "Marketing technology has exploded over the last decade. But while we have more data than ever, most of it sits in isolation. GA4 tells you what happened on your site. Search Console tells you how you were found. Ad platforms tell you how much you spent.",
                                "Connecting these dots manually takes hours of export, import, and formula debugging. Most teams either give up or hire expensive analysts.",
                            ].map((para, i) => (
                                <p key={i} className="text-base leading-relaxed font-medium text-neutral-500 dark:text-slate-400">
                                    {para}
                                </p>
                            ))}
                        </div>
                        <div className="space-y-6">
                            <p className="text-base leading-relaxed font-medium text-neutral-700 dark:text-slate-300">
                                <span className="text-brand-400 font-black">RankPilot</span> was built to bridge this gap. By combining large language models with your live marketing data, we let you ask questions in plain English and get instant, actionable answers — as if you had a dedicated analyst available 24/7.
                            </p>
                            {/* Simplified Timeline */}
                            <div className="pt-4 space-y-4">
                                {[
                                    { year:'2023', label:'Concept born — unified analytics vision' },
                                    { year:'2024', label:'Built GA4 + GSC + Ads integrations' },
                                    { year:'2025', label:'AI Analyst launched globally' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-12 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[10px] font-black text-brand-400">{item.year}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-neutral-500 dark:text-slate-400">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>



            {/* 5. CTA SECTION — dramatic full-width */}
            <section className="py-28 bg-neutral-50 dark:bg-slate-900 border-t border-neutral-200 dark:border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-600/15 rounded-full blur-[100px]"/>
                </div>
                <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"/>
                        <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Start Today</span>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-4 leading-tight">
                        Ready to pilot<br/>your growth?
                    </h2>
                    <p className="text-neutral-500 dark:text-slate-400 text-lg font-medium mb-10 max-w-xl mx-auto leading-relaxed">
                        Join data-driven marketing teams who replaced their spreadsheets with RankPilot. Free to start. No credit card required.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                        <NavLink to="/register"
                            className="group flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-2xl transition-all shadow-2xl shadow-brand-500/30 hover:-translate-y-1 active:scale-95 text-base">
                            Get Started Free
                            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                        </NavLink>
                        <NavLink to="/"
                            className="px-8 py-4 text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white font-bold transition-colors text-base">
                            ← Back to Home
                        </NavLink>
                    </div>

                    {/* Trust badges */}
                    <div className="flex flex-wrap items-center justify-center gap-5">
                        {['🔒 AES-256 Encrypted','⚡ 2 min setup','🤖 AI-powered','🆓 Free to start'].map((badge,i) => (
                            <span key={i} className="text-[11px] font-bold text-slate-500">{badge}</span>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />


        </div>
    );
};

export default AboutPage;
