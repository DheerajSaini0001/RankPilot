import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Footer from './Footer';
import Navbar from './Navbar';

const PolicyLayout = ({ title, lastUpdated, children }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30 transition-colors duration-500">
      <Navbar />

      <header className="pt-8 pb-12 bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-white/5">
        <div className="max-w-full mx-auto px-8">
          <NavLink to="/" className="text-sm font-bold text-brand-600 dark:text-brand-500 hover:underline mb-4 inline-block">
            ← Back to Home
          </NavLink>
          <h1 className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-4">
            {title}
          </h1>
          <p className="text-neutral-500 dark:text-slate-400 font-medium text-sm uppercase tracking-widest">
            Last Updated: {lastUpdated}
          </p>
        </div>
      </header>

      <main className="py-8 md:py-16">
        <div className="max-w-full mx-auto px-8 prose prose-neutral dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:leading-relaxed prose-p:text-neutral-600 dark:prose-p:text-slate-400 prose-li:text-neutral-600 dark:prose-li:text-slate-400">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PolicyLayout;
