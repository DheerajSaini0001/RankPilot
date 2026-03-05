import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChartBarIcon, CpuChipIcon, ShieldCheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg transition-colors duration-300 font-sans selection:bg-brand-500 selection:text-white">
            {/* Navigation */}
            <nav className="fixed w-full z-50 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">
                                RankPilot
                            </span>
                            <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                                AI
                            </span>
                        </div>
                        <div className="hidden md:flex space-x-8">
                            <a href="#features" className="text-neutral-600 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors">Features</a>
                            <a href="#how-it-works" className="text-neutral-600 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors">How it works</a>
                        </div>
                        <div className="flex items-center space-x-4">
                            <NavLink to="/login" className="text-neutral-600 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors">
                                Log in
                            </NavLink>
                            <NavLink to="/register" className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-full font-medium transition-all transform hover:scale-105 shadow-md hover:shadow-lg">
                                Get Started
                            </NavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-4 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-400/20 dark:bg-brand-600/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <h1 className="text-5xl md:text-7xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-tight mb-6">
                        Unlock Analytics with <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-blue-400">
                            Artificial Intelligence
                        </span>
                    </h1>
                    <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto">
                        Connect Google Analytics, Search Console, and Facebook Ads. Ask questions in plain English, get instant visual insights, and stop drowning in dashboards.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                        <NavLink to="/register" className="flex items-center justify-center w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-full text-white bg-brand-600 hover:bg-brand-700 transition-all transform hover:-translate-y-1 shadow-xl shadow-brand-500/30">
                            Start for free
                            <ArrowRightIcon className="w-5 h-5 ml-2" />
                        </NavLink>
                        <NavLink to="/login" className="flex items-center justify-center w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-full text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-all">
                            View Live Demo
                        </NavLink>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-neutral-50 dark:bg-dark-surface border-y border-neutral-100 dark:border-neutral-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-sm font-bold tracking-wide text-brand-600 uppercase">Features</h2>
                        <h3 className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
                            Everything you need to grow
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {/* Feature 1 */}
                        <div className="bg-white dark:bg-dark-card rounded-2xl p-8 shadow-sm border border-neutral-100 dark:border-neutral-800 hover:shadow-lg transition-shadow duration-300">
                            <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center mb-6">
                                <CpuChipIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <h4 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">AI Analyst</h4>
                            <p className="text-neutral-600 dark:text-neutral-400">
                                Powered by Claude 3.5 Sonnet. Ask "Why did traffic drop this week?" and get precise answers derived directly from your live connected data sources.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white dark:bg-dark-card rounded-2xl p-8 shadow-sm border border-neutral-100 dark:border-neutral-800 hover:shadow-lg transition-shadow duration-300">
                            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-6">
                                <ChartBarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <h4 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Unified Reporting</h4>
                            <p className="text-neutral-600 dark:text-neutral-400">
                                Stop switching tabs. We aggregate Google Analytics 4, Search Console, Google Ads, and Facebook Ads into a single, beautiful dashboard.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white dark:bg-dark-card rounded-2xl p-8 shadow-sm border border-neutral-100 dark:border-neutral-800 hover:shadow-lg transition-shadow duration-300">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mb-6">
                                <ShieldCheckIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h4 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Bank-grade Security</h4>
                            <p className="text-neutral-600 dark:text-neutral-400">
                                Your platform connection tokens are encrypted at rest using AES-256-GCM. We never store your actual analytics row data, querying it fresh every time.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white dark:bg-dark-bg py-12 border-t border-neutral-200 dark:border-neutral-800 text-center">
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                    &copy; {new Date().getFullYear()} RankPilot AI. Built for modern marketers.
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
