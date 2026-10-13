import React from 'react';
import { UserAccount, StorageStats } from '../types/storage';
import { Cloud, Search, Upload, Files, ShieldCheck, Languages, User, LogOut, Lock, KeyRound, Sparkles, RefreshCw, Youtube, BarChart3 } from 'lucide-react';

interface NavbarProps {
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenUpload: () => void;
  onOpenAnalytics?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  stats: StorageStats;
  lang: 'bn' | 'en';
  onToggleLang: () => void;
  onOpenAdmin?: () => void;
  onSyncFiles?: () => void;
  isSyncingFiles?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenProfile,
  onOpenUpload,
  onOpenAnalytics,
  searchQuery,
  onSearchChange,
  stats,
  lang,
  onToggleLang,
  onOpenAdmin,
  onSyncFiles,
  isSyncingFiles = false
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return mb.toFixed(1) + ' MB';
    return (mb / 1024).toFixed(2) + ' GB';
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/85 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20">
            <Cloud className="w-6 h-6 stroke-[2.5]" />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-white">
                Bashar
              </span>
              <span className="px-1.5 py-0.5 text-[11px] font-black tracking-wide rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 uppercase shadow-sm">
                1000GB
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 text-[10px] border border-emerald-800/40 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              {lang === 'bn' ? '১ টেরাবাইট হাই-স্পিড ক্লাউড ভল্ট • অনলাইন ডাটাবেস' : '1 TB Cloud Vault • Firestore Connected'}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={lang === 'bn' ? 'ফাইল খুঁজুন (নাম বা টাইপ দিয়ে)...' : 'Search files by name or type...'}
              className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action Controls & User */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <Upload className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span className="hidden sm:inline">
              {lang === 'bn' ? 'ফাইল আপলোড' : 'Upload File'}
            </span>
          </button>

          {/* Analytics Dashboard Button */}
          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition cursor-pointer shadow-sm shadow-cyan-950"
              title={lang === 'bn' ? 'স্টোরেজ অ্যানালিটিক্স ও গ্রোথ ট্রেন্ড' : 'Storage Analytics Dashboard'}
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline">{lang === 'bn' ? 'অ্যানালিটিক্স' : 'Analytics'}</span>
            </button>
          )}

          {/* Admin Panel Button */}
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900/70 border border-rose-800/80 text-rose-300 hover:text-white text-xs font-bold transition cursor-pointer"
              title={lang === 'bn' ? 'অ্যাডমিন প্যানেল' : 'Admin Panel'}
            >
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span className="hidden md:inline">{lang === 'bn' ? 'অ্যাডমিন' : 'Admin'}</span>
            </button>
          )}

          {/* YouTube Channel Button */}
          <a
            href="http://www.youtube.com/@BasharGojolStudio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/70 text-red-300 hover:text-white text-xs font-semibold border border-red-500/40 transition cursor-pointer shadow-sm"
            title={lang === 'bn' ? '❤️ কষ্ট করে আমাদের চ্যানেলটি সাবস্ক্রাইব করে সহযোগিতা করুন। 🌸' : 'Subscribe to Bashar Gojol Studio'}
          >
            <Youtube className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden md:inline">Gojol Studio</span>
          </a>

          {/* Cloud Sync Button */}
          {currentUser && onSyncFiles && (
            <button
              onClick={onSyncFiles}
              disabled={isSyncingFiles}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-cyan-500/30 transition disabled:opacity-50 cursor-pointer ${isSyncingFiles ? 'border-cyan-400 ring-1 ring-cyan-400/50' : ''}`}
              title={lang === 'bn' ? 'ক্লাউড সিঙ্ক (সব ব্রাউজার ও ডিভাইসের ফাইল সিঙ্ক করুন)' : 'Sync files with Cloud'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFiles ? 'animate-spin text-cyan-300' : 'text-cyan-400'}`} />
              <span className="hidden sm:inline">
                {lang === 'bn' ? (isSyncingFiles ? 'সিঙ্ক...' : 'সিঙ্ক') : (isSyncingFiles ? 'Syncing...' : 'Sync')}
              </span>
            </button>
          )}

          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            title="Toggle Language"
          >
            <Languages className="w-4 h-4 text-cyan-400" />
            <span className="uppercase text-[11px]">{lang === 'bn' ? 'EN' : 'বাং'}</span>
          </button>

          {/* User Account / Profile */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 text-left transition cursor-pointer"
                title={lang === 'bn' ? 'প্রোফাইল সেটিংস (লোগো, নাম, জন্ম তারিখ ও পাসওয়ার্ড পরিবর্তন)' : 'Profile Settings (Logo, Name, Date of Birth & Password)'}
              >
                {currentUser.customLogo ? (
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-cyan-400 shrink-0">
                    <img
                      src={currentUser.customLogo}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {formatBytes(stats.usedBytes)} / 1000 GB
                  </div>
                </div>
              </button>

              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition"
                title={lang === 'bn' ? 'লগআউট' : 'Logout'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold border border-cyan-500/30 transition cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>{lang === 'bn' ? 'লগইন' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
