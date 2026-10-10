import React, { useState } from 'react';
import { StorageFile } from '../../types/storage';
import { Share2, Link as LinkIcon, Lock, Calendar, Copy, Check, QrCode, X, Globe, Shield } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: StorageFile | null;
  onUpdateFile: (updatedFile: StorageFile) => void;
  lang: 'bn' | 'en';
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  file,
  onUpdateFile,
  lang
}) => {
  if (!isOpen || !file) return null;

  const currentShared = file.shared || { isShared: false };
  const shareId = currentShared.shareId || `share-${file.id.substring(0, 8)}-${Math.random().toString(36).substring(2, 6)}`;
  const shareUrl = `${window.location.origin}/share/${shareId}`;

  const [isShared, setIsShared] = useState(currentShared.isShared);
  const [requirePassword, setRequirePassword] = useState(Boolean(currentShared.requiresPassword));
  const [password, setPassword] = useState(currentShared.passwordHash || '');
  const [expiryDays, setExpiryDays] = useState('7');
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    const updated: StorageFile = {
      ...file,
      shared: {
        isShared: isShared,
        shareId: shareId,
        requiresPassword: requirePassword,
        passwordHash: requirePassword ? password : undefined,
        expiresAt: expiryDays === '0' ? undefined : new Date(Date.now() + parseInt(expiryDays) * 86400000).toISOString(),
        views: currentShared.views || 0,
        downloads: currentShared.downloads || 0,
        allowDownload: true
      }
    };
    onUpdateFile(updated);
    onClose();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">
              {lang === 'bn' ? 'ফাইল শেয়ার করুন' : 'Share File'}
            </h3>
            <p className="text-xs text-slate-400 truncate max-w-sm">
              {file.name}
            </p>
          </div>
        </div>

        {/* Enable / Disable Share Toggle */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-sm font-semibold">
                {lang === 'bn' ? 'পাবলিক শেয়ার লিংক' : 'Public Share Link'}
              </p>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'লিংক থাকা যে কেউ ফাইলটি দেখতে বা ডাউনলোড করতে পারবে' : 'Anyone with link can view or download'}
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isShared}
            onChange={e => setIsShared(e.target.checked)}
            className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
          />
        </div>

        {isShared && (
          <div className="space-y-4 animate-in fade-in">
            {/* Share Link input with copy */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'bn' ? 'শেয়ার লিঙ্ক' : 'Shareable Link'}</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 select-all"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied!') : (lang === 'bn' ? 'কপি' : 'Copy')}</span>
                </button>
              </div>
            </div>

            {/* Password Protection */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    {lang === 'bn' ? 'পাসওয়ার্ড সুরক্ষা' : 'Password Protection'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={requirePassword}
                  onChange={e => setRequirePassword(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </div>

              {requirePassword && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={lang === 'bn' ? 'শেয়ার পাসওয়ার্ড দিন (যেমন: 1234)' : 'Enter share password'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {lang === 'bn' ? 'ডাউনলোডকারীকে এই পাসওয়ার্ডটি দিতে হবে।' : 'Recipients must enter this password to download.'}
                  </p>
                </div>
              )}
            </div>

            {/* Expiry Selector */}
            <div className="flex items-center justify-between bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">
                  {lang === 'bn' ? 'লিংকের মেয়াদ' : 'Link Expiration'}
                </span>
              </div>
              <select
                value={expiryDays}
                onChange={e => setExpiryDays(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="1">{lang === 'bn' ? '১ দিন (24 Hours)' : '1 Day'}</option>
                <option value="7">{lang === 'bn' ? '৭ দিন (1 Week)' : '7 Days'}</option>
                <option value="30">{lang === 'bn' ? '৩০ দিন (1 Month)' : '30 Days'}</option>
                <option value="0">{lang === 'bn' ? 'চিরস্থায়ী (Never)' : 'No Expiry'}</option>
              </select>
            </div>

            {/* QR Code view */}
            <div className="text-center p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl flex items-center justify-around">
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-300">
                  {lang === 'bn' ? 'মোবাইলে স্ক্যান করে ফাইল পান' : 'Instant Mobile QR Access'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {lang === 'bn' ? 'সরাসরি যেকোনো ডিভাইসে ফাইল ডাউনলোড করতে পারবেন' : 'Scan with mobile camera to view'}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg shadow">
                <QrCode className="w-12 h-12 text-slate-950" />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-700 text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-800 transition"
          >
            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Share Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
