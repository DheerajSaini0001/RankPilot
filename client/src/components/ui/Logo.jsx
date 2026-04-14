import React from 'react';

const Logo = ({ className = "w-10 h-10", iconOnly = false, textClassName = "text-xl" }) => {
  return (
    <div className={`flex items-center gap-3 group/logo`}>
      <div className={`relative shrink-0 ${className} transition-all duration-500 group-hover/logo:scale-110 group-hover/logo:rotate-3`}>
        {/* Using the official favicon.png as the logo image */}
        <img 
          src="/favicon.png" 
          alt="RankPilot Logo" 
          className="w-full h-full object-contain drop-shadow-lg"
        />
      </div>
      {!iconOnly && (
        <span className={`${textClassName} font-black tracking-tighter text-neutral-900 dark:text-white transition-colors`}>
          Rank<span className="text-brand-600 dark:text-brand-500">Pilot</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
