import React, { useState } from 'react';
import { StorageFile, FileCategory } from '../types/storage';
import { 
  X, 
  PanelRightClose, 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Archive, 
  Code, 
  Lock, 
  Unlock, 
  Calendar, 
  HardDrive, 
  MapPin, 
  Share2, 
  Download, 
  Trash2, 
  Star, 
  Eye, 
  Copy, 
  Check, 
  FolderInput, 
  Info,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { toBengaliDigits } from '../utils/bengaliNaming';

interface FileDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFile: StorageFile | null;
  allFiles: StorageFile[];
  currentFolder: StorageFile | null;
  onPreview: (file: StorageFile) => void;
  onDownload: (file: StorageFile) => void;
  onShare: (file: StorageFile) => void;
  onDelete: (file: StorageFile) => void;
  onToggleStar: (file: StorageFile) => void;
  onMoveCopy?: (file: StorageFile) => void;
  onNavigateToFolder?: (folderId: string | null) => void;
  isTrash?: boolean;
  lang: 'bn' | 'en';
}

export const FileDetailsPanel: React.FC<FileDetailsPanelProps> = ({
  isOpen,
  onClose,
  selectedFile,
  allFiles,
  currentFolder,
  onPreview,
  onDownload,
  onShare,
  onDelete,
  onToggleStar,
  onMoveCopy,
  onNavigateToFolder,
  isTrash = false,
  lang
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return selectedFile?.isFolder ? (lang === 'bn' ? 'ফোল্ডার' : 'Folder') : '0 B';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    const unit = sizes[i];
    return lang === 'bn' ? `${toBengaliDigits(val)} ${unit}` : `${val} ${unit}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      const formatted = d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', options);
      return lang === 'bn' ? toBengaliDigits(formatted) : formatted;
    } catch {
      return dateStr;
    }
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return lang === 'bn' ? 'মাত্র এইমাত্র' : 'Just now';
      if (diffMins < 60) return lang === 'bn' ? `${toBengaliDigits(diffMins)} মিনিট আগে` : `${diffMins} min ago`;
      if (diffHours < 24) return lang === 'bn' ? `${toBengaliDigits(diffHours)} ঘণ্টা আগে` : `${diffHours} hr ago`;
      if (diffDays === 1) return lang === 'bn' ? 'গতকাল' : 'Yesterday';
      return lang === 'bn' ? `${toBengaliDigits(diffDays)} দিন আগে` : `${diffDays} days ago`;
    } catch {
      return '';
    }
  };

  // Build storage location breadcrumb path
  const buildLocationPath = (file: StorageFile) => {
    const pathSegments: { name: string; id: string | null }[] = [
      { name: lang === 'bn' ? 'বাশার ক্লাউড' : 'Bashar Cloud', id: null }
    ];

    if (!file.folderId) {
      return pathSegments;
    }

    // Traverse upwards to construct breadcrumb
    let curFolderId: string | null | undefined = file.folderId;
    const visited = new Set<string>();
    const breadcrumbChain: { name: string; id: string | null }[] = [];

    while (curFolderId && !visited.has(curFolderId)) {
      visited.add(curFolderId);
      const parent = allFiles.find(f => f.id === curFolderId);
      if (parent) {
        breadcrumbChain.unshift({ name: parent.name, id: parent.id });
        curFolderId = parent.folderId;
      } else {
        break;
      }
    }

    return [...pathSegments, ...breadcrumbChain];
  };

  const getCategoryDetails = (category: FileCategory, isFolder?: boolean) => {
    if (isFolder) {
      return {
        label: lang === 'bn' ? 'ফোল্ডার ডিরেক্টরি' : 'Folder Directory',
        icon: Folder,
        color: 'text-amber-400',
        badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
      };
    }
    switch (category) {
      case 'image':
        return {
          label: lang === 'bn' ? 'ইমেজ / ছবি' : 'Image File',
          icon: ImageIcon,
          color: 'text-purple-400',
          badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30'
        };
      case 'video':
        return {
          label: lang === 'bn' ? 'ভিডিও ফাইল' : 'Video File',
          icon: Video,
          color: 'text-rose-400',
          badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
        };
      case 'audio':
        return {
          label: lang === 'bn' ? 'অডিও ট্র্যাক' : 'Audio Track',
          icon: Music,
          color: 'text-cyan-400',
          badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
        };
      case 'document':
        return {
          label: lang === 'bn' ? 'ডকুমেন্ট' : 'Document',
          icon: FileText,
          color: 'text-blue-400',
          badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30'
        };
      case 'archive':
        return {
          label: lang === 'bn' ? 'সংকুচিত আর্কাইভ' : 'Compressed Archive',
          icon: Archive,
          color: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
        };
      case 'code':
        return {
          label: lang === 'bn' ? 'সোর্স কোড' : 'Source Code',
          icon: Code,
          color: 'text-teal-400',
          badgeBg: 'bg-teal-500/10 text-teal-300 border-teal-500/30'
        };
      default:
        return {
          label: lang === 'bn' ? 'সাধারণ ফাইল' : 'General File',
          icon: FileText,
          color: 'text-slate-400',
          badgeBg: 'bg-slate-500/10 text-slate-300 border-slate-500/30'
        };
    }
  };

  const locationPath = selectedFile ? buildLocationPath(selectedFile) : [];
  const categoryInfo = selectedFile ? getCategoryDetails(selectedFile.category, selectedFile.isFolder) : null;
  const CategoryIcon = categoryInfo ? categoryInfo.icon : FileText;

  // Percentage of 1000GB
  const totalQuotaBytes = 1000 * 1024 * 1024 * 1024;
  const percentageOf1000Gb = selectedFile ? ((selectedFile.size / totalQuotaBytes) * 100) : 0;
  const formattedPercent = percentageOf1000Gb < 0.0001 && percentageOf1000Gb > 0
    ? '< 0.0001%'
    : percentageOf1000Gb.toFixed(4) + '%';

  return (
    <aside 
      aria-label="File Metadata & Details Panel"
      className="w-full md:w-80 lg:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 flex flex-col h-full shrink-0 z-30 transition-all duration-300 shadow-2xl overflow-hidden"
    >
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {lang === 'bn' ? 'মেটাডাটা ও বিস্তারিত' : 'Metadata & Details'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {selectedFile ? (lang === 'bn' ? 'নির্বাচিত ফাইলের বিবরণ' : 'Selected file details') : (lang === 'bn' ? 'ড্রাইভ বিবরণ' : 'Drive overview')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title={lang === 'bn' ? 'সাইড প্যানেল বন্ধ করুন' : 'Collapse panel'}
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-xs">
        {selectedFile ? (
          <>
            {/* Visual Hero Preview Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-lg">
              {selectedFile.category === 'image' && selectedFile.dataUrl ? (
                <div 
                  onClick={() => onPreview(selectedFile)}
                  className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-800 cursor-pointer bg-slate-900/90 flex items-center justify-center group-hover:border-cyan-500/50 transition"
                  title={lang === 'bn' ? 'পূর্ণাঙ্গ প্রিভিউ দেখতে ক্লিক করুন' : 'Click to preview full image'}
                >
                  <img
                    src={selectedFile.dataUrl}
                    alt={selectedFile.name}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-center pb-2">
                    <span className="text-[10px] font-bold text-cyan-300 bg-slate-900/90 px-2.5 py-1 rounded-full border border-cyan-500/40 flex items-center gap-1.5 shadow-md">
                      <Eye className="w-3 h-3" />
                      {lang === 'bn' ? 'প্রিভিউ দেখুন' : 'View Preview'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center">
                  <div className={`p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 mb-3 shadow-inner ${categoryInfo?.color}`}>
                    <CategoryIcon className="w-12 h-12" />
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${categoryInfo?.badgeBg}`}>
                    {categoryInfo?.label}
                  </span>
                </div>
              )}

              {/* File Title and Extension */}
              <div className="mt-3 w-full">
                <div className="flex items-center justify-between gap-2">
                  <h4 
                    className="font-bold text-sm text-slate-100 truncate flex-1 text-left" 
                    title={selectedFile.name}
                  >
                    {selectedFile.name}
                  </h4>
                  <button
                    onClick={() => copyToClipboard(selectedFile.name, 'name')}
                    className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded transition cursor-pointer shrink-0"
                    title={lang === 'bn' ? 'ফাইল নাম কপি করুন' : 'Copy file name'}
                  >
                    {copiedField === 'name' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                
                <p className="text-[11px] text-slate-400 text-left mt-0.5 flex items-center gap-1.5">
                  <span>{formatBytes(selectedFile.size)}</span>
                  <span>•</span>
                  <span>{getRelativeTime(selectedFile.uploadedAt)}</span>
                </p>
              </div>

              {/* Quick Action Ribbon */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-around gap-1">
                <button
                  onClick={() => onPreview(selectedFile)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer flex flex-col items-center gap-1 flex-1"
                  title={lang === 'bn' ? 'প্রিভিউ' : 'Preview'}
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-[9px] font-medium">{lang === 'bn' ? 'প্রিভিউ' : 'View'}</span>
                </button>

                <button
                  onClick={() => onDownload(selectedFile)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer flex flex-col items-center gap-1 flex-1"
                  title={lang === 'bn' ? 'ডাউনলোড' : 'Download'}
                >
                  <Download className="w-4 h-4" />
                  <span className="text-[9px] font-medium">{lang === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                </button>

                <button
                  onClick={() => onShare(selectedFile)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 border border-slate-800 hover:border-blue-500/40 transition cursor-pointer flex flex-col items-center gap-1 flex-1"
                  title={lang === 'bn' ? 'শেয়ার' : 'Share'}
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-[9px] font-medium">{lang === 'bn' ? 'শেয়ার' : 'Share'}</span>
                </button>

                <button
                  onClick={() => onToggleStar(selectedFile)}
                  className={`p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition cursor-pointer flex flex-col items-center gap-1 flex-1 ${
                    selectedFile.isStarred ? 'text-amber-400 border-amber-500/40' : 'text-slate-400 hover:text-amber-400'
                  }`}
                  title={selectedFile.isStarred ? (lang === 'bn' ? 'স্টার বাতিল' : 'Unstar') : (lang === 'bn' ? 'স্টার করুন' : 'Star')}
                >
                  <Star className={`w-4 h-4 ${selectedFile.isStarred ? 'fill-amber-400' : ''}`} />
                  <span className="text-[9px] font-medium">{lang === 'bn' ? 'স্টার' : 'Star'}</span>
                </button>

                {!isTrash && onMoveCopy && (
                  <button
                    onClick={() => onMoveCopy(selectedFile)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-400 border border-slate-800 hover:border-purple-500/40 transition cursor-pointer flex flex-col items-center gap-1 flex-1"
                    title={lang === 'bn' ? 'মুভ বা কপি' : 'Move or Copy'}
                  >
                    <FolderInput className="w-4 h-4" />
                    <span className="text-[9px] font-medium">{lang === 'bn' ? 'মুভ' : 'Move'}</span>
                  </button>
                )}

                <button
                  onClick={() => onDelete(selectedFile)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-red-950/40 text-red-400 border border-slate-800 hover:border-red-500/40 transition cursor-pointer flex flex-col items-center gap-1 flex-1"
                  title={lang === 'bn' ? 'ডিলিট' : 'Delete'}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-[9px] font-medium">{lang === 'bn' ? 'ডিলিট' : 'Delete'}</span>
                </button>
              </div>
            </div>

            {/* Section 1: এনক্রিপশন স্ট্যাটাস (Encryption Status) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  {lang === 'bn' ? 'এনক্রিপশন স্ট্যাটাস' : 'Encryption Status'}
                </span>
                {selectedFile.isEncrypted ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    {lang === 'bn' ? 'ভল্ট এনক্রিপ্টেড' : 'Vault Encrypted'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Unlock className="w-3 h-3 text-slate-400" />
                    {lang === 'bn' ? 'স্ট্যান্ডার্ড' : 'Standard'}
                  </span>
                )}
              </div>

              {selectedFile.isEncrypted ? (
                <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200/90 text-[11px] leading-relaxed">
                  <p className="font-semibold text-amber-300 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {lang === 'bn' ? 'ক্লায়েন্ট-সাইড AES-256 এনক্রিপশন সক্রিয়' : 'Client-Side AES-256 Encrypted'}
                  </p>
                  <p className="mt-1 text-slate-300 text-[10px]">
                    {lang === 'bn' 
                      ? 'এই ফাইলটি আপনার সিক্রেট পাসফ্রেজ দিয়ে সুরক্ষিত। পাসফ্রেজ ছাড়া এই ফাইলের তথ্য কেউ অ্যাক্সেস বা পড়তে পারবে না।' 
                      : 'Protected with zero-knowledge AES passphrase encryption before being saved.'}
                  </p>
                  {selectedFile.encryptionHint && (
                    <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">{lang === 'bn' ? 'পাসওয়ার্ড ইঙ্গিত:' : 'Password Hint:'}</span>
                      <span className="font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                        {selectedFile.encryptionHint}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {lang === 'bn'
                    ? 'ফাইলটি সাধারণ ক্লাউড মোডে সুরক্ষিত। যেকোনো সময় সরাসরি প্রিভিউ ও শেয়ার করা যাবে।'
                    : 'Standard cloud storage mode with direct preview and fast delivery.'}
                </p>
              )}
            </div>

            {/* Section 2: স্টোরেজ লোকেশন (Storage Location) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                {lang === 'bn' ? 'স্টোরেজ লোকেশন ও পাথ' : 'Storage Location'}
              </span>

              {/* Breadcrumb Location Trail */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center flex-wrap gap-1 text-[11px]">
                {locationPath.map((seg, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                    {onNavigateToFolder && seg.id !== selectedFile.id ? (
                      <button
                        onClick={() => onNavigateToFolder(seg.id)}
                        className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition cursor-pointer flex items-center gap-1"
                        title={lang === 'bn' ? `এই ফোল্ডারে যান: ${seg.name}` : `Navigate to ${seg.name}`}
                      >
                        {idx === 0 ? <HardDrive className="w-3 h-3 text-cyan-400" /> : <Folder className="w-3 h-3 text-amber-400" />}
                        <span>{seg.name}</span>
                      </button>
                    ) : (
                      <span className="font-medium text-slate-200 flex items-center gap-1">
                        {idx === 0 ? <HardDrive className="w-3 h-3 text-cyan-400" /> : <Folder className="w-3 h-3 text-amber-400" />}
                        <span>{seg.name}</span>
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>{lang === 'bn' ? 'মূল ফোল্ডার আইডি:' : 'Parent Folder ID:'}</span>
                <span className="font-mono text-[10px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {selectedFile.folderId ? selectedFile.folderId.slice(0, 12) + '...' : (lang === 'bn' ? 'রুট ড্রাইভ (Root)' : 'Root Drive')}
                </span>
              </div>
            </div>

            {/* Section 3: ফাইলের ধরন ও ফরম্যাট (File Type & Format) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                {lang === 'bn' ? 'ফাইল মেটাডাটা ও টাইপ' : 'File Type & Technical Details'}
              </span>

              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">{lang === 'bn' ? 'ক্যাটাগরি:' : 'Category:'}</span>
                  <span className={`font-semibold capitalize px-2 py-0.5 rounded text-[10px] ${categoryInfo?.badgeBg}`}>
                    {categoryInfo?.label}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">{lang === 'bn' ? 'মাইম টাইপ (MIME):' : 'MIME Type:'}</span>
                  <span className="font-mono text-[10px] text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    {selectedFile.type || 'application/octet-stream'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">{lang === 'bn' ? 'ফাইল এক্সটেনশন:' : 'Extension:'}</span>
                  <span className="font-mono font-bold text-slate-200">
                    {selectedFile.name.includes('.') ? selectedFile.name.split('.').pop()?.toUpperCase() : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">{lang === 'bn' ? 'পছন্দের তারকা (Star):' : 'Starred:'}</span>
                  <span className="font-semibold text-slate-200 flex items-center gap-1">
                    {selectedFile.isStarred ? (
                      <>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-amber-300">{lang === 'bn' ? 'হ্যাঁ' : 'Yes'}</span>
                      </>
                    ) : (
                      <span>{lang === 'bn' ? 'না' : 'No'}</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">{lang === 'bn' ? 'পাবলিক শেয়ার:' : 'Public Share:'}</span>
                  <span className="font-semibold text-slate-200">
                    {selectedFile.shared?.isShared ? (
                      <span className="text-blue-400 flex items-center gap-1">
                        <Share2 className="w-3 h-3" />
                        {lang === 'bn' ? 'সক্রিয়' : 'Active'}
                      </span>
                    ) : (
                      <span className="text-slate-500">{lang === 'bn' ? 'ব্যক্তিগত' : 'Private'}</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: তারিখ ও সময় (Creation & Upload Dates) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                {lang === 'bn' ? 'তারিখ ও সময়সূচি' : 'Dates & Timeline'}
              </span>

              <div className="space-y-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {lang === 'bn' ? 'আপলোড / তৈরি করার সময়:' : 'Creation / Uploaded At:'}
                  </span>
                  <p className="font-semibold text-slate-100 text-xs">
                    {formatDate(selectedFile.uploadedAt)}
                  </p>
                  <p className="text-[10px] text-cyan-400 font-medium">
                    {getRelativeTime(selectedFile.uploadedAt)}
                  </p>
                </div>

                {selectedFile.updatedAt && selectedFile.updatedAt !== selectedFile.uploadedAt && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {lang === 'bn' ? 'সর্বশেষ পরিবর্তন:' : 'Last Modified:'}
                    </span>
                    <p className="font-semibold text-slate-100 text-xs">
                      {formatDate(selectedFile.updatedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: স্টোরেজ ব্যবহার (Storage Footprint in 1000GB) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                {lang === 'bn' ? 'স্টোরেজ ব্যবহার (১০০০ জিবি)' : 'Storage Footprint'}
              </span>

              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{lang === 'bn' ? 'ফাইলের আকার:' : 'File Size:'}</span>
                  <span className="font-bold text-white text-xs">{formatBytes(selectedFile.size)}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{lang === 'bn' ? 'সঠিক বাইট সংখ্যা:' : 'Exact Bytes:'}</span>
                  <span className="font-mono text-slate-300">
                    {lang === 'bn' ? toBengaliDigits(selectedFile.size.toLocaleString()) : selectedFile.size.toLocaleString()} Bytes
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{lang === 'bn' ? '১০০০ জিবির অংশ:' : 'Share of 1000 GB:'}</span>
                  <span className="font-mono text-cyan-300 font-semibold">{formattedPercent}</span>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
                  <div 
                    className="bg-gradient-to-r from-cyan-400 to-purple-500 h-1.5 rounded-full"
                    style={{ width: `${Math.max(percentageOf1000Gb, 2)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Section 6: সিস্টেম আইডি ও পরিচিতি (System Identifiers) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'bn' ? 'সিস্টেম পরিচিতি (ID)' : 'System Identifier'}
              </span>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px]">
                <span className="font-mono text-slate-300 truncate mr-2" title={selectedFile.id}>
                  {selectedFile.id}
                </span>
                <button
                  onClick={() => copyToClipboard(selectedFile.id, 'id')}
                  className="p-1 text-slate-400 hover:text-cyan-300 rounded transition cursor-pointer shrink-0"
                  title="Copy File ID"
                >
                  {copiedField === 'id' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state when no single file is actively selected */
          <div className="h-full flex flex-col items-center justify-center text-center py-12 px-2 text-slate-400 space-y-4">
            <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800 shadow-xl text-cyan-400/60">
              <Info className="w-10 h-10 animate-pulse" />
            </div>
            
            <div className="space-y-1.5 max-w-xs">
              <h4 className="text-sm font-bold text-slate-200">
                {lang === 'bn' ? 'কোনো ফাইল নির্বাচিত নেই' : 'No File Selected'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'bn'
                  ? 'যেকোনো ফাইলের বিস্তারিত মেটাডাটা, আপলোড তারিখ, ফোল্ডার লোকেশন ও এনক্রিপশন স্ট্যাটাস দেখতে ফাইলে ক্লিক করুন।'
                  : 'Select any file or folder to view its complete metadata, creation date, exact storage location, and AES encryption status.'}
              </p>
            </div>

            {/* Current Folder Context */}
            <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left text-xs space-y-2 mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'bn' ? 'বর্তমান ডিরেক্টরি' : 'Current Directory'}
              </span>
              <p className="font-semibold text-white">
                {currentFolder ? currentFolder.name : (lang === 'bn' ? 'বাশার ক্লাউড রুট ড্রাইভ' : 'Bashar Cloud Root')}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>{lang === 'bn' ? 'মোট ফাইল:' : 'Total Items:'}</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {lang === 'bn' ? toBengaliDigits(allFiles.length) : allFiles.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
