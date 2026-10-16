import React from 'react';
import { ActiveTab, StorageStats, SiteSettings } from '../types/storage';
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
  Bot
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  stats: StorageStats;
  siteSettings?: SiteSettings;
  trashCount: number;
  starredCount: number;
  sharedCount: number;
  vaultCount: number;
  lang: 'bn' | 'en';
  onOpenAnalytics?: () => void;
  onOpenCalculator?: () => void;
  onOpenScreenRecorder?: () => void;
  onOpenVoiceRecorder?: () => void;
  onOpenSubscription?: () => void;
  onOpenChat?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  stats,
  siteSettings,
  trashCount,
  starredCount,
  sharedCount,
  vaultCount,
  lang,
  onOpenAnalytics,
  onOpenCalculator,
  onOpenScreenRecorder,
  onOpenVoiceRecorder,
  onOpenSubscription,
  onOpenChat
}) => {
  const formatStorage = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) return mb.toFixed(1) + ' MB';
    return (mb / 1024).toFixed(2) + ' GB';
  };

  const totalGb = siteSettings?.storageQuotaGb || 1000;
  const usedGb = stats.usedBytes / (1024 * 1024 * 1024);
  const percentage = Math.max(0.1, Math.min(100, (usedGb / totalGb) * 100));

  return (
    <aside className="w-64 bg-slate-900/60 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0 overflow-y-auto">
      {/* Top Nav List */}
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2 block">
            {lang === 'bn' ? 'স্টোরেজ নেভিগেশন' : 'Storage Navigation'}
          </span>
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('all')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'all' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
            >
              <div className="flex items-center gap-2.5">
                <Folder className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'bn' ? 'সকল ফাইল' : 'All Files'}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{stats.fileCount}</span>
            </button>

            <button
              onClick={() => onTabChange('starred')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'starred' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-400" />
                <span>{lang === 'bn' ? 'পছন্দের ফাইল' : 'Starred Files'}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{starredCount}</span>
            </button>

            <button
              onClick={() => onTabChange('shared')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'shared' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
            >
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4 text-blue-400" />
                <span>{lang === 'bn' ? 'শেয়ার করা ফাইল' : 'Shared Files'}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{sharedCount}</span>
            </button>

            <button
              onClick={() => onTabChange('vault')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'vault' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'bn' ? 'এনক্রিপ্ট ভল্ট' : 'Encrypted Vault'}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{vaultCount}</span>
            </button>

            <button
              onClick={() => onTabChange('trash')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'trash' ? 'bg-red-500/15 text-red-300 border border-red-500/30' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>{lang === 'bn' ? 'রিসাইকেল বিন' : 'Trash / Bin'}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{trashCount}</span>
            </button>
          </nav>

          {/* Special Tools & Utilities */}
          <div className="mt-5 pt-4 border-t border-slate-800/60 space-y-1">
            <h4 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {lang === 'bn' ? 'ইউটিলিটি টুলস' : 'Utility Tools'}
            </h4>

            {onOpenCalculator && (
              <button
                onClick={onOpenCalculator}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-white transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'bn' ? 'ক্যালকুলেটর ও স্টোরেজ' : 'Calculator'}</span>
                </div>
              </button>
            )}

            {onOpenScreenRecorder && (
              <button
                onClick={onOpenScreenRecorder}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-white transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Video className="w-4 h-4 text-rose-400" />
                  <span>{lang === 'bn' ? 'স্ক্রিন রেকর্ডার' : 'Screen Recorder'}</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {lang === 'bn' ? 'ভিডিও' : 'Video'}
                </span>
              </button>
            )}

            {onOpenVoiceRecorder && (
              <button
                onClick={onOpenVoiceRecorder}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-white transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Mic className="w-4 h-4 text-indigo-400" />
                  <span>{lang === 'bn' ? 'ভয়েস রেকর্ডার' : 'Voice Recorder'}</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {lang === 'bn' ? 'অডিও' : 'Audio'}
                </span>
              </button>
            )}

            {onOpenChat && (
              <button
                onClick={onOpenChat}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-cyan-300 hover:bg-cyan-950/40 hover:text-white transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span>{lang === 'bn' ? 'Gemini এআই চ্যাট' : 'Gemini AI Chat'}</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AI
                </span>
              </button>
            )}

            {onOpenSubscription && (
              <button
                onClick={onOpenSubscription}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'bn' ? '১০০৳ আজীবন আনলক' : '100 Tk Lifetime'}</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  VIP
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Storage Gauge */}
      <div className="pt-6 border-t border-slate-800/80 space-y-4">
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

          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/15 to-blue-500/15 hover:from-cyan-500/25 hover:to-blue-500/25 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-bold transition cursor-pointer shadow-sm shadow-cyan-950/40"
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'bn' ? 'অ্যানালিটিক্স ড্যাশবোর্ড' : 'Analytics Dashboard'}</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
