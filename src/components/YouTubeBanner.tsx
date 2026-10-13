import React, { useState } from 'react';
import { Youtube, ExternalLink, Sparkles, Heart } from 'lucide-react';
import { SiteSettings } from '../types/storage';

interface YouTubeBannerProps {
  lang: 'bn' | 'en';
  siteSettings?: SiteSettings;
}

export const YouTubeBanner: React.FC<YouTubeBannerProps> = ({ lang, siteSettings }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  
  if (siteSettings && siteSettings.showYoutubeBanner === false) {
    return null;
  }

  const channelUrl = siteSettings?.youtubeChannelUrl || 'http://www.youtube.com/@BasharGojolStudio';
  const channelName = siteSettings?.youtubeChannelName || 'Bashar Gojol Studio';
  const promoTextBn = siteSettings?.youtubeBannerTextBn || '❤️ কষ্ট করে আমাদের চ্যানেলটি সাবস্ক্রাইব করে সহযোগিতা করুন। 🌸';
  const promoTextEn = '❤️ Please kindly support us by subscribing to our channel. 🌸';

  if (isDismissed) {
    return (
      <div className="bg-gradient-to-r from-red-950/40 via-slate-900/60 to-red-950/40 border-b border-red-900/30 px-4 py-1.5 flex items-center justify-between text-xs">
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-red-400 hover:text-red-300 transition font-medium group"
        >
          <Youtube className="w-4 h-4 text-red-500 group-hover:scale-110 transition shrink-0" />
          <span className="truncate">❤️ কষ্ট করে আমাদের চ্যানেলটি সাবস্ক্রাইব করে সহযোগিতা করুন। 🌸 — 🔗 http://www.youtube.com/@BasharGojolStudio</span>
          <ExternalLink className="w-3 h-3 text-red-400/80 ml-1" />
        </a>
        <button
          onClick={() => setIsDismissed(false)}
          className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer ml-2"
        >
          {lang === 'bn' ? 'বার্তাটি দেখুন' : 'Show message'}
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-red-950/90 via-slate-900/95 to-red-950/80 border-b border-red-500/40 px-4 py-3 shadow-lg backdrop-blur-md">
      {/* Decorative glow */}
      <div className="absolute top-0 right-1/4 w-48 h-12 bg-red-600/10 rounded-full blur-xl pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 relative z-10">
        {/* Left Side: Icon & User Provided Promotion Text */}
        <div className="flex items-center gap-3 text-center md:text-left">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30 animate-pulse">
              <Youtube className="w-6 h-6 fill-white" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-red-400" />
                {channelName}
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">@BasharGojolStudio</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-rose-100 mt-1 tracking-normal flex flex-wrap items-center gap-1.5 justify-center md:justify-start">
              <span>{lang === 'bn' ? promoTextBn : promoTextEn}</span>
            </p>
            <div className="mt-0.5">
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-red-300 hover:text-white underline inline-flex items-center gap-1 font-mono hover:text-red-200 transition"
              >
                <span>🔗 {channelUrl}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Side: Channel Subscribe Link & Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
          >
            <Youtube className="w-4 h-4 fill-white" />
            <span>{lang === 'bn' ? 'সাবস্ক্রাইব করুন' : 'Subscribe Now'}</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 transition" />
          </a>

          <button
            onClick={() => setIsDismissed(true)}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
            title={lang === 'bn' ? 'মিনিমাইজ করুন' : 'Minimize'}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
