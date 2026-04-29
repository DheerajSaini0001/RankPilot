import React from 'react';
import { MagnifyingGlassIcon, ArrowTrendingUpIcon, GlobeAltIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';
import FeatureLayout from '../../components/ui/FeatureLayout';

const GscFeature = () => (
  <FeatureLayout 
    title="Master Your Organic Performance" 
    badge="Search Console"
    description="Unlock the hidden patterns in your search data. Track keywords, monitor indexation, and dominate the SERPs."
    icon={MagnifyingGlassIcon}
  >
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[
        {
          title: "Keyword Intelligence",
          desc: "Discover which queries are actually driving clicks and where you're losing impressions.",
          icon: DocumentMagnifyingGlassIcon
        },
        {
          title: "Rank Tracking",
          desc: "Monitor your average position across every country and device in real-time.",
          icon: ArrowTrendingUpIcon
        },
        {
          title: "Global Visibility",
          desc: "Analyze your global footprint with detailed breakdown by geography.",
          icon: GlobeAltIcon
        }
      ].map((item, i) => (
        <div key={i} className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/5 hover:border-brand-500/50 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <item.icon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-3">{item.title}</h3>
          <p className="text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>

    <div className="mt-20 p-12 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/5 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 w-full space-y-8">
            <div className="space-y-4">
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">The SEO Dashboard You've Been Waiting For</h2>
                <p className="text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">
                    Most SEO tools show you yesterday's data. RankPilot gives you a live look into your Google Search Console performance with beautiful charts and automated insights.
                </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <div className="text-3xl font-black text-brand-600 mb-1">99.9%</div>
                    <div className="text-xs font-black uppercase tracking-widest text-neutral-400">Data Accuracy</div>
                </div>
                <div>
                    <div className="text-3xl font-black text-brand-600 mb-1">Instant</div>
                    <div className="text-xs font-black uppercase tracking-widest text-neutral-400">Sync Speed</div>
                </div>
            </div>
        </div>
        <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950 p-8 rounded-3xl border border-neutral-200 dark:border-white/5">
            <div className="space-y-4">
                {[80, 60, 90, 70].map((w, i) => (
                    <div key={i} className="h-4 bg-brand-500/10 rounded-full overflow-hidden">
                        <div className={`h-full bg-brand-600 rounded-full animate-pulse`} style={{ width: `${w}%`, animationDelay: `${i * 200}ms` }} />
                    </div>
                ))}
            </div>
        </div>
    </div>
  </FeatureLayout>
);

export default GscFeature;
