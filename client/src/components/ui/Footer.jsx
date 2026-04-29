import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-neutral-900 text-white border-t border-neutral-800 px-8 py-12 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* ROW 1 — Brand + Links + Subscribe */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-12">
          
          {/* LEFT: Brand Section */}
          <div className="lg:col-span-3 flex flex-col space-y-4">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="RankPilot Logo" className="w-8 h-8" />
              <span className="text-xl font-black tracking-tight">RankPilot</span>
            </div>
            <p className="text-sm text-neutral-400">
              AI-Powered Marketing Intelligence
            </p>
            <p className="text-xs text-neutral-500">
              © 2025 RankPilot. All rights reserved.
            </p>
            
            {/* Integration Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              {["GA4 ✓", "GSC ✓", "Google Ads ✓", "Meta Ads ✓"].map((badge) => (
                <span 
                  key={badge} 
                  className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-[10px] rounded-full border border-neutral-700"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* MIDDLE: 3 Link Columns */}
          <div className="lg:col-span-6 grid grid-cols-2 md:grid-cols-3 gap-8">
            {/* Column 1 — Product */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2">
                {["Dashboard", "Google Analytics", "Search Console", "Google Ads", "Facebook Ads", "AI Assistant"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-neutral-400 hover:text-brand-400 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2 — Company */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2">
                {["About Us", "Blog", "Careers", "Press Kit", "Contact Us"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-neutral-400 hover:text-brand-400 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 — Legal */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2">
                {["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR Compliance", "Data Processing"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-neutral-400 hover:text-brand-400 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT: Stay Updated */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h4 className="text-sm font-semibold mb-3">Stay Updated</h4>
              <p className="text-xs text-neutral-400 mb-4">Get SEO insights in your inbox</p>
              
              <div className="flex flex-col space-y-2">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
                <button className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                  Subscribe
                </button>
              </div>
              <p className="text-[10px] text-neutral-500 mt-2">No spam. Unsubscribe anytime.</p>
            </div>

            {/* Social Icons */}
            <div className="flex gap-4">
              <a href="#" className="text-neutral-400 hover:text-brand-400 transition-colors" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" className="text-neutral-400 hover:text-brand-400 transition-colors" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.98 0 1.771-.773 1.771-1.729V1.729C24 .774 23.205 0 22.225 0z" />
                </svg>
              </a>
              <a href="#" className="text-neutral-400 hover:text-brand-400 transition-colors" aria-label="YouTube">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a href="#" className="text-neutral-400 hover:text-brand-400 transition-colors" aria-label="GitHub">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* ROW 2 — Bottom Bar */}
        <div className="pt-8 border-t border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            Made with <span className="text-red-500">❤️</span> for SEO professionals worldwide
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>All Systems Operational</span>
            </div>
            <span className="px-2 py-0.5 bg-neutral-800 rounded border border-neutral-700">
              v2.0.1
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
