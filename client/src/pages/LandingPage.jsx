import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    ChartBarIcon, 
    CpuChipIcon, 
    ShieldCheckIcon, 
    ArrowRightIcon,
    AcademicCapIcon,
    SparklesIcon,
    CloudIcon,
    CircleStackIcon,
    ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] transition-colors duration-500 font-sans selection:bg-brand-500 selection:text-white">

            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-white/70 dark:bg-[#0B0F1A]/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex-shrink-0 flex items-center space-x-2">
                            <div className="w-9 h-9 bg-gradient-to-tr from-brand-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                                <ChartBarIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                                RankPilot<span className="text-brand-600">.</span>
                            </span>
                        </div>
                        <div className="hidden md:flex items-center space-x-10">
                            <a href="#features" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-all">Features</a>
                            <a href="#how-it-works" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-all">Integrations</a>
                            <a href="#" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-all">Pricing</a>
                        </div>
                        <div className="flex items-center space-x-5">
                            <NavLink to="/login" className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-brand-600 transition-colors">
                                Log in
                            </NavLink>
                            <NavLink to="/register" className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-500/25">
                                Join Now
                            </NavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-16 pb-12 md:pt-28 md:pb-20 px-4 relative overflow-hidden">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-30 dark:opacity-20 pointer-events-none">
                    <div className="absolute top-20 left-10 w-96 h-96 bg-brand-400 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400 rounded-full blur-[120px]"></div>
                </div>

                <div className="max-w-6xl mx-auto text-center relative z-10">
                    
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.9] mb-8">
                        The AI Command Center <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-blue-500 to-indigo-600">
                            For Your Data.
                        </span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
                        Stop wasting hours in complex dashboards. RankPilot connects your entire marketing stack and lets you talk to your data in plain English.
                    </p>
                    
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
                        <NavLink to="/register" className="group flex items-center justify-center w-full sm:w-auto px-10 py-5 text-lg font-bold rounded-2xl text-white bg-brand-600 hover:bg-brand-700 transition-all transform hover:-translate-y-1 shadow-2xl shadow-brand-500/40">
                            Start Free Trial
                            <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </NavLink>
                        <NavLink to="/login" className="flex items-center justify-center w-full sm:w-auto px-10 py-5 text-lg font-bold rounded-2xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xl shadow-slate-200/20 dark:shadow-none">
                            Watch Video
                        </NavLink>
                    </div>
                </div>
            </section>


            {/* Features Section */}
            <section id="features" className="py-24 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center mb-24">
                        <h2 className="text-brand-600 font-bold text-sm tracking-[0.3em] uppercase mb-4">The Platform</h2>
                        <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                            Turn your chaotic metrics into clear instructions.
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="group bg-white dark:bg-slate-900/50 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-500/10">
                            <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                <CpuChipIcon className="w-8 h-8 text-brand-600" />
                            </div>
                            <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">AI Data Chat</h4>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Ask "What's my ROAS for this week compared to last month?" and get an instant, analyzed answer with visualizations.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group bg-white dark:bg-slate-900/50 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-500/10">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                <CloudIcon className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Unified Stack</h4>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Connect GA4, GSC, Google Ads, and Facebook Ads in seconds. See your entire marketing health on one single screen.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group bg-white dark:bg-slate-900/50 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-500/10">
                            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                <ShieldCheckIcon className="w-8 h-8 text-teal-600" />
                            </div>
                            <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Privacy First</h4>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                We use enterprise-grade AES-256 encryption. Your data is your property; we only query it on-demand to serve your requests.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Data Sources Section */}
            <section className="py-24 bg-slate-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-[100px]"></div>
                <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
                    <h3 className="text-3xl font-black text-white mb-16 tracking-tight">Natively integrates with your tools.</h3>
                    <div className="flex flex-wrap justify-center gap-6">
                        {['Google Analytics', 'Search Console', 'Google Ads', 'Facebook Ads'].map((tool) => (
                            <div key={tool} className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 font-bold hover:bg-white/10 transition-colors">
                                {tool}
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* Footer */}
            <footer className="py-20 bg-slate-50 dark:bg-[#0B0F1A] border-t border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center space-x-2 mb-6">
                                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                                    <ChartBarIcon className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-xl font-black text-slate-900 dark:text-white">RankPilot<span className="text-brand-600">.</span></span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                                AI-powered analytics for the next generation of marketing teams. Direct integration. Instant insights.
                            </p>
                        </div>
                        <div>
                            <h5 className="font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Product</h5>
                            <ul className="space-y-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                <li><a href="#" className="hover:text-brand-600 transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-brand-600 transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-brand-600 transition-colors">Integrations</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Company</h5>
                            <ul className="space-y-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                <li><a href="#" className="hover:text-brand-600 transition-colors">About</a></li>
                                <li><a href="#" className="hover:text-brand-600 transition-colors">Privacy</a></li>
                                <li><a href="#" className="hover:text-brand-600 transition-colors">Terms</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-12 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center text-sm font-medium text-slate-400 dark:text-slate-500">
                        <p>&copy; {new Date().getFullYear()} RankPilot AI. All rights reserved.</p>
                        <div className="flex space-x-6 mt-6 md:mt-0">
                            <a href="#" className="hover:text-brand-600">Twitter</a>
                            <a href="#" className="hover:text-brand-600">LinkedIn</a>
                            <a href="#" className="hover:text-brand-600">Github</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;

