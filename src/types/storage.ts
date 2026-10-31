export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'other';

export interface StorageFile {
  id: string;
  name: string;
  size: number; // in bytes
  type: string; // mime type
  category: FileCategory;
  dataUrl?: string; // Base64 or Blob URL for local viewing/downloading
  uploadedAt: string;
  updatedAt: string;
  isStarred: boolean;
  isEncrypted: boolean;
  encryptionHint?: string;
  inTrash: boolean;
  deletedAt?: string;
  shared?: {
    isShared: boolean;
    shareId?: string;
    requiresPassword?: boolean;
    passwordHash?: string;
    expiresAt?: string;
    views?: number;
    downloads?: number;
    allowDownload?: boolean;
  };
  tags?: string[];
  ownerId: string;
  ownerPhone?: string;
  folderId?: string | null; // ID of parent folder if inside one, null/undefined if root
  isFolder?: boolean; // true if this item is a folder
  colorLabel?: string; // Color label identifier or hex for folders/files
}

export interface FolderColorOption {
  id: string;
  nameBn: string;
  nameEn: string;
  hex: string;
  bgLight: string;
  bgHover: string;
  borderClass: string;
  textClass: string;
  glowClass: string;
  accentClass: string;
}

export const FOLDER_COLOR_PRESETS: FolderColorOption[] = [
  { id: 'blue', nameBn: 'ক্লাসিক নীল', nameEn: 'Classic Blue', hex: '#3b82f6', bgLight: 'bg-blue-500/15', bgHover: 'hover:bg-blue-500/25', borderClass: 'border-blue-500/40', textClass: 'text-blue-400', glowClass: 'shadow-blue-500/25', accentClass: 'bg-blue-500' },
  { id: 'cyan', nameBn: 'সায়ান গ্লো', nameEn: 'Cyber Cyan', hex: '#06b6d4', bgLight: 'bg-cyan-500/15', bgHover: 'hover:bg-cyan-500/25', borderClass: 'border-cyan-500/40', textClass: 'text-cyan-400', glowClass: 'shadow-cyan-500/25', accentClass: 'bg-cyan-500' },
  { id: 'emerald', nameBn: 'পান্না সবুজ', nameEn: 'Emerald Green', hex: '#10b981', bgLight: 'bg-emerald-500/15', bgHover: 'hover:bg-emerald-500/25', borderClass: 'border-emerald-500/40', textClass: 'text-emerald-400', glowClass: 'shadow-emerald-500/25', accentClass: 'bg-emerald-500' },
  { id: 'amber', nameBn: 'সোনালী অ্যাম্বার', nameEn: 'Golden Amber', hex: '#f59e0b', bgLight: 'bg-amber-500/15', bgHover: 'hover:bg-amber-500/25', borderClass: 'border-amber-500/40', textClass: 'text-amber-400', glowClass: 'shadow-amber-500/25', accentClass: 'bg-amber-500' },
  { id: 'rose', nameBn: 'রুবি লাল', nameEn: 'Ruby Rose', hex: '#f43f5e', bgLight: 'bg-rose-500/15', bgHover: 'hover:bg-rose-500/25', borderClass: 'border-rose-500/40', textClass: 'text-rose-400', glowClass: 'shadow-rose-500/25', accentClass: 'bg-rose-500' },
  { id: 'purple', nameBn: 'বেগুনী নেবুলা', nameEn: 'Purple Nebula', hex: '#a855f7', bgLight: 'bg-purple-500/15', bgHover: 'hover:bg-purple-500/25', borderClass: 'border-purple-500/40', textClass: 'text-purple-400', glowClass: 'shadow-purple-500/25', accentClass: 'bg-purple-500' },
  { id: 'orange', nameBn: 'উজ্জ্বল কমলা', nameEn: 'Vibrant Orange', hex: '#f97316', bgLight: 'bg-orange-500/15', bgHover: 'hover:bg-orange-500/25', borderClass: 'border-orange-500/40', textClass: 'text-orange-400', glowClass: 'shadow-orange-500/25', accentClass: 'bg-orange-500' },
  { id: 'indigo', nameBn: 'গাঢ় ইন্ডিগো', nameEn: 'Deep Indigo', hex: '#6366f1', bgLight: 'bg-indigo-500/15', bgHover: 'hover:bg-indigo-500/25', borderClass: 'border-indigo-500/40', textClass: 'text-indigo-400', glowClass: 'shadow-indigo-500/25', accentClass: 'bg-indigo-500' },
  { id: 'teal', nameBn: 'টিল গ্রিন', nameEn: 'Deep Teal', hex: '#14b8a6', bgLight: 'bg-teal-500/15', bgHover: 'hover:bg-teal-500/25', borderClass: 'border-teal-500/40', textClass: 'text-teal-400', glowClass: 'shadow-teal-500/25', accentClass: 'bg-teal-500' },
  { id: 'pink', nameBn: 'হট পিংক', nameEn: 'Hot Pink', hex: '#ec4899', bgLight: 'bg-pink-500/15', bgHover: 'hover:bg-pink-500/25', borderClass: 'border-pink-500/40', textClass: 'text-pink-400', glowClass: 'shadow-pink-500/25', accentClass: 'bg-pink-500' }
];

export function getFolderColorStyle(colorId?: string): FolderColorOption | null {
  if (!colorId) return null;
  return FOLDER_COLOR_PRESETS.find(c => c.id === colorId || c.hex.toLowerCase() === colorId.toLowerCase()) || null;
}

export interface ClipboardState {
  action: 'copy' | 'move';
  itemIds: string[];
}

export interface UserAccount {
  id: string;
  name: string;
  emailOrPhone: string;
  secretName: string; // সিক্রেট নাম - used for instant password recovery
  passwordHash: string;
  birthDate?: string; // জন্ম তারিখ
  customLogo?: string; // ইচ্ছামত লোগো / প্রোফাইল ছবি
  twoFactorEnabled?: boolean;
  totalStorageBytes: number; // Default 1,000 GB
  avatar?: string;
  createdAt: string;
  status?: 'active' | 'disabled'; // একাউন্ট সক্রিয় নাকি নিষ্ক্রিয়
  role?: 'user' | 'admin';
  lastLoginAt?: string;
  // 30-day Free Trial & Lifetime Subscription
  trialStartDate?: string; // 30-day trial start ISO timestamp (defaults to createdAt)
  isLifetimeUnlocked?: boolean; // True if paid 100 Tk or used secret promo code
  subscriptionMethod?: 'promo' | 'bkash' | 'nagad' | 'admin';
  subscriptionTrxId?: string;
  subscriptionDate?: string;
  // Admin review & approval for manual TrxID submission
  subscriptionRequestStatus?: 'pending' | 'approved' | 'rejected';
  pendingTrxId?: string;
  pendingSenderPhone?: string;
  pendingMethod?: 'bkash' | 'nagad';
  pendingDate?: string;
  adminNote?: string;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userEmailOrPhone: string;
  senderPhone: string; // প্রেরক ফোন নাম্বার (01XXXXXXXXX)
  trxId: string; // ট্রানজেকশন আইডি (TrxID)
  method: 'bkash' | 'nagad';
  amount: number; // 100
  recipientNumber: string; // 01734211584
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNote?: string;
}

export interface AdminCredentials {
  username: string;
  passwordHash: string;
  updatedAt?: string;
}

export interface StorageStats {
  totalBytes: number; // 1,000 GB = 1,073,741,824,000 bytes
  usedBytes: number;
  freeBytes: number;
  fileCount: number;
  categoryBreakdown: Record<FileCategory, number>;
}

export interface SiteSettings {
  siteName: string; // e.g. "Bashar"
  siteBadge: string; // e.g. "1000GB"
  siteLogoUrl?: string; // Custom logo image URL / base64 uploaded by admin
  taglineBn: string; // e.g. "১ টেরাবাইট হাই-স্পিড ক্লাউড ভল্ট"
  taglineEn: string; // e.g. "1 TB Ultra-Fast Cloud Vault"
  youtubeChannelUrl: string; // e.g. "http://www.youtube.com/@BasharGojolStudio"
  youtubeChannelName: string; // e.g. "Bashar Gojol Studio"
  youtubeBannerTextBn: string; // e.g. "❤️ কষ্ট করে আমাদের চ্যানেলটি সাবস্ক্রাইব করে সহযোগিতা করুন। 🌸"
  showYoutubeBanner: boolean;
  announcementNotice?: string; // Optional global top notice banner
  noticeType?: 'info' | 'warning' | 'alert' | 'success';
  storageQuotaGb: number; // e.g. 1000
  footerCopyright?: string; // e.g. "© 2026 Bashar 1000GB Cloud Storage"
  contactSupport?: string; // Support WhatsApp / Telegram or Email link
  allowRegistrations?: boolean; // Enable or disable new user signups
  themeColor?: 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose';
  // Payment info for 100 Taka lifetime subscription
  bkashNumber?: string;
  nagadNumber?: string;
  subscriptionFee?: number;
  updatedAt?: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'Bashar',
  siteBadge: '1000GB',
  siteLogoUrl: '/src/assets/images/bashar_cloud_logo_1792845246258.jpg',
  taglineBn: '১ টেরাবাইট হাই-স্পিড ক্লাউড ভল্ট • অনলাইন ডাটাবেস',
  taglineEn: '1 TB Ultra-Fast Cloud Vault • Firestore Connected',
  youtubeChannelUrl: 'http://www.youtube.com/@BasharGojolStudio',
  youtubeChannelName: 'Bashar Gojol Studio',
  youtubeBannerTextBn: '❤️ কষ্ট করে আমাদের চ্যানেলটি সাবস্ক্রাইব করে সহযোগিতা করুন। 🌸',
  showYoutubeBanner: true,
  announcementNotice: '',
  noticeType: 'info',
  storageQuotaGb: 1000,
  footerCopyright: '© 2026 Bashar 1000GB Cloud Storage. সর্বস্বত্ব সংরক্ষিত।',
  contactSupport: '',
  allowRegistrations: true,
  themeColor: 'cyan',
  bkashNumber: '01734211584', // Personal bKash Send Money
  nagadNumber: '01734211584', // Personal Nagad Send Money
  subscriptionFee: 100
};

export type ViewMode = 'grid' | 'list';
export type ActiveTab = 'all' | 'starred' | 'shared' | 'vault' | 'trash';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
  isFallback?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}
