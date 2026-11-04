import React, { useState } from 'react';
import { StorageFile, FileCategory, FOLDER_COLOR_PRESETS, getFolderColorStyle } from '../types/storage';
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
  Maximize2,
  Palette,
  Edit3,
  Link as LinkIcon,
  Globe,
  QrCode,
  ExternalLink,
  Timer
} from 'lucide-react';
import QRCode from 'qrcode';
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
  onRename?: (file: StorageFile) => void;
  onNavigateToFolder?: (folderId: string | null) => void;
  onSetFolderColor?: (folderId: string, colorId: string | undefined) => void;
  onUpdateFile?: (updatedFile: StorageFile) => void;
  onOpenExternalPreview?: (file: StorageFile) => void;
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
  onRename,
  onNavigateToFolder,
  onSetFolderColor,
  onUpdateFile,
  onOpenExternalPreview,
  isTrash = false,
  lang
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedExpiryHours, setSelectedExpiryHours] = useState<number>(24);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFirebaseUrl, setCopiedFirebaseUrl] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const isFileShared = Boolean(selectedFile?.shared?.isShared);
  const shareExpiresAt = selectedFile?.shared?.expiresAt;
  const isLinkExpired = shareExpiresAt ? new Date(shareExpiresAt).getTime() < Date.now() : false;

  const currentShareToken = selectedFile?.shared?.shareToken || selectedFile?.shared?.shareId || (selectedFile ? `share_${selectedFile.id.substring(0, 8)}` : '');
  const sharableLinkUrl = typeof window !== 'undefined' && selectedFile
    ? `${window.location.origin}?share=${selectedFile.id}&token=${currentShareToken}&readonly=true`
    : '';

  const firestoreDirectUrl = selectedFile 
    ? `https://firestore.googleapis.com/v1/projects/gen-lang-client-0084914471/databases/ai-studio-bashar1000gbclou-ec4191b2-db2e-4f6f-bae3-f7c5fd5dd992/documents/files/${selectedFile.id}`
    : '';

  React.useEffect(() => {
    if (isFileShared && sharableLinkUrl) {
      QRCode.toDataURL(sharableLinkUrl, {
        width: 180,
        margin: 1,
        color: { dark: '#020617', light: '#ffffff' }
      }).then(setQrDataUrl).catch(() => {});
    } else {
      setQrDataUrl('');
    }
  }, [isFileShared, sharableLinkUrl]);

  const getRemainingTimeString = (expiryIso?: string) => {
    if (!expiryIso) return lang === 'bn' ? 'স্থায়ী মেয়াদ (No Expiration)' : 'Permanent';
    const diff = new Date(expiryIso).getTime() - Date.now();
    if (diff <= 0) return lang === 'bn' ? 'মেয়াদ শেষ (Expired)' : 'Expired';
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (d > 0) {
      return lang === 'bn' ? `${toBengaliDigits(d)} দিন ${toBengaliDigits(h)} ঘণ্টা বাকি` : `${d}d ${h}h remaining`;
    }
    return lang === 'bn' ? `${toBengaliDigits(h)} ঘণ্টা ${toBengaliDigits(m)} মিনিট বাকি` : `${h}h ${m}m remaining`;
  };

  const handleGenerateSharableLink = (hours: number = selectedExpiryHours) => {
    if (!selectedFile) return;
    setIsGeneratingLink(true);

    const token = `bshr_temp_${selectedFile.id.substring(0, 6)}_${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
    const linkUrl = typeof window !== 'undefined'
      ? `${window.location.origin}?share=${selectedFile.id}&token=${token}&readonly=true`
      : '';

    const updatedFile: StorageFile = {
      ...selectedFile,
      updatedAt: new Date().toISOString(),
      shared: {
        ...(selectedFile.shared || {}),
        isShared: true,
        shareId: selectedFile.id,
        shareToken: token,
        expiresAt: expiresAt,
        isReadOnly: true,
        allowDownload: true,
        sharableLink: linkUrl,
        createdAt: new Date().toISOString()
      }
    };

    onUpdateFile?.(updatedFile);
    setIsGeneratingLink(false);

    navigator.clipboard.writeText(linkUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleRevokeSharableLink = () => {
    if (!selectedFile) return;
    const updatedFile: StorageFile = {
      ...selectedFile,
      updatedAt: new Date().toISOString(),
      shared: {
        ...(selectedFile.shared || {}),
        isShared: false,
        shareToken: undefined,
        expiresAt: undefined,
        sharableLink: undefined
      }
    };
    onUpdateFile?.(updatedFile);
  };

  const handleCopyLink = () => {
    if (!sharableLinkUrl) return;
    navigator.clipboard.writeText(sharableLinkUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyFirebaseUrl = () => {
    if (!firestoreDirectUrl) return;
    navigator.clipboard.writeText(firestoreDirectUrl);
    setCopiedFirebaseUrl(true);
    setTimeout(() => setCopiedFirebaseUrl(false), 2500);
  };

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

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden animate-in fade-in"
        aria-hidden="true"
      />

      <aside 
        aria-label="File Metadata & Details Panel"
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 max-w-[92vw] md:static md:w-80 lg:w-96 md:max-w-none bg-slate-900/98 md:bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 flex flex-col h-full shrink-0 transition-all duration-300 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200"
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

                {!isTrash && onRename && (
                  <button
                    onClick={() => onRename(selectedFile)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer flex flex-col items-center gap-1 flex-1"
                    title={lang === 'bn' ? 'নাম পরিবর্তন' : 'Rename'}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="text-[9px] font-medium">{lang === 'bn' ? 'রিনেম' : 'Rename'}</span>
                  </button>
                )}

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

              {/* Generate Sharable Link Callout Button */}
              {!selectedFile.isFolder && (
                <button
                  onClick={() => handleGenerateSharableLink()}
                  disabled={isGeneratingLink}
                  className="mt-3 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 cursor-pointer disabled:opacity-50"
                  title={lang === 'bn' ? 'ফায়ারবেস অস্থায়ী রিড-অনলি লিংক তৈরি করুন' : 'Generate temporary read-only sharable link'}
                >
                  <LinkIcon className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {isGeneratingLink 
                      ? (lang === 'bn' ? 'লিংক তৈরি হচ্ছে...' : 'Generating Link...') 
                      : (isFileShared && !isLinkExpired 
                          ? (lang === 'bn' ? 'শেয়ারেবল লিংক রিফ্রেশ করুন' : 'Refresh Sharable Link') 
                          : (lang === 'bn' ? 'Generate Sharable Link' : 'Generate Sharable Link'))}
                  </span>
                </button>
              )}
            </div>

            {/* Dedicated Section: Firebase Sharable Link Panel */}
            {!selectedFile.isFolder && (
              <div className="bg-slate-950/70 border border-cyan-500/30 rounded-2xl p-4 space-y-3.5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    {lang === 'bn' ? 'অস্থায়ী শেয়ারেবল লিংক (Firebase Link)' : 'Temporary Sharable Link'}
                  </span>
                  
                  {isFileShared && !isLinkExpired ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {lang === 'bn' ? 'সক্রিয়' : 'Active'}
                    </span>
                  ) : isLinkExpired ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                      {lang === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Expired'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      {lang === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive'}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {lang === 'bn'
                    ? 'ফায়ারবেস ক্লাউডের মাধ্যমে একটি অস্থায়ী ও রিড-অনলি এক্সেস লিংক তৈরি করুন। বহিরাগত ব্যবহারকারী কোনো লগইন ছাড়াই ফাইল দেখতে ও ডাউনলোড করতে পারবে।'
                    : 'Create a temporary read-only access link via Firebase. External users can view and download without altering your files.'}
                </p>

                {/* Expiry Options Picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Timer className="w-3 h-3 text-cyan-400" />
                    <span>{lang === 'bn' ? 'লিংকের মেয়াদ নির্ধারণ করুন:' : 'Set Expiration Duration:'}</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1 text-[10px]">
                    {[
                      { hours: 24, labelBn: '২৪ ঘণ্টা', labelEn: '24h' },
                      { hours: 72, labelBn: '৩ দিন', labelEn: '3 Days' },
                      { hours: 168, labelBn: '৭ দিন', labelEn: '7 Days' },
                      { hours: 720, labelBn: '৩০ দিন', labelEn: '30 Days' }
                    ].map(opt => (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => {
                          setSelectedExpiryHours(opt.hours);
                          if (isFileShared) {
                            handleGenerateSharableLink(opt.hours);
                          }
                        }}
                        className={`py-1.5 px-1 rounded-lg border text-center transition cursor-pointer font-medium ${
                          selectedExpiryHours === opt.hours
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                        }`}
                      >
                        {lang === 'bn' ? opt.labelBn : opt.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button if not yet shared */}
                {(!isFileShared || isLinkExpired) ? (
                  <button
                    onClick={() => handleGenerateSharableLink()}
                    disabled={isGeneratingLink}
                    className="w-full py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                  >
                    <LinkIcon className="w-4 h-4 stroke-[2.5]" />
                    <span>{lang === 'bn' ? 'Generate Sharable Link (লিংক তৈরি করুন)' : 'Generate Sharable Link'}</span>
                  </button>
                ) : (
                  /* Active Link Details */
                  <div className="space-y-3 pt-1">
                    {/* Shareable Link Box */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <LinkIcon className="w-3 h-3 text-cyan-400" />
                          {lang === 'bn' ? 'অস্থায়ী রিড-অনলি লিংক:' : 'Sharable Link (Read-Only):'}
                        </span>
                        <span className="text-amber-400 font-mono text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {getRemainingTimeString(shareExpiresAt)}
                        </span>
                      </div>

                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={sharableLinkUrl}
                          onFocus={e => e.target.select()}
                          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-cyan-300 select-all focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-[11px] flex items-center gap-1 transition cursor-pointer shrink-0"
                          title="Copy Link"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied!') : (lang === 'bn' ? 'কপি' : 'Copy')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Firebase Firestore Direct Document Reference */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-blue-400" />
                          {lang === 'bn' ? 'ফায়ারবেস ক্লাউড ডকুমেন্ট রেফারেন্স:' : 'Firebase Firestore Document URL:'}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyFirebaseUrl}
                          className="text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-0.5 cursor-pointer"
                        >
                          {copiedFirebaseUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedFirebaseUrl ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied') : (lang === 'bn' ? 'URL কপি' : 'Copy URL')}</span>
                        </button>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-400 truncate select-all">
                        {firestoreDirectUrl}
                      </div>
                    </div>

                    {/* Read-Only Safety Notice */}
                    <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-start gap-2 text-[10px] text-cyan-200/90">
                      <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-cyan-300">
                          {lang === 'bn' ? 'রিড-অনলি নিরাপত্তা সুরক্ষায় সক্রিয়' : 'Read-Only Security Enforced'}
                        </p>
                        <p className="text-slate-400 mt-0.5 text-[10px]">
                          {lang === 'bn'
                            ? 'লিংকটি পাওয়া যে কেউ ফাইলটি দেখতে ও ডাউনলোড করতে পারবে, কিন্তু কোনো ফাইল পরিবর্তন বা ডিলিট করতে পারবে না।'
                            : 'Anyone with this link can view and download the file. No editing or deletion privileges are granted.'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons: Test View, QR Code, Revoke */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenExternalPreview) {
                            onOpenExternalPreview(selectedFile);
                          } else {
                            window.open(sharableLinkUrl, '_blank');
                          }
                        }}
                        className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700/80 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title={lang === 'bn' ? 'বহিরাগত প্রিভিউ টেস্ট করুন' : 'Test external preview'}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{lang === 'bn' ? 'টেস্ট ভিউ' : 'Test View'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowQr(prev => !prev)}
                        className={`py-1.5 px-2.5 rounded-xl text-[10px] font-semibold border flex items-center gap-1 transition cursor-pointer ${
                          showQr 
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400' 
                            : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                        }`}
                        title="QR Code"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>{lang === 'bn' ? 'কিউআর' : 'QR'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRevokeSharableLink}
                        className="py-1.5 px-2.5 bg-slate-900 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-slate-700/80 hover:border-red-500/40 rounded-xl text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                        title={lang === 'bn' ? 'লিংক বাতিল করুন' : 'Revoke link'}
                      >
                        <X className="w-3 h-3" />
                        <span>{lang === 'bn' ? 'বাতিল' : 'Revoke'}</span>
                      </button>
                    </div>

                    {/* QR Code expansion */}
                    {showQr && qrDataUrl && (
                      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 animate-in fade-in">
                        <div className="p-2 bg-white rounded-xl shadow-md">
                          <img src={qrDataUrl} alt="Sharable QR Code" className="w-28 h-28 rounded-md" />
                        </div>
                        <p className="text-[10px] text-slate-400 text-center">
                          {lang === 'bn' ? 'যেকোনো মোবাইল ক্যামেরা দিয়ে স্ক্যান করে সরাসরি ফাইলটি দেখুন' : 'Scan with mobile camera to access file directly'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Folder Color Label Selection */}
            {selectedFile.isFolder && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-cyan-400" />
                    {lang === 'bn' ? 'ফোল্ডার কালার লেবেল' : 'Folder Color Label'}
                  </span>
                  {selectedFile.colorLabel && onSetFolderColor && (
                    <button
                      type="button"
                      onClick={() => onSetFolderColor(selectedFile.id, undefined)}
                      className="text-[10px] text-slate-400 hover:text-red-400 transition cursor-pointer"
                    >
                      {lang === 'bn' ? 'ডিফল্ট কালার' : 'Reset Color'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5 p-2 bg-slate-900/70 border border-slate-800/80 rounded-xl">
                  {FOLDER_COLOR_PRESETS.map(preset => {
                    const isSelected = selectedFile.colorLabel === preset.id || selectedFile.colorLabel === preset.hex;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onSetFolderColor?.(selectedFile.id, preset.id)}
                        className={`group relative p-1 rounded-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                          isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-950' : ''
                        }`}
                        title={lang === 'bn' ? preset.nameBn : preset.nameEn}
                      >
                        <span
                          className="w-6 h-6 rounded-md shadow-md flex items-center justify-center border border-white/20 transition"
                          style={{ backgroundColor: preset.hex }}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow stroke-[3]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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

                {(selectedFile.inTrash || selectedFile.deletedAt) && (
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/60 space-y-1">
                    <span className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                      <Trash2 className="w-3 h-3 text-red-400" />
                      {lang === 'bn' ? 'রিসাইকেল বিনে পাঠানোর সময় (Deleted Date):' : 'Moved to Recycle Bin At:'}
                    </span>
                    <p className="font-semibold text-red-200 text-xs">
                      {formatDate(selectedFile.deletedAt || selectedFile.updatedAt)}
                    </p>
                    <p className="text-[10px] text-red-400 font-medium">
                      {getRelativeTime(selectedFile.deletedAt || selectedFile.updatedAt)}
                    </p>
                  </div>
                )}

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
    </>
  );
};
