import React from 'react';

interface BrandLogoProps {
  customLogoUrl?: string;
  siteName?: string;
  badgeText?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  showGlow?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  customLogoUrl,
  siteName = 'Bashar',
  badgeText = '1000GB',
  subtitle,
  size = 'md',
  showText = false,
  className = '',
  showGlow = true
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16 sm:w-20 sm:h-20'
  };

  const currentSizeClass = sizeMap[size] || sizeMap.md;

  const emblem = (
    <div 
      className={`relative ${currentSizeClass} shrink-0 group cursor-pointer transition-transform duration-300 hover:scale-105 select-none ${className}`}
    >
      {/* Ambient Outer Glow */}
      {showGlow && (
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-cyan-500/40 via-sky-500/30 to-amber-500/30 blur-sm opacity-70 group-hover:opacity-100 transition duration-300 pointer-events-none" />
      )}

      {customLogoUrl && customLogoUrl.trim() ? (
        <div className="relative w-full h-full rounded-2xl p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-500 to-amber-400 shadow-lg shadow-cyan-500/25">
          <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-950 flex items-center justify-center">
            <img 
              src={customLogoUrl} 
              alt={siteName} 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      ) : (
        <svg
          viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative w-full h-full drop-shadow-md"
      >
        <defs>
          {/* Outer Shield Gradient */}
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="45%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          {/* Border Metallic Gradient */}
          <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          {/* Gold Vault Accent Gradient */}
          <linearGradient id="goldVault" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Soft Cloud Fill */}
          <linearGradient id="cloudInner" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.9" />
          </linearGradient>

          {/* Subtle Shadow Filter */}
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0284c7" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* 1. Outer Rounded Vault Squircle */}
        <rect
          x="3"
          y="3"
          width="74"
          height="74"
          rx="20"
          fill="#020617"
          stroke="url(#borderGrad)"
          strokeWidth="2.5"
        />

        {/* 2. Inner Glowing Backplate */}
        <rect
          x="7"
          y="7"
          width="66"
          height="66"
          rx="17"
          fill="url(#shieldGrad)"
          fillOpacity="0.2"
        />

        {/* 3. Stylized Cloud Contour with Depth */}
        <g filter="url(#softGlow)">
          {/* Cloud Base Silhouette */}
          <path
            d="M58 48.5C61.5 48.5 64.5 45.5 64.5 42C64.5 38.6 61.9 35.8 58.5 35.5C57.8 28.5 52 23 45 23C39.5 23 34.8 26.3 32.8 31.1C31.5 30.4 30 30 28.5 30C24.3 30 21 33.3 21 37.5C21 38.2 21.1 38.9 21.3 39.5C18.8 40.8 17 43.4 17 46.5C17 50.6 20.4 54 24.5 54H58C61.5 54 64.5 51.5 64.5 48.5H58Z"
            fill="url(#cloudInner)"
          />
        </g>

        {/* 4. Golden Central Security Vault Lock & Keyhole */}
        <g transform="translate(32, 33)">
          {/* Shackle */}
          <path
            d="M4 8V5C4 2.8 5.8 1 8 1C10.2 1 12 2.8 12 5V8"
            stroke="url(#goldVault)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Lock Body */}
          <rect
            x="1"
            y="7"
            width="14"
            height="12"
            rx="3"
            fill="url(#goldVault)"
          />
          {/* Keyhole */}
          <circle cx="8" cy="11.5" r="1.5" fill="#0f172a" />
          <path d="M7.2 12.5L8.8 12.5L8.4 16H7.6L7.2 12.5Z" fill="#0f172a" />
        </g>

        {/* 5. Sparkling Stars (Top-Right & Top-Left) */}
        <path
          d="M62 13L63.2 16.8L67 18L63.2 19.2L62 23L60.8 19.2L57 18L60.8 16.8L62 13Z"
          fill="url(#goldVault)"
        />
        <circle cx="21" cy="20" r="1.5" fill="#38bdf8" />
        <circle cx="68" cy="30" r="1.2" fill="#facc15" />

        {/* 6. High-Contrast Bottom Badge: 1000GB */}
        <g transform="translate(14, 57)">
          <rect
            x="0"
            y="0"
            width="52"
            height="15"
            rx="7.5"
            fill="#090d16"
            stroke="url(#borderGrad)"
            strokeWidth="1.2"
          />
          <text
            x="26"
            y="11"
            textAnchor="middle"
            fill="#38bdf8"
            fontSize="8.5"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="0.8px"
          >
            1000 GB
          </text>
        </g>
      </svg>
      )}
    </div>
  );

  if (!showText) {
    return emblem;
  }

  return (
    <div className="flex items-center gap-3">
      {emblem}
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-black tracking-tight text-white drop-shadow-sm">
            {siteName}
          </span>
          <span className="px-1.5 py-0.5 text-xs font-black tracking-wide rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 uppercase shadow-sm">
            {badgeText}
          </span>
        </div>
        {subtitle && (
          <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
