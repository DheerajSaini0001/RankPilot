import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Footer from './Footer';
import Navbar from './Navbar';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const FeatureLayout = ({ title, badge, description, icon: Icon, children }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30 transition-colors duration-500">
      <Navbar />

      <header className="pt-12 pb-16 bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-600/10 rounded-full blur-[100px]"/>
        </div>
        
        <div className="max-w-full mx-auto px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <span className="inline-block px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-black uppercase tracking-widest mb-4">
                {badge}
              </span>
              <h1 className="text-4xl md:text-6xl font-black text-neutral-900 dark:text-white tracking-tight mb-6">
                {title}
              </h1>
              <p className="text-lg md:text-xl text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">
                {description}
              </p>
            </div>
            {Icon && (
              <div className="hidden lg:block">
                <Icon className="w-32 h-32 text-brand-600/20 dark:text-brand-500/20" />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="py-12 md:py-20">
        <div className="max-w-full mx-auto px-8">
          {children}

          {/* CTA Section */}
          <div className="mt-24 p-12 rounded-[2.5rem] bg-brand-600 text-white relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-50"/>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">Ready to pilot your growth?</h2>
                <p className="text-brand-100 text-lg font-medium">Start unifying your marketing data today. No credit card required.</p>
              </div>
              <NavLink 
                to="/register" 
                className="bg-white text-brand-600 px-8 py-4 rounded-2xl font-black text-lg flex items-center gap-2 hover:scale-105 transition-all shadow-2xl shadow-black/20"
              >
                Try RankPilot Free
                <ArrowRightIcon className="w-5 h-5" />
              </NavLink>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FeatureLayout;
