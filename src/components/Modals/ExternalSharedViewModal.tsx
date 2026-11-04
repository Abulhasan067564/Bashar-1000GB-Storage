import React, { useState, useEffect } from 'react';
import { StorageFile } from '../../types/storage';
import { 
  X, 
  Download, 
  ShieldCheck, 
  Clock, 
  Lock, 
  Unlock, 
  Eye, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Archive, 
  Code, 
  AlertTriangle, 
  Check, 
  Copy, 
  ExternalLink,
  HardDrive
} from 'lucide-react';
import { toBengaliDigits } from '../../utils/bengaliNaming';

interface ExternalSharedViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: StorageFile | null;
  onDownload: (file: StorageFile) => void;
  onGoToDrive: () => void;
  lang: 'bn' | 'en';
}

export const ExternalSharedViewModal: React.FC<ExternalSharedViewModalProps> = ({
  isOpen,
  onClose,
  file,
  onDownload,
  onGoToDrive,
  lang
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>('');

  const expiresAt = file?.shared?.expiresAt;
  const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
  const requiresPassword = Boolean(file?.shared?.requiresPassword);

  useEffect(() => {
    if (file) {
      setIsUnlocked(!requiresPassword);
      setPasswordInput('');
      setPasswordError(false);
    }
  }, [file, requiresPassword]);

  // Expiration countdown
  useEffect(() => {
    if (!expiresAt) {
      setRemainingTime(lang === 'bn' ? 'মেয়াদহীন (স্থায়ী)' : 'No expiration (Permanent)');
      return;
    }

    const updateTimer = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemainingTime(lang === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Expired');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setRemainingTime(
          lang === 'bn' 
            ? `${toBengaliDigits(days)} দিন ${toBengaliDigits(hours)} ঘণ্টা বাকি` 
            : `${days}d ${hours}h remaining`
        );
      } else {
        setRemainingTime(
          lang === 'bn' 
            ? `${toBengaliDigits(hours)} ঘণ্টা ${toBengaliDigits(minutes)} মিনিট বাকি` 
            : `${hours}h ${minutes}m remaining`
        );
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 60000);
    return () => clearInterval(timer);
  }, [expiresAt, lang]);

  if (!isOpen || !file) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === (file.shared?.passwordHash || '')) {
      setIsUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    const unit = sizes[i];
    return lang === 'bn' ? `${toBengaliDigits(val)} ${unit}` : `${val} ${unit}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileCategoryIcon = () => {
    switch (file.category) {
      case 'image': return <ImageIcon className="w-8 h-8 text-purple-400" />;
      case 'video': return <Video className="w-8 h-8 text-rose-400" />;
      case 'audio': return <Music className="w-8 h-8 text-cyan-400" />;
      case 'archive': return <Archive className="w-8 h-8 text-emerald-400" />;
      case 'code': return <Code className="w-8 h-8 text-teal-400" />;
      default: return <FileText className="w-8 h-8 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {lang === 'bn' ? 'অস্থায়ী রিড-অনলি ফাইল ভিউয়ার' : 'Temporary Read-Only File Viewer'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {lang === 'bn' ? 'রিড-অনলি' : 'Read-Only'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'বাশার ক্লাউড ১০০০ জিবি স্টোরেজ থেকে শেয়ারকৃত' : 'Shared securely from Bashar Cloud 1000GB'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              title="Copy share URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (lang === 'bn' ? 'লিংক কপি' : 'Copy Link')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security & Expiry Notice Ribbon */}
        <div className="px-5 md:px-6 py-2.5 bg-cyan-950/40 border-b border-cyan-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-cyan-300">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {lang === 'bn' 
                ? 'বাহ্যিক এক্সেস মোড: আপনি শুধুমাত্র এই ফাইলটি দেখতে ও ডাউনলোড করতে পারবেন।' 
                : 'External Access Mode: You can view and download this file.'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{remainingTime}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 space-y-6 flex-1 overflow-y-auto">
          {isExpired ? (
            /* Expired Screen */
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
              <div className="p-4 rounded-3xl bg-red-950/60 border border-red-800/80 text-red-400">
                <AlertTriangle className="w-12 h-12" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">
                  {lang === 'bn' ? 'এই শেয়ার লিংকের মেয়াদ শেষ হয়ে গেছে' : 'This Share Link Has Expired'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'bn' 
                    ? 'ফাইল মালিক এই লিংকের জন্য যে সময়সীমা নির্ধারণ করেছিলেন তা অতিক্রান্ত হয়েছে। পুনরায় অ্যাক্সেস পেতে ফাইল মালিকের সাথে যোগাযোগ করুন।' 
                    : 'The temporary access period granted by the file owner has ended.'}
                </p>
              </div>
              <button
                onClick={onGoToDrive}
                className="mt-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                <span>{lang === 'bn' ? 'বাশার ক্লাউড ড্রাইভ খুলুন' : 'Open Bashar Cloud Drive'}</span>
              </button>
            </div>
          ) : !isUnlocked ? (
            /* Password Protection Screen */
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
              <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Lock className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {lang === 'bn' ? 'পাসওয়ার্ড সুরক্ষিত ফাইল' : 'Password Protected File'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'bn' ? 'ফাইলটি দেখতে এবং ডাউনলোড করতে অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।' : 'Enter the password provided by the owner to unlock this file.'}
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="w-full space-y-3">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder={lang === 'bn' ? 'পাসওয়ার্ড লিখুন...' : 'Enter password...'}
                  className={`w-full bg-slate-950 border ${passwordError ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-cyan-400'} rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none`}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-[11px] text-red-400 text-left">
                    {lang === 'bn' ? 'ভুল পাসওয়ার্ড! অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Incorrect password! Please try again.'}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'ফাইল আনলক করুন' : 'Unlock File'}</span>
                </button>
              </form>
            </div>
          ) : (
            /* Unlocked View: File Preview & Details */
            <div className="space-y-6">
              {/* Main File Preview Area */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[260px] max-h-[500px] overflow-hidden relative group">
                {file.category === 'image' && file.dataUrl ? (
                  <div className="w-full max-h-[460px] flex items-center justify-center">
                    <img
                      src={file.dataUrl}
                      alt={file.name}
                      className="max-h-[440px] max-w-full object-contain rounded-xl shadow-lg"
                    />
                  </div>
                ) : file.category === 'video' && file.dataUrl ? (
                  <video
                    src={file.dataUrl}
                    controls
                    className="max-h-[440px] max-w-full rounded-xl shadow-lg bg-black"
                  />
                ) : file.category === 'audio' && file.dataUrl ? (
                  <div className="py-8 w-full max-w-md flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <Music className="w-12 h-12" />
                    </div>
                    <audio src={file.dataUrl} controls className="w-full" />
                  </div>
                ) : file.category === 'document' || file.category === 'code' ? (
                  <div className="w-full p-4 bg-slate-900 rounded-xl border border-slate-800 text-left font-mono text-xs overflow-auto max-h-[360px] space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                      <span>{file.name}</span>
                      <span>{file.type || 'text/plain'}</span>
                    </div>
                    {file.dataUrl && file.dataUrl.startsWith('data:text/') ? (
                      <pre className="text-slate-200 whitespace-pre-wrap select-all">
                        {decodeURIComponent(escape(atob(file.dataUrl.split(',')[1] || '')))}
                      </pre>
                    ) : (
                      <div className="py-10 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto text-blue-400 mb-2" />
                        <p>{lang === 'bn' ? 'ডকুমেন্ট ফাইলটি সরাসরি ডাউনলোড করে দেখুন' : 'Download the document to view full contents'}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
                      {getFileCategoryIcon()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* File Meta Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{lang === 'bn' ? 'ফাইলের নাম' : 'Name'}</span>
                  <p className="text-xs font-bold text-slate-200 truncate" title={file.name}>{file.name}</p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{lang === 'bn' ? 'আকার' : 'Size'}</span>
                  <p className="text-xs font-bold text-slate-200">{formatBytes(file.size)}</p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}</span>
                  <p className="text-xs font-bold text-cyan-400 uppercase">{file.category}</p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{lang === 'bn' ? 'লিংক মেয়াদ' : 'Expires In'}</span>
                  <p className="text-xs font-bold text-amber-400">{remainingTime}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 md:px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onGoToDrive}
            className="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-2 cursor-pointer"
          >
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'bn' ? 'বাশার ক্লাউড ১০০০ জিবি স্টোরেজ' : 'Bashar Cloud 1000GB'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </button>

            {!isExpired && isUnlocked && (
              <button
                onClick={() => onDownload(file)}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>{lang === 'bn' ? 'ফাইল ডাউনলোড করুন' : 'Download File'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
