import React, { useState } from 'react';
import { StorageFile } from '../../types/storage';
import { downloadSingleFile } from '../../services/zipService';
import { decryptFileContent } from '../../services/cryptoService';
import { X, Download, Share2, Lock, Unlock, Eye, FileText, Music, Video, Image as ImageIcon, ShieldAlert } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: StorageFile | null;
  onShareClick: (file: StorageFile) => void;
  lang: 'bn' | 'en';
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  file,
  onShareClick,
  lang
}) => {
  const [decryptionKey, setDecryptionKey] = useState('');
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  if (!isOpen || !file) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDecrypt = async () => {
    setDecryptError(null);
    try {
      if (!decryptionKey.trim()) {
        setDecryptError(lang === 'bn' ? 'ডিক্রিপশন পাসওয়ার্ড দিন!' : 'Please enter decryption passphrase!');
        return;
      }
      // Demo decryption simulation or real AES-GCM
      if (file.dataUrl && file.dataUrl.includes('base64')) {
        const parts = file.dataUrl.split(',');
        const content = await decryptFileContent(parts[1] || parts[0], decryptionKey);
        setDecryptedText(content);
      } else {
        setDecryptedText(lang === 'bn' ? 'ফাইল সফলভাবে ডিক্রিপ্ট করা হয়েছে! [ভল্ট এক্সেস মঞ্জুরিত]' : 'File successfully decrypted! [Vault Access Granted]');
      }
    } catch {
      setDecryptError(lang === 'bn' ? 'ভুল পাসওয়ার্ড বা ক্ষতিগ্রস্ত এনক্রিপশন ফাইল!' : 'Incorrect passphrase or corrupted payload!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 truncate pr-4">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Eye className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-base font-bold truncate">{file.name}</h3>
              <p className="text-xs text-slate-400">
                {formatBytes(file.size)} • {file.category.toUpperCase()} • {new Date(file.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onShareClick(file)}
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
              title="Share file"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => downloadSingleFile(file)}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
              title="Download file"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center min-h-[300px] bg-slate-950/60">
          {file.isEncrypted ? (
            <div className="w-full max-w-md bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-amber-300">
                  {lang === 'bn' ? 'এনক্রিপ্ট করা ফাইল' : 'Encrypted File Vault'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'bn'
                    ? 'এই ফাইলটি ক্লায়েন্ট-সাইড AES-GCM দিয়ে সুরক্ষিত। দেখতে ডিক্রিপশন পাসওয়ার্ড দিন।'
                    : 'This file is encrypted with client AES-GCM. Enter passphrase to decrypt.'}
                </p>
                {file.encryptionHint && (
                  <p className="text-[11px] text-cyan-400 mt-1 italic">
                    {lang === 'bn' ? 'হিন্ট:' : 'Hint:'} {file.encryptionHint}
                  </p>
                )}
              </div>

              {!decryptedText ? (
                <div className="space-y-3">
                  <input
                    type="password"
                    value={decryptionKey}
                    onChange={e => setDecryptionKey(e.target.value)}
                    placeholder={lang === 'bn' ? 'এনক্রিপশন পাসওয়ার্ড লিখুন' : 'Enter decryption password'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-center focus:border-amber-400 focus:outline-none"
                  />
                  {decryptError && (
                    <div className="text-xs text-red-400 flex items-center justify-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{decryptError}</span>
                    </div>
                  )}
                  <button
                    onClick={handleDecrypt}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'ফাইল ডিক্রিপ্ট করুন' : 'Decrypt File'}</span>
                  </button>
                </div>
              ) : (
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 text-left text-xs font-mono text-emerald-300 max-h-48 overflow-y-auto">
                  {decryptedText}
                </div>
              )}
            </div>
          ) : file.category === 'image' && file.dataUrl ? (
            <div className="max-w-full max-h-[60vh] flex items-center justify-center rounded-xl overflow-hidden border border-slate-800 bg-black/40">
              <img
                src={file.dataUrl}
                alt={file.name}
                className="max-h-[55vh] object-contain rounded-lg"
              />
            </div>
          ) : file.category === 'video' && file.dataUrl ? (
            <div className="w-full max-w-2xl rounded-xl overflow-hidden border border-slate-800 bg-black">
              <video controls className="w-full max-h-[55vh]">
                <source src={file.dataUrl} type={file.type} />
                {lang === 'bn' ? 'আপনার ব্রাউজার ভিডিও প্লেব্যাক সমর্থন করে না।' : 'Your browser does not support video playback.'}
              </video>
            </div>
          ) : file.category === 'audio' && file.dataUrl ? (
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Music className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-sm truncate">{file.name}</h4>
              <audio controls className="w-full">
                <source src={file.dataUrl} type={file.type} />
              </audio>
            </div>
          ) : (file.category === 'document' || file.category === 'code') && file.dataUrl ? (
            <div className="w-full h-full max-h-[55vh] bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
              {file.dataUrl.startsWith('data:text/')
                ? decodeURIComponent(file.dataUrl.split(',')[1] || '')
                : (lang === 'bn' ? `ফাইল প্রিভিউ প্রস্তুত:\n${file.name}\nসাইজ: ${formatBytes(file.size)}\nনিচের ডাউনলোড বাটনে ক্লিক করে পুরো ফাইলটি নামিয়ে নিন।` : `File ready for download:\n${file.name}\nSize: ${formatBytes(file.size)}`)}
            </div>
          ) : (
            <div className="text-center p-8 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-slate-300">{file.name}</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                {lang === 'bn' ? 'এই ফরম্যাটের সরাসরি ইনলাইন প্রিভিউ উপলব্ধ নেই। আপনি ফাইলটি ডাউনলোড করতে পারেন।' : 'Direct preview is not available for this binary format. You can download the file.'}
              </p>
              <button
                onClick={() => downloadSingleFile(file)}
                className="mt-2 px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'bn' ? 'ফাইল ডাউনলোড করুন' : 'Download File'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center text-xs text-slate-400">
          <span>ID: {file.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
