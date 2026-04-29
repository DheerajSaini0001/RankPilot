import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    ChartBarIcon, 
    MagnifyingGlassIcon, 
    CurrencyDollarIcon, 
    SparklesIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';
import Navbar from '../components/ui/Navbar';
import Footer from '../components/ui/Footer';

const FeaturesPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    {
      title: "Google Analytics 4",
      desc: "Detailed traffic analysis, conversion tracking, and user behavior insights.",
      path: "/features/ga4",
      icon: ChartBarIcon,
      color: "bg-blue-500"
    },
    {
      title: "Search Console",
      desc: "Keyword rankings, impression data, and organic growth monitoring.",
      path: "/features/gsc",
      icon: MagnifyingGlassIcon,
      color: "bg-green-500"
    },
    {
      title: "Ad Intelligence",
      desc: "Unified reporting for Google Ads and Facebook Ads performance.",
      path: "/features/ads",
      icon: CurrencyDollarIcon,
      color: "bg-indigo-500"
    },
    {
        title: "AI Co-Pilot",
        desc: "Ask your data questions and get instant insights in plain English.",
        path: "/features/ai",
        icon: SparklesIcon,
        color: "bg-brand-600"
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30 transition-colors duration-500">
      <Navbar />

      <header className="pt-16 pb-24 bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-white/5 relative overflow-hidden">
        <div className="max-w-full mx-auto px-8 relative z-10 text-center">
          <h1 className="text-4xl md:text-7xl font-black text-neutral-900 dark:text-white tracking-tight mb-8">
            Powering Your <span className="text-brand-600">Marketing ROI</span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-500 dark:text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
            RankPilot unifies your most critical marketing data into a single, understandable command center.
          </p>
        </div>
      </header>

      <main className="py-24 px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
            {features.map((feature) => (
                <NavLink 
                    key={feature.title}
                    to={feature.path}
                    className="group p-10 rounded-[3rem] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/5 hover:border-brand-500/50 transition-all hover:shadow-2xl flex flex-col justify-between"
                >
                    <div className="space-y-6">
                        <div className={`w-16 h-16 rounded-[1.5rem] ${feature.color}/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <feature.icon className={`w-8 h-8 ${feature.color.replace('bg-', 'text-')}`} />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">{feature.title}</h3>
                            <p className="text-lg text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">{feature.desc}</p>
                        </div>
                    </div>
                    <div className="mt-12 flex items-center gap-2 font-black text-brand-600 group-hover:gap-4 transition-all">
                        Learn More <ArrowRightIcon className="w-5 h-5" />
                    </div>
                </NavLink>
            ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FeaturesPage;
