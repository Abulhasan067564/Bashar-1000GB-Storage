import React, { useState, useEffect, useRef } from 'react';
import { StorageFile } from '../../types/storage';
import { Edit3, X, Check, Folder, File, AlertCircle } from 'lucide-react';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: StorageFile | null;
  onRenameSubmit: (fileId: string, newName: string) => Promise<void> | void;
  lang: 'bn' | 'en';
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  onClose,
  file,
  onRenameSubmit,
  lang
}) => {
  const [baseName, setBaseName] = useState('');
  const [extension, setExtension] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file && isOpen) {
      if (file.isFolder) {
        setBaseName(file.name);
        setExtension('');
      } else {
        const lastDot = file.name.lastIndexOf('.');
        if (lastDot > 0 && lastDot < file.name.length - 1) {
          setBaseName(file.name.substring(0, lastDot));
          setExtension(file.name.substring(lastDot)); // includes the dot, e.g. '.png'
        } else {
          setBaseName(file.name);
          setExtension('');
        }
      }
      setError(null);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [file, isOpen]);

  if (!isOpen || !file) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanBase = baseName.trim();
    if (!cleanBase) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে একটি নাম লিখুন।' : 'Please enter a name.');
      return;
    }

    // Check invalid characters
    if (/[\/\\:*?"<>|]/.test(cleanBase)) {
      setError(lang === 'bn' ? 'নামে / \\ : * ? " < > | চিহ্নগুলো ব্যবহার করা যাবে না।' : 'Name cannot contain / \\ : * ? " < > |');
      return;
    }

    const finalName = file.isFolder ? cleanBase : `${cleanBase}${extension}`;
    if (finalName === file.name) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await Promise.resolve(onRenameSubmit(file.id, finalName));
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(lang === 'bn' ? 'নাম পরিবর্তনে সমস্যা হয়েছে।' : 'Failed to rename.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            {file.isFolder ? <Folder className="w-6 h-6 text-amber-400" /> : <Edit3 className="w-6 h-6 text-cyan-400" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {lang === 'bn'
                ? (file.isFolder ? 'ফোল্ডারের নাম পরিবর্তন করুন' : 'ফাইলের নাম পরিবর্তন করুন')
                : (file.isFolder ? 'Rename Folder' : 'Rename File')}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'নতুন কাঙ্ক্ষিত নাম প্রদান করুন' : 'Enter the new desired name'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {lang === 'bn' ? 'নাম' : 'Name'}
            </label>
            <div className="flex items-center rounded-xl bg-slate-950 border border-slate-700 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400 overflow-hidden">
              <input
                ref={inputRef}
                type="text"
                value={baseName}
                onChange={e => setBaseName(e.target.value)}
                placeholder={lang === 'bn' ? 'ফাইলের নাম লিখুন...' : 'Enter file name...'}
                className="w-full bg-transparent px-3 py-2 text-sm text-white focus:outline-none"
              />
              {extension && (
                <span className="px-3 py-2 text-xs font-mono text-cyan-400 bg-slate-800/60 border-l border-slate-700/60 select-none">
                  {extension}
                </span>
              )}
            </div>
            {!file.isFolder && extension && (
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === 'bn' 
                  ? `ফাইল ফরম্যাট (${extension}) স্বয়ংক্রিয়ভাবে সুরক্ষিত থাকবে` 
                  : `File format (${extension}) is automatically preserved`}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !baseName.trim()}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
