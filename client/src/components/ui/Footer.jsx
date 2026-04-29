import React from 'react';
import { NavLink } from 'react-router-dom';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white border-t border-neutral-200 dark:border-white/5 px-8 py-12 font-sans transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        {/* ROW 1 — Brand + Links + Subscribe */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-12">
          
          {/* Column 1: Brand Section */}
          <div className="flex flex-col space-y-5">
            <NavLink to="/" className="flex items-center gap-2.5">
              <Logo className="w-8 h-8" />
            </NavLink>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              AI-Powered Marketing Intelligence for modern SEO professionals.
            </p>
            
            {/* Integration Badges */}
            <div className="flex flex-wrap gap-2">
              {["GA4", "GSC", "Ads", "Meta"].map((badge) => (
                <span 
                  key={badge} 
                  className="px-2 py-0.5 bg-neutral-100 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 text-[10px] font-bold rounded-full border border-neutral-200 dark:border-white/10"
                >
                  {badge} ✓
                </span>
              ))}
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium pt-2">
              © 2026 RankPilot.
            </p>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-500 mb-6">Platform</h4>
            <ul className="space-y-3.5">
              {[
                { label: "Features Overview", path: "/features" },
                { label: "Pricing Plans", path: "/pricing" },
                { label: "Dashboard", path: "/dashboard" },
                { label: "Customer Stories", path: "#" },
                { label: "Documentation", path: "#" }
              ].map((item) => (
                <li key={item.label}>
                  <NavLink to={item.path} className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-white transition-colors">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Integrations */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-500 mb-6">Integrations</h4>
            <ul className="space-y-3.5">
              {[
                { label: "Google Analytics", path: "/features/ga4" },
                { label: "Search Console", path: "/features/gsc" },
                { label: "Google Ads", path: "/features/ads" },
                { label: "Facebook Ads", path: "/features/ads" },
                { label: "AI Assistant", path: "/features/ai" }
              ].map((item) => (
                <li key={item.label}>
                  <NavLink to={item.path} className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-white transition-colors">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-500 mb-6">Company</h4>
            <ul className="space-y-3.5">
              {[
                { label: "About Us", path: "/about" },
                { label: "Blog", path: "/blog" },
                { label: "Careers", path: "/careers" },
                { label: "Press Kit", path: "/press" },
                { label: "Contact Us", path: "/contact" }
              ].map((item) => (
                <li key={item.label}>
                  <NavLink to={item.path} className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-white transition-colors">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: Legal */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-500 mb-6">Legal</h4>
            <ul className="space-y-3.5">
              {[
                { label: "Privacy Policy", path: "/privacy" },
                { label: "Terms of Service", path: "/terms" },
                { label: "Cookie Policy", path: "/cookies" },
                { label: "GDPR Compliance", path: "/gdpr" },
                { label: "Data Processing", path: "/privacy" }
              ].map((item) => (
                <li key={item.label}>
                  <NavLink to={item.path} className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-white transition-colors">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


