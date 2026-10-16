import React, { useState, useRef } from 'react';
import { SiteSettings, DEFAULT_SITE_SETTINGS } from '../../types/storage';
import {
  X,
  Sliders,
  Camera,
  Upload,
  Globe,
  Youtube,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Image as ImageIcon,
  Type,
  Bell,
  HardDrive,
  ExternalLink,
  Eye,
  Check,
  Palette,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
  UserPlus,
  Copyright
} from 'lucide-react';

interface WebsiteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteSettings: SiteSettings;
  onSaveSettings: (settings: SiteSettings) => Promise<void> | void;
  lang: 'bn' | 'en';
}

const PRESET_SITE_LOGOS = [
  {
    name: 'Cyber Cloud',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Neon Sphere',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Prism Tech',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Cosmic Vault',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Gold Shield',
    url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Crystal Drive',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Emerald Core',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Violet Nebula',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80'
  }
];

const THEME_OPTIONS = [
  { id: 'cyan', nameBn: 'সায়ান / নীল (Cyber Blue)', nameEn: 'Cyan / Blue', color: 'from-cyan-500 to-blue-600', border: 'border-cyan-400' },
  { id: 'emerald', nameBn: 'পান্না সবুজ (Emerald Green)', nameEn: 'Emerald Green', color: 'from-emerald-400 to-teal-500', border: 'border-emerald-400' },
  { id: 'violet', nameBn: 'বেগুনী / পার্পল (Cyber Violet)', nameEn: 'Violet / Purple', color: 'from-purple-500 to-indigo-600', border: 'border-purple-400' },
  { id: 'amber', nameBn: 'স্বর্ণালী / গোল্ডেন (Golden Amber)', nameEn: 'Amber / Gold', color: 'from-amber-400 to-orange-500', border: 'border-amber-400' },
  { id: 'rose', nameBn: 'রুবি লাল / গোলাপি (Ruby Rose)', nameEn: 'Ruby Rose', color: 'from-rose-500 to-pink-600', border: 'border-rose-400' }
] as const;

export const WebsiteSettingsModal: React.FC<WebsiteSettingsModalProps> = ({
  isOpen,
  onClose,
  siteSettings,
  onSaveSettings,
  lang
}) => {
  const [siteName, setSiteName] = useState(siteSettings.siteName || 'Bashar');
  const [siteBadge, setSiteBadge] = useState(siteSettings.siteBadge || '1000GB');
  const [siteLogoUrl, setSiteLogoUrl] = useState(siteSettings.siteLogoUrl || '');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [taglineBn, setTaglineBn] = useState(siteSettings.taglineBn || DEFAULT_SITE_SETTINGS.taglineBn);
  const [taglineEn, setTaglineEn] = useState(siteSettings.taglineEn || DEFAULT_SITE_SETTINGS.taglineEn);
  const [themeColor, setThemeColor] = useState<'cyan' | 'emerald' | 'violet' | 'amber' | 'rose'>(
    siteSettings.themeColor || 'cyan'
  );

  // YouTube Banner
  const [youtubeChannelUrl, setYoutubeChannelUrl] = useState(siteSettings.youtubeChannelUrl || DEFAULT_SITE_SETTINGS.youtubeChannelUrl);
  const [youtubeChannelName, setYoutubeChannelName] = useState(siteSettings.youtubeChannelName || DEFAULT_SITE_SETTINGS.youtubeChannelName);
  const [youtubeBannerTextBn, setYoutubeBannerTextBn] = useState(siteSettings.youtubeBannerTextBn || DEFAULT_SITE_SETTINGS.youtubeBannerTextBn);
  const [showYoutubeBanner, setShowYoutubeBanner] = useState(siteSettings.showYoutubeBanner ?? true);

  // Global Notice, Support & System
  const [announcementNotice, setAnnouncementNotice] = useState(siteSettings.announcementNotice || '');
  const [noticeType, setNoticeType] = useState<'info' | 'warning' | 'alert' | 'success'>(
    siteSettings.noticeType || 'info'
  );
  const [storageQuotaGb, setStorageQuotaGb] = useState<number>(siteSettings.storageQuotaGb || 1000);
  const [footerCopyright, setFooterCopyright] = useState(
    siteSettings.footerCopyright || DEFAULT_SITE_SETTINGS.footerCopyright || '© 2026 Bashar 1000GB Cloud Storage. সর্বস্বত্ব সংরক্ষিত।'
  );
  const [contactSupport, setContactSupport] = useState(siteSettings.contactSupport || '');
  const [allowRegistrations, setAllowRegistrations] = useState(siteSettings.allowRegistrations ?? true);

  const [activeTab, setActiveTab] = useState<'branding' | 'youtube' | 'notice'>('branding');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন (JPG, PNG, WebP, SVG)।' : 'Please select a valid image file.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError(lang === 'bn' ? 'ছবির সাইজ ৩ মেগাবাইটের বেশি হতে পারবে না।' : 'Image size cannot exceed 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSiteLogoUrl(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLogoUrl = () => {
    if (!logoUrlInput.trim()) return;
    setSiteLogoUrl(logoUrlInput.trim());
    setLogoUrlInput('');
    setError(null);
  };

  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  const handleResetToDefault = () => {
    if (!isConfirmingReset) {
      setIsConfirmingReset(true);
      setError(lang === 'bn' ? '⚠️ নিশ্চিত করতে পুনরায় "রিসেট করুন" বাটনে চাপুন।' : '⚠️ Click Reset again to confirm.');
      setTimeout(() => setIsConfirmingReset(false), 5000);
      return;
    }
    setIsConfirmingReset(false);
    setSiteName(DEFAULT_SITE_SETTINGS.siteName);
    setSiteBadge(DEFAULT_SITE_SETTINGS.siteBadge);
    setSiteLogoUrl('');
    setTaglineBn(DEFAULT_SITE_SETTINGS.taglineBn);
    setTaglineEn(DEFAULT_SITE_SETTINGS.taglineEn);
    setThemeColor('cyan');
    setYoutubeChannelUrl(DEFAULT_SITE_SETTINGS.youtubeChannelUrl);
    setYoutubeChannelName(DEFAULT_SITE_SETTINGS.youtubeChannelName);
    setYoutubeBannerTextBn(DEFAULT_SITE_SETTINGS.youtubeBannerTextBn);
    setShowYoutubeBanner(true);
    setAnnouncementNotice('');
    setNoticeType('info');
    setStorageQuotaGb(1000);
    setFooterCopyright(DEFAULT_SITE_SETTINGS.footerCopyright || '');
    setContactSupport('');
    setAllowRegistrations(true);
    setSuccess(lang === 'bn' ? 'ডিফল্ট মান লোড হয়েছে। সেভ বাটনে ক্লিক করুন।' : 'Default values loaded. Click Save.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!siteName.trim()) {
      setError(lang === 'bn' ? 'ওয়েবসাইটের নাম খালি রাখা যাবে না।' : 'Website name cannot be empty.');
      return;
    }

    setIsSaving(true);

    const updatedSettings: SiteSettings = {
      siteName: siteName.trim(),
      siteBadge: siteBadge.trim() || '1000GB',
      siteLogoUrl: siteLogoUrl.trim() || '',
      taglineBn: taglineBn.trim() || DEFAULT_SITE_SETTINGS.taglineBn,
      taglineEn: taglineEn.trim() || DEFAULT_SITE_SETTINGS.taglineEn,
      themeColor,
      youtubeChannelUrl: youtubeChannelUrl.trim() || DEFAULT_SITE_SETTINGS.youtubeChannelUrl,
      youtubeChannelName: youtubeChannelName.trim() || DEFAULT_SITE_SETTINGS.youtubeChannelName,
      youtubeBannerTextBn: youtubeBannerTextBn.trim() || DEFAULT_SITE_SETTINGS.youtubeBannerTextBn,
      showYoutubeBanner,
      announcementNotice: announcementNotice.trim() || '',
      noticeType,
      storageQuotaGb: Number(storageQuotaGb) || 1000,
      footerCopyright: footerCopyright.trim() || DEFAULT_SITE_SETTINGS.footerCopyright,
      contactSupport: contactSupport.trim() || '',
      allowRegistrations,
      bkashNumber: siteSettings.bkashNumber || '01734211584',
      nagadNumber: siteSettings.nagadNumber || '01734211584',
      subscriptionFee: siteSettings.subscriptionFee || 100,
      updatedAt: new Date().toISOString()
    };

    try {
      await onSaveSettings(updatedSettings);
      setSuccess(
        lang === 'bn'
          ? 'ওয়েবসাইটের লোগো, নাম ও সমস্ত সেটিংস সফলভাবে ক্লাউডে সংরক্ষিত হয়েছে!'
          : 'Website settings & branding saved to Cloud successfully!'
      );
      setIsSaving(false);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(lang === 'bn' ? 'সেটিংস সেভ করতে সমস্যা হয়েছে।' : 'Failed to save settings.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-5 sm:p-7 text-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Ambient background glows */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/25 shrink-0">
              <Sliders className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {lang === 'bn' ? 'ওয়েবসাইটের সবকিছু কাস্টমাইজেশন ও লোগো' : 'Website Settings & Branding Control'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'bn'
                  ? 'ওয়েবসাইটের লোগো আপলোড করুন, নাম পরিবর্তন করুন এবং সমস্ত সেটিংস নিয়ন্ত্রণ করুন'
                  : 'Upload website logo, change name, customize colors, YouTube banner & notice'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="relative z-10 mt-3 p-3 bg-red-950/70 border border-red-800/80 rounded-2xl text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="relative z-10 mt-3 p-3 bg-emerald-950/70 border border-emerald-800/80 rounded-2xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="relative z-10 flex items-center gap-2 border-b border-slate-800/80 pt-3 pb-2.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'branding'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>{lang === 'bn' ? 'লোগো ও নাম (Logo & Name)' : 'Logo & Name'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('youtube')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'youtube'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Youtube className="w-4 h-4" />
            <span>{lang === 'bn' ? 'ইউটিউব চ্যানেল (YouTube)' : 'YouTube Channel'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notice')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'notice'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>{lang === 'bn' ? 'নোটিশ, কোটা ও যোগাযোগ' : 'Notice, Quota & Support'}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="relative z-10 flex-1 overflow-y-auto space-y-5 pr-1 py-3">
          
          {/* TAB 1: LOGO, NAME & BRANDING */}
          {activeTab === 'branding' && (
            <div className="space-y-4">
              
              {/* LIVE BRANDING PREVIEW CARD */}
              <div className="bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-bold text-cyan-300">
                    <Eye className="w-3.5 h-3.5" />
                    {lang === 'bn' ? 'লাইভ প্রিভিউ (ওয়েবসাইটের হেডারে যেভাবে দেখাবে)' : 'Live Preview in Header'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Real-time Preview</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {siteLogoUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-400 shadow-md shadow-cyan-500/20 bg-slate-950 shrink-0">
                        <img src={siteLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-cyan-500/20 shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-black text-white tracking-tight">{siteName || 'Bashar'}</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-black tracking-wide rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 uppercase shadow-sm">
                          {siteBadge || '1000GB'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate max-w-xs">
                        {lang === 'bn' ? taglineBn : taglineEn}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-emerald-400 font-mono px-2 py-0.5 bg-emerald-950/60 rounded border border-emerald-800/40 shrink-0">
                    Active
                  </span>
                </div>
              </div>

              {/* WEBSITE LOGO CONTROLS */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      <span>{lang === 'bn' ? 'ওয়েবসাইটের লোগো আপলোড (Website Logo)' : 'Website Logo'}</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {lang === 'bn' ? 'আপনার কম্পিউটার বা মোবাইল থেকে লোগোর ছবি আপলোড করুন অথবা অনলাইন লিংক দিন' : 'Upload from device or enter image URL'}
                    </p>
                  </div>

                  {siteLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setSiteLogoUrl('')}
                      className="px-2.5 py-1 text-xs text-red-400 hover:text-white bg-red-950/60 hover:bg-red-900 border border-red-800/60 rounded-lg transition cursor-pointer"
                    >
                      {lang === 'bn' ? 'লোগো মুছুন (রিসেট)' : 'Remove Logo'}
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition shrink-0"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'ডিভাইস থেকে লোগো আপলোড' : 'Upload Logo File'}</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* URL INPUT */}
                  <div className="flex-1 w-full flex items-center gap-2">
                    <input
                      type="url"
                      value={logoUrlInput}
                      onChange={e => setLogoUrlInput(e.target.value)}
                      placeholder={lang === 'bn' ? 'অথবা লোগোর ইমেজ URL পেস্ট করুন...' : 'Or paste image URL...'}
                      className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyLogoUrl}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                    >
                      {lang === 'bn' ? 'প্রয়োগ' : 'Apply'}
                    </button>
                  </div>
                </div>

                {/* PRESET LOGOS */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                    {lang === 'bn' ? 'অথবা প্রিসেট লোগো বেছে নিন:' : 'Or choose from curated preset logos:'}
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {PRESET_SITE_LOGOS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => { setSiteLogoUrl(preset.url); setError(null); }}
                        className={`group relative rounded-xl overflow-hidden border p-1 transition flex flex-col items-center gap-1 cursor-pointer ${
                          siteLogoUrl === preset.url
                            ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-cyan-950/40'
                            : 'border-slate-800 hover:border-slate-600 bg-slate-900/60'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-950">
                          <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium truncate w-full text-center">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* WEBSITE NAME & BADGE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{lang === 'bn' ? 'ওয়েবসাইটের নাম (Website Name)' : 'Website Name'}</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    {lang === 'bn' ? 'যেমন: Bashar, MyCloud, ইত্যাদি' : 'e.g. Bashar, MyCloud Vault'}
                  </p>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={e => setSiteName(e.target.value)}
                    placeholder="Bashar"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:border-cyan-400 focus:outline-none font-bold"
                  />
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>{lang === 'bn' ? 'ব্র্যান্ড ব্যাজ টেক্সট (Brand Badge)' : 'Brand Badge'}</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    {lang === 'bn' ? 'যেমন: 1000GB, 2000GB, PRO ইত্যাদি' : 'e.g. 1000GB, 2000GB, PRO'}
                  </p>
                  <input
                    type="text"
                    value={siteBadge}
                    onChange={e => setSiteBadge(e.target.value)}
                    placeholder="1000GB"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:border-cyan-400 focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* TAGLINES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-white">
                    {lang === 'bn' ? 'বাংলা স্লোগান (Bangla Tagline)' : 'Bangla Tagline'}
                  </label>
                  <input
                    type="text"
                    value={taglineBn}
                    onChange={e => setTaglineBn(e.target.value)}
                    placeholder="১ টেরাবাইট হাই-স্পিড ক্লাউড ভল্ট"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-white">
                    {lang === 'bn' ? 'ইংরেজি স্লোগান (English Tagline)' : 'English Tagline'}
                  </label>
                  <input
                    type="text"
                    value={taglineEn}
                    onChange={e => setTaglineEn(e.target.value)}
                    placeholder="1 TB Ultra-Fast Cloud Vault"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* THEME ACCENT COLOR */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lang === 'bn' ? 'ওয়েবসাইটের থিম অ্যাকসেন্ট কালার' : 'Theme Accent Style'}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setThemeColor(theme.id)}
                      className={`p-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                        themeColor === theme.id
                          ? `${theme.border} bg-slate-800 shadow-md`
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${theme.color} shrink-0`} />
                      <span className="text-[11px] font-semibold text-slate-200 truncate">
                        {lang === 'bn' ? theme.nameBn : theme.nameEn}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: YOUTUBE CHANNEL CONFIGURATION */}
          {activeTab === 'youtube' && (
            <div className="space-y-4">
              <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                    <Youtube className="w-5 h-5 fill-red-500 text-red-500" />
                    <span>{lang === 'bn' ? 'ইউটিউব চ্যানেল ব্যানার কনফিগারেশন' : 'YouTube Channel Banner'}</span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={showYoutubeBanner}
                      onChange={e => setShowYoutubeBanner(e.target.checked)}
                      className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                    />
                    <span className="font-semibold text-slate-200">
                      {lang === 'bn' ? 'ব্যানার প্রদর্শন করুন' : 'Show Banner'}
                    </span>
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {lang === 'bn' ? 'ইউটিউব চ্যানেলের লিংক (Channel URL)' : 'Channel URL'}
                    </label>
                    <input
                      type="url"
                      value={youtubeChannelUrl}
                      onChange={e => setYoutubeChannelUrl(e.target.value)}
                      placeholder="http://www.youtube.com/@BasharGojolStudio"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 font-mono focus:border-red-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {lang === 'bn' ? 'চ্যানেলের নাম (Channel Display Name)' : 'Channel Display Name'}
                    </label>
                    <input
                      type="text"
                      value={youtubeChannelName}
                      onChange={e => setYoutubeChannelName(e.target.value)}
                      placeholder="Bashar Gojol Studio"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:border-red-400 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {lang === 'bn' ? 'ব্যানারে প্রদর্শিত অনুরোধ বার্তা' : 'Banner Request Text'}
                    </label>
                    <input
                      type="text"
                      value={youtubeBannerTextBn}
                      onChange={e => setYoutubeBannerTextBn(e.target.value)}
                      placeholder="❤️ কষ্ট করে আমাদের চ্যানেলটি সাবস্ক্রাইব করে সহযোগিতা করুন। 🌸"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-red-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTICE, SUPPORT & SYSTEM SETTINGS */}
          {activeTab === 'notice' && (
            <div className="space-y-4">
              
              {/* GLOBAL ANNOUNCEMENT */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
                    <Bell className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'গ্লোবাল নোটিশ / জরুরি ঘোষণা (Global Notice)' : 'Global Announcement Notice'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">{lang === 'bn' ? 'ধরন:' : 'Type:'}</span>
                    <select
                      value={noticeType}
                      onChange={e => setNoticeType(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-1 text-slate-200 focus:outline-none"
                    >
                      <option value="info">তথ্য (Info - Cyan)</option>
                      <option value="warning">সতর্কতা (Warning - Amber)</option>
                      <option value="alert">জরুরি (Urgent Alert - Red)</option>
                      <option value="success">সাফল্য (Success - Green)</option>
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  {lang === 'bn' ? 'এখানে বার্তা লিখলে তা ওয়েবসাইটের সর্বউপরে সমস্ত ইউজারের জন্য হাইলাইট হয়ে প্রদর্শিত হবে।' : 'If set, this announcement will be displayed at the very top of the site.'}
                </p>

                <textarea
                  value={announcementNotice}
                  onChange={e => setAnnouncementNotice(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: সার্ভার রক্ষণাবেক্ষণ চলছে অথবা নতুন ফিচার চালু হয়েছে...' : 'e.g. Special announcement for all users...'}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* STORAGE QUOTA GB */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs sm:text-sm">
                  <HardDrive className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'ডিফল্ট ইউজার স্টোরেজ কোটা (Storage Quota Limit in GB)' : 'Default User Storage Quota'}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn' ? 'প্রতিটি নতুন ইউজারের জন্য বরাদ্দকৃত স্টোরেজ স্পেস (জিবি-তে)' : 'Storage capacity allocated per user (in GB)'}
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={storageQuotaGb}
                    onChange={e => setStorageQuotaGb(Number(e.target.value))}
                    className="w-32 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-cyan-300 font-mono font-bold focus:border-cyan-400 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-400">GB (Gigabytes)</span>
                </div>
              </div>

              {/* SUPPORT / CONTACT LINK */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm">
                  <MessageSquare className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'সাপোর্ট ও যোগাযোগ লিংক (Support Contact / Telegram / WhatsApp)' : 'Support Contact Link'}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn' ? 'ইউজাররা সাহায্যের জন্য যে টেলিগ্রাম, হোয়াটসঅ্যাপ বা ইমেইলে যোগাযোগ করবে' : 'Support channel link for users (Telegram, WhatsApp, Email)'}
                </p>
                <input
                  type="text"
                  value={contactSupport}
                  onChange={e => setContactSupport(e.target.value)}
                  placeholder="https://t.me/yourusername অথবা support@example.com"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              {/* FOOTER COPYRIGHT TEXT */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-300 font-bold text-xs sm:text-sm">
                  <Copyright className="w-4 h-4 text-cyan-400" />
                  <span>{lang === 'bn' ? 'ফুটার কপিরাইট টেক্সট (Footer Copyright)' : 'Footer Copyright Text'}</span>
                </div>
                <input
                  type="text"
                  value={footerCopyright}
                  onChange={e => setFooterCopyright(e.target.value)}
                  placeholder="© 2026 Bashar 1000GB Cloud Storage. সর্বস্বত্ব সংরক্ষিত।"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* ALLOW REGISTRATIONS TOGGLE */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-white block">
                      {lang === 'bn' ? 'নতুন ইউজার রেজিস্ট্রেশন অনুমতি' : 'Allow New User Registrations'}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {lang === 'bn' ? 'বন্ধ থাকলে নতুন কেউ সাইন আপ করতে পারবে না' : 'Disable to temporarily pause new registrations'}
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRegistrations}
                    onChange={e => setAllowRegistrations(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'পূর্বাবস্থায় রিসেট' : 'Reset to Default'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition cursor-pointer disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>{lang === 'bn' ? 'ক্লাউডে সেভ হচ্ছে...' : 'Saving to Cloud...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'সমস্ত পরিবর্তন সেভ করুন' : 'Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
