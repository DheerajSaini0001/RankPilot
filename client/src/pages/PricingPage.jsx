import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CheckIcon } from '@heroicons/react/24/solid';
import Logo from '../components/ui/Logo';
import Footer from '../components/ui/Footer';
import ThemeToggle from '../components/ui/ThemeToggle';

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const tiers = [
    {
      name: "Starter",
      price: billingCycle === 'monthly' ? "0" : "0",
      description: "Perfect for exploring RankPilot's core capabilities.",
      features: [
        "1 Website Connection",
        "GA4 & GSC Basic Sync",
        "Daily Data Updates",
        "Standard AI Insights",
        "7-Day Data History"
      ],
      cta: "Get Started Free",
      highlight: false
    },
    {
      name: "Pro",
      price: billingCycle === 'monthly' ? "29" : "24",
      description: "Advanced analytics for growing brands and agencies.",
      features: [
        "Up to 10 Websites",
        "Google & Meta Ads Sync",
        "Real-time Data Fetching",
        "Priority AI Co-Pilot",
        "Unlimited Data History",
        "Custom Reports"
      ],
      cta: "Start Free Trial",
      highlight: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Custom solutions for large-scale operations.",
      features: [
        "Unlimited Websites",
        "Dedicated Support",
        "Custom API Integrations",
        "Advanced Data Modeling",
        "Team Collaboration",
        "SLA Guarantee"
      ],
      cta: "Contact Sales",
      highlight: false
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30 transition-colors duration-500">
      <nav className="sticky top-0 z-50 border-b border-neutral-200 dark:border-white/5">
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl"/>
        <div className="relative max-w-full mx-auto px-8 flex items-center justify-between h-16 sm:h-20">
          <NavLink to="/" className="flex items-center gap-2.5">
            <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
          </NavLink>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NavLink to="/register" className="hidden sm:block text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 px-5 py-2.5 rounded-xl transition-all">
              Get Started
            </NavLink>
          </div>
        </div>
      </nav>

      <header className="pt-16 pb-20 bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-white/5 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-30">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-600/10 rounded-full blur-[120px]"/>
        </div>
        <div className="max-w-4xl mx-auto px-8 relative z-10">
          <h1 className="text-4xl md:text-6xl font-black text-neutral-900 dark:text-white tracking-tight mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg md:text-xl text-neutral-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed mb-10">
            Choose the plan that fits your business needs. No hidden fees, cancel anytime.
          </p>

          {/* Billing Switch */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}`}>Monthly</span>
            <button 
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                className="w-14 h-8 rounded-full bg-neutral-200 dark:bg-slate-800 p-1 relative transition-colors"
            >
                <div className={`w-6 h-6 rounded-full bg-brand-600 shadow-lg transition-transform duration-300 ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}`}>
                Yearly <span className="text-brand-600 dark:text-brand-500 text-[10px] ml-1 uppercase">Save 20%</span>
            </span>
          </div>
        </div>
      </header>

      <main className="py-20 px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div 
                key={tier.name}
                className={`relative p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border ${tier.highlight ? 'border-brand-600 ring-4 ring-brand-500/10 scale-105 z-10' : 'border-neutral-200 dark:border-white/5'} transition-all hover:shadow-2xl`}
            >
                {tier.highlight && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full">
                        Most Popular
                    </span>
                )}
                <div className="mb-8">
                    <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">{tier.name}</h3>
                    <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">{tier.description}</p>
                </div>
                <div className="mb-8">
                    <div className="flex items-end gap-1">
                        <span className="text-4xl font-black text-neutral-900 dark:text-white">${tier.price}</span>
                        {tier.price !== 'Custom' && <span className="text-neutral-400 font-bold mb-1">/mo</span>}
                    </div>
                </div>
                <ul className="space-y-4 mb-10">
                    {tier.features.map(f => (
                        <li key={f} className="flex items-center gap-3 text-sm font-bold text-neutral-600 dark:text-slate-300">
                            <CheckIcon className="w-5 h-5 text-brand-600 shrink-0" />
                            {f}
                        </li>
                    ))}
                </ul>
                <NavLink 
                    to={tier.cta === 'Contact Sales' ? '/contact' : '/register'}
                    className={`block w-full text-center py-4 rounded-2xl font-black transition-all ${tier.highlight ? 'bg-brand-600 text-white hover:bg-brand-500 shadow-xl shadow-brand-500/30' : 'bg-neutral-100 dark:bg-slate-800 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-slate-700'}`}
                >
                    {tier.cta}
                </NavLink>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;
