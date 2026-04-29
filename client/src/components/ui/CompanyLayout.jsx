import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Footer from './Footer';
import Navbar from './Navbar';

const CompanyLayout = ({ title, description, children }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30 transition-colors duration-500">
      <Navbar />

      <header className="pt-8 pb-12 bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-white/5 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-50">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-600/10 rounded-full blur-[100px]"/>
        </div>
        <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-black text-neutral-900 dark:text-white tracking-tight mb-6">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-neutral-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        </div>
      </header>

      <main className="py-8 md:py-16">
        {children}
      </main>

      <Footer />
    </div>
  );
};

export default CompanyLayout;
