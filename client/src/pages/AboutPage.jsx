import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    ChartBarIcon, 
    CpuChipIcon, 
    ShieldCheckIcon, 
    EyeIcon,
    SparklesIcon,
    ArrowRightIcon,
    SunIcon,
    MoonIcon,
    GlobeAltIcon,
    BeakerIcon
} from '@heroicons/react/24/outline';
import { useThemeStore } from '../store/themeStore';
import Logo from '../components/ui/Logo';
import Footer from '../components/ui/Footer';


const AboutPage = () => {
    const { theme, toggleTheme } = useThemeStore();
    const isDark = theme === 'dark';

    return (
        <div className="min-h-screen bg-slate-950 font-sans selection:bg-brand-500/30 selection:text-brand-200 transition-colors duration-500 overflow-x-hidden">

            {/* 1. NAVIGATION — exact same as LandingPage */}
            <nav className="sticky top-0 z-50 border-b border-white/5">
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"/>
                <div className="relative max-w-7xl mx-auto px-6 flex items-center justify-between h-16">

                    {/* Logo */}
                    <NavLink to="/" className="flex items-center gap-2.5">
                        <Logo className="w-8 h-8" textClassName="text-lg text-white" />
                    </NavLink>

                    {/* Nav links — desktop only */}
                    <div className="hidden md:flex items-center gap-8">
                        {[
                            { label:'Home',     path:'/'        },
                            { label:'Features', path:'/#features' },
                            { label:'About',    path:'/about'   },
                        ].map(link => (
                            <NavLink key={link.label} to={link.path}
                                className={({ isActive }) =>
                                    `text-sm font-semibold transition-colors ${
                                        isActive
                                            ? 'text-white'
                                            : 'text-slate-400 hover:text-white'
                                    }`
                                }>
                                {link.label}
                            </NavLink>
                        ))}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button onClick={toggleTheme}
                            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg">
                            {isDark ? <SunIcon className="w-4.5 h-4.5"/> : <MoonIcon className="w-4.5 h-4.5"/>}
                        </button>
                        <NavLink to="/login"
                            className="text-sm font-bold text-slate-400 hover:text-white transition-colors px-3 py-2 hidden sm:block">
                            Log in
                        </NavLink>
                        <NavLink to="/register"
                            className="text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl transition-all shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 active:scale-95">
                            Get Started →
                        </NavLink>
                    </div>
                </div>
            </nav>

            {/* 2. HERO SECTION — dramatic full-width */}
            <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-slate-950 px-6 py-24">

                {/* Background mesh */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-brand-600/15 rounded-full blur-[120px] animate-pulse"/>
                    <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" style={{animationDelay:'1.5s'}}/>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]"/>
                </div>

                <div className="relative z-10 max-w-4xl mx-auto text-center">

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8">
                        <SparklesIcon className="w-3.5 h-3.5 text-brand-400"/>
                        <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Our Mission</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] mb-6">
                        Data is complex.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-blue-400 to-indigo-400">
                            We make it human.
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
                        RankPilot was built so marketers spend less time collecting data and more time acting on it.
                        One AI-first platform. Your entire marketing stack. Plain English insights.
                    </p>
                </div>
            </section>

            {/* 3. STATS STRIP — 4 numbers */}
            <section className="bg-slate-900 border-y border-white/5 py-12 overflow-hidden">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { value:'4+',    label:'Platform Integrations',    sub:'GA4 · GSC · Ads · Meta' },
                            { value:'100%',  label:'Encrypted by Default',     sub:'AES-256-GCM' },
                            { value:'<2min', label:'Setup Time',                sub:'No coding required' },
                            { value:'24/7',  label:'AI Analyst Available',     sub:'Always ready' },
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <div className="text-3xl md:text-4xl font-black text-white mb-1 tabular-nums">{stat.value}</div>
                                <div className="text-xs font-black text-slate-300 mb-0.5">{stat.label}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. CORE VALUES — 3 cards */}
            <section className="py-28 bg-slate-950">
                <div className="max-w-7xl mx-auto px-6">

                    {/* Section header */}
                    <div className="text-center mb-16">
                        <p className="text-brand-500 font-bold text-xs tracking-[0.3em] uppercase mb-4">What We Believe</p>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
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
                                className={`group bg-slate-900 border border-white/8 rounded-3xl p-8 hover:border-white/15 hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl ${v.glow}`}>

                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-2xl ${v.bg} border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <v.icon className={`w-6 h-6 ${v.color}`} strokeWidth={2}/>
                                </div>

                                {/* Badge */}
                                <div className="mb-4">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{v.badge}</span>
                                </div>

                                <h3 className="text-xl font-black text-white mb-3 tracking-tight">{v.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed font-medium">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. THE STORY — split layout */}
            <section className="py-28 bg-slate-900 border-y border-white/5 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                        {/* Left — text */}
                        <div>
                            <p className="text-brand-500 font-bold text-xs tracking-[0.3em] uppercase mb-4">Our Story</p>
                            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-8 leading-tight">
                                Why we built<br/>RankPilot.
                            </h2>
                            <div className="space-y-5">
                                {[
                                    "Marketing technology has exploded over the last decade. But while we have more data than ever, most of it sits in isolation. GA4 tells you what happened on your site. Search Console tells you how you were found. Ad platforms tell you how much you spent.",
                                    "Connecting these dots manually takes hours of export, import, and formula debugging. Most teams either give up or hire expensive analysts.",
                                    "RankPilot was built to bridge this gap. By combining large language models with your live marketing data, we let you ask questions in plain English and get instant, actionable answers — as if you had a dedicated analyst available 24/7.",
                                ].map((para, i) => (
                                    <p key={i} className={`text-sm leading-relaxed font-medium ${i === 2 ? 'text-slate-300' : 'text-slate-400'}`}>
                                        {i === 2 ? (
                                            <>
                                                <span className="text-brand-400 font-black">RankPilot</span>
                                                {para.slice(9)}
                                            </>
                                        ) : para}
                                    </p>
                                ))}
                            </div>

                            {/* Timeline */}
                            <div className="mt-10 space-y-4">
                                {[
                                    { year:'2023', label:'Concept born — unified analytics vision' },
                                    { year:'2024', label:'Built GA4 + GSC + Ads integrations' },
                                    { year:'2025', label:'AI Analyst launched with streaming responses' },
                                    { year:'2026', label:'Full platform with 4+ integrations live' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-12 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[10px] font-black text-brand-400">{item.year}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-400">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right — visual */}
                        <div className="relative">
                            <div className="aspect-[4/3] rounded-3xl bg-slate-950 border border-white/10 overflow-hidden shadow-2xl relative group">

                                {/* Background glow */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-500/15 via-transparent to-transparent"/>

                                {/* Center icon */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <CpuChipIcon className="w-28 h-28 text-brand-500/15 group-hover:scale-110 group-hover:text-brand-500/25 transition-all duration-700" strokeWidth={1}/>
                                </div>

                                {/* Floating cards */}
                                <div className="absolute top-8 left-8 p-3.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl"
                                    style={{ animation:'float1 3s ease-in-out infinite' }}>
                                    <div className="flex items-center gap-2">
                                        <ChartBarIcon className="w-5 h-5 text-brand-400"/>
                                        <div>
                                            <p className="text-[10px] font-black text-white">GA4 Sessions</p>
                                            <p className="text-[10px] text-slate-400">+24.3% this week</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-8 right-8 p-3.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl"
                                    style={{ animation:'float2 4s ease-in-out infinite' }}>
                                    <div className="flex items-center gap-2">
                                        <SparklesIcon className="w-5 h-5 text-indigo-400"/>
                                        <div>
                                            <p className="text-[10px] font-black text-white">AI Insight Ready</p>
                                            <p className="text-[10px] text-slate-400">3 opportunities found</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute top-8 right-8 p-3.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl"
                                    style={{ animation:'float1 3.5s ease-in-out infinite', animationDelay:'0.5s' }}>
                                    <div className="flex items-center gap-2">
                                        <EyeIcon className="w-5 h-5 text-teal-400"/>
                                        <div>
                                            <p className="text-[10px] font-black text-white">GSC CTR</p>
                                            <p className="text-[10px] text-slate-400">70.2% rate</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-8 left-8 p-3.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl"
                                    style={{ animation:'float2 4.5s ease-in-out infinite', animationDelay:'1s' }}>
                                    <div className="flex items-center gap-2">
                                        <ShieldCheckIcon className="w-5 h-5 text-green-400"/>
                                        <div>
                                            <p className="text-[10px] font-black text-white">Encrypted</p>
                                            <p className="text-[10px] text-slate-400">AES-256-GCM</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. INTEGRATIONS — platform logos strip */}
            <section className="py-20 bg-slate-950">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8">Unified with your tools</p>
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                        {[
                            { name:'Google Analytics 4', emoji:'📊', color:'text-orange-400' },
                            { name:'Search Console',     emoji:'🔍', color:'text-green-400'  },
                            { name:'Google Ads',         emoji:'📢', color:'text-yellow-400' },
                            { name:'Facebook Ads',       emoji:'📘', color:'text-blue-400'   },
                        ].map(tool => (
                            <div key={tool.name}
                                className="flex items-center gap-2.5 px-5 py-3 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-xl text-slate-300 text-sm font-bold transition-all hover:-translate-y-0.5">
                                <span>{tool.emoji}</span>
                                <span className={tool.color}>{tool.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 7. CTA SECTION — dramatic full-width */}
            <section className="py-28 bg-slate-900 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-600/15 rounded-full blur-[100px]"/>
                </div>
                <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"/>
                        <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Start Today</span>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
                        Ready to pilot<br/>your growth?
                    </h2>
                    <p className="text-slate-400 text-lg font-medium mb-10 max-w-xl mx-auto leading-relaxed">
                        Join data-driven marketing teams who replaced their spreadsheets with RankPilot. Free to start. No credit card required.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                        <NavLink to="/register"
                            className="group flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-2xl transition-all shadow-2xl shadow-brand-500/30 hover:-translate-y-1 active:scale-95 text-base">
                            Get Started Free
                            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                        </NavLink>
                        <NavLink to="/"
                            className="px-8 py-4 text-slate-400 hover:text-white font-bold transition-colors text-base">
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

            <style>{`
                @keyframes float1 {
                    0%, 100% { transform: translateY(0px); }
                    50%       { transform: translateY(-10px); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translateY(0px); }
                    50%       { transform: translateY(-14px); }
                }
            `}</style>
        </div>
    );
};

export default AboutPage;
