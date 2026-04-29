import React from 'react';
import Logo from '../../components/ui/Logo';
import CompanyLayout from '../../components/ui/CompanyLayout';

const PressKitPage = () => (
    <CompanyLayout 
      title="Press Kit" 
      description="Everything you need to talk about RankPilot, including brand assets, logos, and mission statement."
    >
      <div className="max-w-4xl mx-auto px-6 space-y-12">
          <section>
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-4">About RankPilot</h2>
              <p className="text-neutral-500 dark:text-slate-400 leading-relaxed font-medium">
                  RankPilot is an AI-powered marketing intelligence platform that unifies GA4, Search Console, and Ad data into a single, understandable dashboard. Founded in 2024, our mission is to eliminate the complexity of marketing analytics.
              </p>
          </section>
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-8 border border-neutral-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900">
                  <Logo className="w-12 h-12 mb-6" />
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-2">Primary Logo</h3>
                  <button className="text-sm font-black text-brand-600 dark:text-brand-500">Download SVG →</button>
              </div>
              <div className="p-8 border border-neutral-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900">
                  <Logo className="w-12 h-12 mb-6" isDark={true} />
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-2">Monochrome Logo</h3>
                  <button className="text-sm font-black text-brand-600 dark:text-brand-500">Download SVG →</button>
              </div>
          </section>
      </div>
    </CompanyLayout>
  );

export default PressKitPage;
