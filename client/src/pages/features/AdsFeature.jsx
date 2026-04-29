import React from 'react';
import { CurrencyDollarIcon, BanknotesIcon, PresentationChartLineIcon, UsersIcon, SparklesIcon } from '@heroicons/react/24/outline';
import FeatureLayout from '../../components/ui/FeatureLayout';

const AdsFeature = () => (
  <FeatureLayout 
    title="Unify Your Ad Spend & ROI" 
    badge="Ad Intelligence"
    description="Bridge the gap between Google Ads and Facebook Ads. See exactly where your budget is going and which campaigns are profitable."
    icon={CurrencyDollarIcon}
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-10 rounded-[2.5rem] bg-blue-600 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <CurrencyDollarIcon className="w-24 h-24" />
            </div>
            <div className="relative z-10">
                <h3 className="text-2xl font-black mb-4">Google Ads</h3>
                <p className="text-blue-100 font-medium mb-6">Track Search, Display, and Video campaigns. Monitor CPC, ROAS, and Impression Share effortlessly.</p>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase">Search</span>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase">Display</span>
                </div>
            </div>
        </div>
        <div className="p-10 rounded-[2.5rem] bg-indigo-600 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <UsersIcon className="w-24 h-24" />
            </div>
            <div className="relative z-10">
                <h3 className="text-2xl font-black mb-4">Facebook Ads</h3>
                <p className="text-indigo-100 font-medium mb-6">Monitor Meta performance across Facebook and Instagram. Track CPA, Frequency, and Audience Reach.</p>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase">Feed</span>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase">Reels</span>
                </div>
            </div>
        </div>
    </div>

    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
            { title: "Cross-Platform Attribution", desc: "Compare Google and Facebook side-by-side to see the true impact of your multi-channel marketing.", icon: PresentationChartLineIcon },
            { title: "Automated Reporting", desc: "Stop manual exports. Get automated weekly summaries of your total ad performance.", icon: BanknotesIcon },
            { title: "Budget Optimization", desc: "Our AI highlights underperforming campaigns so you can stop wasting money.", icon: SparklesIcon }
        ].map((item, i) => (
            <div key={i} className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <h4 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight">{item.title}</h4>
                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
            </div>
        ))}
    </div>
  </FeatureLayout>
);

export default AdsFeature;
