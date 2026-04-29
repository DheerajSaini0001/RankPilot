import React from 'react';
import { ChartBarIcon, SparklesIcon, BoltIcon, CursorArrowRaysIcon } from '@heroicons/react/24/outline';
import FeatureLayout from '../../components/ui/FeatureLayout';

const Ga4Feature = () => (
  <FeatureLayout 
    title="Next-Gen Google Analytics 4 Dashboard" 
    badge="Analytics Integration"
    description="Stop fighting with the complex GA4 interface. RankPilot transforms your raw events into actionable business intelligence."
    icon={ChartBarIcon}
  >
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[
        {
          title: "Real-time Tracking",
          desc: "Watch your traffic as it happens with zero latency visualizations.",
          icon: BoltIcon
        },
        {
          title: "Conversion Paths",
          desc: "Understand exactly which channels are driving your sales and leads.",
          icon: CursorArrowRaysIcon
        },
        {
          title: "AI Forecasting",
          desc: "Predict future traffic trends based on historical GA4 performance.",
          icon: SparklesIcon
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

    <div className="mt-20 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">Simplify your data, amplify your results.</h2>
            <p className="text-lg text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">
                RankPilot's GA4 integration pulls data directly from the Google API, bypassing the confusing standard reports. We focus on what matters: **Sessions, Users, Bounce Rate, and Conversions.**
            </p>
            <ul className="space-y-4">
                {["Custom Date Ranges", "Comparison Views", "Goal Tracking", "User Behavior Flow"].map(li => (
                    <li key={li} className="flex items-center gap-3 font-bold text-neutral-700 dark:text-slate-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                        {li}
                    </li>
                ))}
            </ul>
        </div>
        <div className="flex-1 w-full aspect-video rounded-[2.5rem] bg-slate-100 dark:bg-slate-800 border-8 border-white dark:border-slate-900 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-transparent" />
            <div className="p-8">
                <div className="h-4 w-32 bg-brand-500/20 rounded mb-4" />
                <div className="h-8 w-64 bg-brand-500/30 rounded mb-8" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-brand-500/10 rounded-2xl animate-pulse" />
                    <div className="h-32 bg-brand-500/10 rounded-2xl animate-pulse" />
                </div>
            </div>
        </div>
    </div>
  </FeatureLayout>
);

export default Ga4Feature;
