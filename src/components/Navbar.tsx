import React from 'react';
import { UserAccount, StorageStats, SiteSettings } from '../types/storage';
import { 
  Cloud, 
  Search, 
  Upload, 
  ShieldCheck, 
  Languages, 
  User, 
  LogOut, 
  RefreshCw,
  Menu,
  Scan
} from 'lucide-react';

import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  currentUser: UserAccount | null;
  siteSettings?: SiteSettings;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenUpload: () => void;
  onOpenQRScanner?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  stats: StorageStats;
  lang: 'bn' | 'en';
  onToggleLang: () => void;
  onOpenAdmin?: () => void;
  onSyncFiles?: () => void;
  isSyncingFiles?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  siteSettings,
  onOpenAuth,
  onLogout,
  onOpenProfile,
  onOpenUpload,
  onOpenQRScanner,
  searchQuery,
  onSearchChange,
  stats,
  lang,
  onToggleLang,
  onOpenAdmin,
  onSyncFiles,
  isSyncingFiles = false,
  onToggleMobileMenu
}) => {
  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb < 1) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return gb.toFixed(1) + ' GB';
  };

  const siteName = siteSettings?.siteName || 'Bashar';
  const siteBadge = siteSettings?.siteBadge || '1000GB';

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-2.5 sm:px-4 py-2 sm:py-2.5">
      <div className="flex items-center justify-between gap-1.5 sm:gap-3 max-w-7xl mx-auto">
        {/* Brand & Logo */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white bg-slate-800/80 md:hidden cursor-pointer"
              title={lang === 'bn' ? 'মেনু ও ইউটিলিটি টুলস' : 'Menu & Tools'}
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <BrandLogo customLogoUrl={siteSettings?.siteLogoUrl} size="md" />
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black tracking-tight text-white">
                {siteName}
              </h1>
              <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                {siteBadge}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 -mt-0.5 font-medium">
              {lang === 'bn' 
                ? (siteSettings?.taglineBn || '১০০০ জিবি সুপারফাস্ট ক্লাউড স্টোরেজ') 
                : (siteSettings?.taglineEn || '1000 GB Superfast Cloud Storage')}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 min-w-[100px] max-w-md mx-1 sm:mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={lang === 'bn' ? 'ফাইল খুঁজুন...' : 'Search files...'}
              className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-9 sm:pl-10 pr-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2 sm:top-2.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action Controls & User */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* 1. Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 min-h-[38px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <Upload className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span className="hidden sm:inline">
              {lang === 'bn' ? 'ফাইল আপলোড' : 'Upload File'}
            </span>
          </button>

          {/* QR Scanner & Device Connect Button */}
          {onOpenQRScanner && (
            <button
              onClick={onOpenQRScanner}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 min-h-[38px] rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-bold transition cursor-pointer shadow-sm"
              title={lang === 'bn' ? 'ক্যামেরা কিউআর স্ক্যানার ও ডিভাইস কানেক্ট' : 'Camera QR Scanner & Device Connect'}
            >
              <Scan className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
              <span className="hidden lg:inline">{lang === 'bn' ? 'QR স্ক্যান' : 'QR Scan'}</span>
            </button>
          )}

          {/* 2. Admin Panel Button (অ্যাডমিন) */}
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 min-h-[38px] rounded-xl bg-rose-950/70 hover:bg-rose-900/70 border border-rose-800/80 text-rose-300 hover:text-white text-xs font-bold transition cursor-pointer shadow-sm"
              title={lang === 'bn' ? 'অ্যাডমিন প্যানেল' : 'Admin Panel'}
            >
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span className="hidden md:inline">{lang === 'bn' ? 'অ্যাডমিন' : 'Admin'}</span>
            </button>
          )}

          {/* 3. Cloud Sync Button (সিঙ্ক) */}
          {currentUser && onSyncFiles && (
            <button
              onClick={onSyncFiles}
              disabled={isSyncingFiles}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 min-h-[38px] rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-cyan-500/30 transition disabled:opacity-50 cursor-pointer ${isSyncingFiles ? 'border-cyan-400 ring-1 ring-cyan-400/50' : ''}`}
              title={lang === 'bn' ? 'ক্লাউড সিঙ্ক (সব ডিভাইসের ফাইল সিঙ্ক করুন)' : 'Sync files with Cloud'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFiles ? 'animate-spin text-cyan-300' : 'text-cyan-400'}`} />
              <span className="hidden sm:inline">
                {lang === 'bn' ? (isSyncingFiles ? 'সিঙ্ক...' : 'সিঙ্ক') : (isSyncingFiles ? 'Syncing...' : 'Sync')}
              </span>
            </button>
          )}

          {/* 4. Language Switcher (EN) */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 min-h-[38px] rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title="Toggle Language"
          >
            <Languages className="w-4 h-4 text-cyan-400" />
            <span className="uppercase text-[11px] font-bold">{lang === 'bn' ? 'EN' : 'বাং'}</span>
          </button>

          {/* 5. User Account / Profile (প্রোফাইল) */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 text-left transition cursor-pointer"
                title={lang === 'bn' ? 'প্রোফাইল সেটিংস (লোগো, নাম, জন্ম তারিখ ও পাসওয়ার্ড)' : 'Profile Settings'}
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
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
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
