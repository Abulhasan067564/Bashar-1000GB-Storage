import React, { useState, useRef, useEffect } from 'react';
import { StorageFile, FileCategory } from '../../types/storage';
import { detectFileCategory } from '../../services/indexedDbStorage';
import { encryptFileContent } from '../../services/cryptoService';
import { safeReadFileAsDataUrl } from '../../utils/fileReaderHelper';
import { Upload, FileUp, X, Lock, CheckCircle2, AlertCircle, Shield, Zap } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesUploaded: (newFiles: StorageFile[]) => Promise<void> | void;
  ownerId: string;
  ownerPhone?: string;
  currentFolderId?: string | null;
  lang: 'bn' | 'en';
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onFilesUploaded,
  ownerId,
  ownerPhone,
  currentFolderId,
  lang
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [encryptEnabled, setEncryptEnabled] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [encryptionHint, setEncryptionHint] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalDragCounter = useRef<number>(0);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter') {
      modalDragCounter.current += 1;
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      modalDragCounter.current -= 1;
      if (modalDragCounter.current <= 0) {
        modalDragCounter.current = 0;
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    modalDragCounter.current = 0;
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
      e.target.value = '';
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে কমপক্ষে একটি ফাইল নির্বাচন করুন।' : 'Please select at least one file.');
      return;
    }

    if (encryptEnabled && !passphrase.trim()) {
      setError(lang === 'bn' ? 'এনক্রিপশনের জন্য একটি পাসওয়ার্ড প্রদান করুন।' : 'Please provide a passphrase for encryption.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(5);

    try {
      let completedCount = 0;
      const processSingleFile = async (file: File, index: number): Promise<StorageFile> => {
        let dataUrl = await safeReadFileAsDataUrl(file);

        if (encryptEnabled) {
          // Encrypt client-side
          dataUrl = await encryptFileContent(dataUrl, passphrase);
        }

        const category: FileCategory = detectFileCategory(file.name, file.type);
        const storageFile: StorageFile = {
          id: 'file-' + Date.now() + '-' + index + '-' + Math.random().toString(36).substring(2, 8),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          category,
          dataUrl,
          uploadedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isStarred: false,
          isEncrypted: encryptEnabled,
          encryptionHint: encryptEnabled ? encryptionHint : undefined,
          inTrash: false,
          ownerId,
          ownerPhone: ownerPhone ? ownerPhone.trim() : undefined,
          folderId: currentFolderId || null,
          shared: { isShared: false }
        };

        completedCount++;
        setCurrentFileIndex(completedCount);
        setUploadProgress(Math.min(95, Math.round((completedCount / selectedFiles.length) * 90) + 5));
        return storageFile;
      };

      // Smooth chunking (2 files at a time) with animation frame yield to keep UI totally fluid and responsive
      const BATCH_SIZE = 2;
      const uploadedResults: StorageFile[] = [];
      for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
        const currentBatch = selectedFiles.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          currentBatch.map((file, batchIdx) => processSingleFile(file, i + batchIdx))
        );
        uploadedResults.push(...batchResults);
        // Micro-yield so the browser updates animations, progress bar, and never freezes
        await new Promise(resolve => setTimeout(resolve, 16));
      }

      setUploadProgress(98);
      await Promise.resolve(onFilesUploaded(uploadedResults));
      setUploadProgress(100);
      setIsUploading(false);
      onClose();
    } catch (err) {
      console.error(err);
      setError(lang === 'bn' ? 'ফাইল আপলোডে সমস্যা হয়েছে।' : 'Upload failed.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          disabled={isUploading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {lang === 'bn' ? 'ফাইল আপলোড করুন (১০০০ জিবি ক্লাউড)' : 'Upload Files (1000 GB Cloud)'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'একক বা একাধিক ফাইল একসাথে দ্রুত আপলোড করুন' : 'Single or bulk upload with high-speed engine'}
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold shadow-sm shadow-cyan-500/20 mr-7">
            <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400 animate-pulse" />
            <span>{lang === 'bn' ? '⚡ টার্বো স্পিড সক্রিয়' : '⚡ Turbo Speed Active'}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Drag & Drop Box */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center ${dragActive ? 'border-cyan-400 bg-cyan-950/20' : 'border-slate-700 hover:border-cyan-500/60 bg-slate-950/40'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-2 pointer-events-none">
              <FileUp className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-200 pointer-events-none">
              {lang === 'bn' ? 'এখানে ফাইল ড্রপ করুন অথবা ব্রাউজ করুন' : 'Drop files here or click to browse'}
            </p>
            <p className="text-xs text-slate-400 mt-1 pointer-events-none">
              {lang === 'bn' ? 'ছবি, ভিডিও, অডিও, পিডিএফ, জিপ, কোড ইত্যাদি যেকোনো ফাইল' : 'Images, Videos, Audio, PDF, ZIP, Code & all formats'}
            </p>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 pb-1 border-b border-slate-800">
                <span>{selectedFiles.length} {lang === 'bn' ? 'টি ফাইল নির্বাচিত' : 'files selected'}</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-red-400 hover:underline text-[11px]"
                >
                  {lang === 'bn' ? 'সব মুছুন' : 'Clear all'}
                </button>
              </div>
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-900">
                  <span className="truncate max-w-[320px] text-slate-200">{file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeSelectedFile(idx); }}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Client-side Encryption Checkbox */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-200">
                  {lang === 'bn' ? 'ক্লায়েন্ট-সাইড AES-256 এনক্রিপশন' : 'Client-Side AES-256 Encryption'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={encryptEnabled}
                onChange={e => setEncryptEnabled(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {lang === 'bn'
                ? 'ব্রাউজারে ফাইলটি সম্পূর্ণ এনক্রিপ্ট হয়ে ক্লাউডে সেভ হবে। সঠিক পাসওয়ার্ড ছাড়া কেউ এটি দেখতে পারবে না।'
                : 'Files will be encrypted locally using AES-GCM before storage.'}
            </p>

            {encryptEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    {lang === 'bn' ? 'এনক্রিপশন পাসওয়ার্ড' : 'Encryption Password'}
                  </label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-amber-600/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    {lang === 'bn' ? 'পাসওয়ার্ড হিন্ট (ঐচ্ছিক)' : 'Password Hint (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={encryptionHint}
                    onChange={e => setEncryptionHint(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: জন্মসাল বা অফিস' : 'e.g. Birth year'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Progress bar if uploading */}
          {isUploading && (
            <div className="space-y-1.5 p-3 bg-cyan-950/20 border border-cyan-800/40 rounded-xl">
              <div className="flex justify-between text-xs text-cyan-300">
                <span>{lang === 'bn' ? `আপলোড হচ্ছে: ${currentFileIndex + 1}/${selectedFiles.length}` : `Uploading: ${currentFileIndex + 1}/${selectedFiles.length}`}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end gap-2.5">
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="px-4 py-2 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
          >
            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={isUploading || selectedFiles.length === 0}
            onClick={handleUploadSubmit}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 cursor-pointer"
          >
            {isUploading
              ? (lang === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...')
              : (lang === 'bn' ? `আপলোড করুন (${selectedFiles.length})` : `Upload (${selectedFiles.length})`)}
          </button>
        </div>
      </div>
    </div>
  );
};
