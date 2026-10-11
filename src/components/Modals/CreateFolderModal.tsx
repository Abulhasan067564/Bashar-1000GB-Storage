import React, { useState } from 'react';
import { StorageFile } from '../../types/storage';
import { FolderPlus, X, Folder } from 'lucide-react';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated: (newFolder: StorageFile) => void;
  ownerId: string;
  currentFolderId?: string | null;
  lang: 'bn' | 'en';
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onFolderCreated,
  ownerId,
  currentFolderId,
  lang
}) => {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = folderName.trim();
    if (!trimmed) {
      setError(lang === 'bn' ? 'দয়া করে ফোল্ডারের নাম দিন।' : 'Please enter a folder name.');
      return;
    }

    const now = new Date().toISOString();
    const newFolder: StorageFile = {
      id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      name: trimmed,
      size: 0,
      type: 'inode/directory',
      category: 'other',
      uploadedAt: now,
      updatedAt: now,
      isStarred: false,
      isEncrypted: false,
      inTrash: false,
      ownerId,
      isFolder: true,
      folderId: currentFolderId || null
    };

    onFolderCreated(newFolder);
    setFolderName('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'bn' ? 'নতুন ফোল্ডার তৈরি করুন' : 'Create New Folder'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'ফাইল গুছিয়ে রাখতে ফোল্ডার ব্যবহার করুন' : 'Organize your files inside folders'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 text-red-200 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {lang === 'bn' ? 'ফোল্ডারের নাম:' : 'Folder Name:'}
            </label>
            <div className="relative">
              <Folder className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: গজল সংকলন, প্রয়োজনীয় ডকুমেন্টস' : 'e.g. Gojol Collection, Documents'}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition"
                autoFocus
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{lang === 'bn' ? 'ফোল্ডার তৈরি করুন' : 'Create Folder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
