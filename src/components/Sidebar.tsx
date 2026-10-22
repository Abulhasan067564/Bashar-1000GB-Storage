import React from 'react';
import { ActiveTab, StorageStats, SiteSettings, UserAccount } from '../types/storage';
import { 
  Folder, 
  Star, 
  Share2, 
  Lock, 
  Trash2, 
  HardDrive,
  BarChart3,
  Calculator,
  Video,
  Mic,
  Crown,
  Bot,
  Youtube,
  Clock,
  X,
  Wand2
} from 'lucide-react';
import { getTrialStatus, toBengaliDigits } from '../utils/bengaliNaming';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  stats: StorageStats;
  siteSettings?: SiteSettings;
  currentUser?: UserAccount | null;
  trashCount: number;
  starredCount: number;
  sharedCount: number;
  vaultCount: number;
  lang: 'bn' | 'en';
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenAnalytics?: () => void;
  onOpenCalculator?: () => void;
  onOpenScreenRecorder?: () => void;
  onOpenVoiceRecorder?: () => void;
  onOpenSubscription?: () => void;
  onOpenChat?: () => void;
  onOpenImageStudio?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  stats,
  siteSettings,
  currentUser,
  trashCount,
  starredCount,
  sharedCount,
  vaultCount,
  lang,
  isMobileOpen = false,
  onCloseMobile,
  onOpenAnalytics,
  onOpenCalculator,
  onOpenScreenRecorder,
  onOpenVoiceRecorder,
  onOpenSubscription,
  onOpenChat,
  onOpenImageStudio
}) => {
  const formatStorage = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) return mb.toFixed(1) + ' MB';
    return (mb / 1024).toFixed(2) + ' GB';
  };

  const totalGb = siteSettings?.storageQuotaGb || 1000;
  const usedGb = stats.usedBytes / (1024 * 1024 * 1024);
  const percentage = Math.min(100, (usedGb / totalGb) * 100);

  const trial = getTrialStatus(currentUser);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden animate-in fade-in"
        />
      )}

      <aside className={`
        ${isMobileOpen ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl animate-in slide-in-from-left duration-200' : 'hidden md:flex'}
        w-64 bg-slate-900 border-r border-slate-800 p-4 flex-col justify-between shrink-0 select-none overflow-y-auto
      `}>
        <div className="space-y-5">
          {/* Mobile Drawer Header */}
          {isMobileOpen && (
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 md:hidden">
              <BrandLogo
                customLogoUrl={siteSettings?.siteLogoUrl}
                siteName={siteSettings?.siteName || 'বাশার ড্রাইভ'}
                badgeText={siteSettings?.siteBadge || '1000GB'}
                size="sm"
                showText={true}
              />
              <button 
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        <div>
          {/* Main Navigation */}
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('all')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm shadow-cyan-950'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'bn' ? 'সকল ফাইল ও ফোল্ডার' : 'All Files & Folders'}</span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400/80">{stats.fileCount}</span>
            </button>

            <button
              onClick={() => onTabChange('starred')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'starred'
                  ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span>{lang === 'bn' ? 'তারকাচিহ্নিত (প্রিয়)' : 'Starred Favorites'}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{starredCount}</span>
            </button>

            <button
              onClick={() => onTabChange('shared')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'shared'
                  ? 'bg-blue-500/15 text-blue-300 font-bold border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4 text-blue-400" />
                <span>{lang === 'bn' ? 'শেয়ার করা ফাইল' : 'Shared Links'}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{sharedCount}</span>
            </button>

            <button
              onClick={() => onTabChange('vault')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'vault'
                  ? 'bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-purple-400" />
                <span>{lang === 'bn' ? 'সুরক্ষিত ভল্ট' : 'Secure Vault'}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{vaultCount}</span>
            </button>

            <button
              onClick={() => onTabChange('trash')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'trash'
                  ? 'bg-red-500/15 text-red-300 font-bold border border-red-500/30 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>{lang === 'bn' ? 'রিসাইকেল বিন' : 'Trash / Bin'}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{trashCount}</span>
            </button>
          </nav>

          {/* ইউটিলিটি টুলস (Utility Tools) - সমস্ত টুলস এখানে থাকবে */}
          <div className="mt-5 pt-4 border-t border-slate-800/70 space-y-1.5">
            <h4 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{lang === 'bn' ? 'ইউটিলিটি টুলস' : 'Utility Tools'}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                8 Tools
              </span>
            </h4>

            {/* 1. অ্যানালিটিক্স (Analytics) */}
            {onOpenAnalytics && (
              <button
                onClick={onOpenAnalytics}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-white transition cursor-pointer group"
                title={lang === 'bn' ? 'স্টোরেজ অ্যানালিটিক্স ও রিপোর্ট' : 'Storage Analytics & Report'}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
                  <span>{lang === 'bn' ? 'অ্যানালিটিক্স' : 'Analytics'}</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {lang === 'bn' ? 'রিপোর্ট' : 'Stats'}
                </span>
              </button>
            )}

            {/* 2. ক্যালকুলেটর (Calculator) */}
            {onOpenCalculator && (
              <button
                onClick={onOpenCalculator}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-white transition cursor-pointer group"
                title={lang === 'bn' ? 'ক্যালকুলেটর ও ১০০০ জিবি স্টোরেজ হিসাব' : 'Calculator & Storage Limits'}
              >
                <div className="flex items-center gap-2.5">
                  <Calculator className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                  <span>{lang === 'bn' ? 'ক্যালকুলেটর' : 'Calculator'}</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {lang === 'bn' ? 'হিসাব' : 'Calc'}
                </span>
              </button>
            )}

            {/* 3. স্ক্রিন রেকর্ড (Screen Recorder) */}
            {onOpenScreenRecorder && (
              <button
                onClick={onOpenScreenRecorder}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-white transition cursor-pointer group"
                title={lang === 'bn' ? 'স্ক্রিন রেকর্ডার (মাইক্রোফোন ও ডিভাইস অডিও)' : 'Screen Recorder'}
              >
                <div className="flex items-center gap-2.5">
                  <Video className="w-4 h-4 text-rose-400 group-hover:scale-110 transition" />
                  <span>{lang === 'bn' ? 'স্ক্রিন রেকর্ড' : 'Screen Record'}</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {lang === 'bn' ? 'ভিডিও' : 'Video'}
                </span>
              </button>
            )}

            {/* 4. ভয়েস রেকর্ড (Voice Recorder) */}
            {onOpenVoiceRecorder && (
              <button
                onClick={onOpenVoiceRecorder}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-white transition cursor-pointer group"
                title={lang === 'bn' ? 'ভয়েস রেকর্ডার (ক্লিয়ার মাইক্রোফোন অডিও)' : 'Voice Recorder'}
              >
                <div className="flex items-center gap-2.5">
                  <Mic className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
                  <span>{lang === 'bn' ? 'ভয়েস রেকর্ড' : 'Voice Record'}</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {lang === 'bn' ? 'অডিও' : 'Audio'}
                </span>
              </button>
            )}

            {/* 5. ৩০ দিন বাকি ১০০৳ আজীবন (Trial countdown / 100 Tk Lifetime Subscription) */}
            {onOpenSubscription && (
              <button
                onClick={onOpenSubscription}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm ${
                  trial.isLifetime
                    ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/40'
                    : trial.isExpired
                    ? 'bg-red-950/80 text-red-300 hover:bg-red-900 border border-red-700 animate-pulse'
                    : 'bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-yellow-500/15 text-amber-200 hover:bg-amber-500/25 border border-amber-500/40'
                }`}
                title={
                  trial.isLifetime 
                    ? (lang === 'bn' ? 'আজীবন মেম্বারশিপ আনলকড (VIP) • আর কখনো টাকা দেওয়া লাগবে না' : 'Lifetime Membership Unlocked')
                    : trial.isExpired
                    ? (lang === 'bn' ? 'মেয়াদ শেষ! ১০০ টাকা দিলে জীবনের জন্য আর দেওয়া লাগবে না' : 'Trial Expired! Send 100 Tk once for lifetime access')
                    : (lang === 'bn' ? `৩০ দিন ট্রায়ালের ${toBengaliDigits(trial.remainingDays)} দিন বাকি। ১০০ টাকা দিলে জীবনের জন্য আর দেওয়া লাগবে না` : `${trial.remainingDays} days remaining • 100 Tk Lifetime`)
                }
              >
                <div className="flex items-center gap-2 min-w-0">
                  {trial.isLifetime ? (
                    <Crown className="w-4 h-4 text-amber-400 fill-amber-400/20 shrink-0" />
                  ) : trial.isExpired ? (
                    <Lock className="w-4 h-4 text-red-400 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span className="truncate">
                    {trial.isLifetime
                      ? (lang === 'bn' ? 'আজীবন আনলকড' : 'Lifetime VIP')
                      : trial.isExpired
                      ? (lang === 'bn' ? 'মেয়াদ শেষ • ১০০৳' : 'Expired • 100 Tk')
                      : (lang === 'bn' ? `${toBengaliDigits(trial.remainingDays)} দিন বাকি` : `${trial.remainingDays}d left`)}
                  </span>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  trial.isLifetime ? 'bg-amber-500/30 text-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {trial.isLifetime ? 'VIP' : (lang === 'bn' ? '১০০৳ আজীবন' : '100 Tk')}
                </span>
              </button>
            )}

            {/* 6. AI চ্যাট (Gemini Chat) */}
            {onOpenChat && (
              <button
                onClick={onOpenChat}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-cyan-300 hover:bg-cyan-950/40 hover:text-white transition cursor-pointer group"
                title={lang === 'bn' ? 'Gemini এআই চ্যাট ও সহকারী' : 'Gemini AI Assistant'}
              >
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
                  <span>{lang === 'bn' ? 'AI চ্যাট পেজ' : 'AI Chat Studio'}</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Gemini 3.8
                </span>
              </button>
            )}

            {/* 7. Gojol Studio (গজল স্টুডিও) */}
            <a
              href="http://www.youtube.com/@BasharGojolStudio"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-red-300 hover:bg-red-950/40 hover:text-white transition cursor-pointer group"
              title={lang === 'bn' ? '❤️ কষ্ট করে আমাদের চ্যানেলটি সাবস্ক্রাইব করে সহযোগিতা করুন।' : 'Subscribe to Bashar Gojol Studio'}
            >
              <div className="flex items-center gap-2.5">
                <Youtube className="w-4 h-4 text-red-500 group-hover:scale-110 transition" />
                <span>Gojol Studio</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                YouTube
              </span>
            </a>

            {/* 8. এআই ইমেজ স্টুডিও (AI Image Studio - Create & Edit Any Size) */}
            {onOpenImageStudio && (
              <button
                onClick={onOpenImageStudio}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:bg-purple-950/40 hover:text-white transition cursor-pointer group"
                title={lang === 'bn' ? 'এআই ইমেজ স্টুডিও (ছবি তৈরি, এডিট ও ইচ্ছামতো সাইজ)' : 'AI Image Studio (Custom Dimensions & Edit)'}
              >
                <div className="flex items-center gap-2.5">
                  <Wand2 className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
                  <span>{lang === 'bn' ? 'এআই ইমেজ স্টুডিও' : 'AI Image Studio'}</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {lang === 'bn' ? 'সাইজ' : 'Any Size'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Storage Gauge */}
      <div className="pt-5 border-t border-slate-800/80 space-y-3">
        {/* 1000GB Storage Gauge */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">
                {lang === 'bn' ? 'স্টোরেজ কোটা' : 'Storage Quota'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
              {totalGb} GB
            </span>
          </div>

          <div className="w-full bg-slate-800/90 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(percentage, 2)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400">
            <span>{formatStorage(stats.usedBytes)} {lang === 'bn' ? 'ব্যবহৃত' : 'used'}</span>
            <span className="text-slate-500">{Math.max(0, totalGb - usedGb).toFixed(1)} GB {lang === 'bn' ? 'বাকি' : 'free'}</span>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
