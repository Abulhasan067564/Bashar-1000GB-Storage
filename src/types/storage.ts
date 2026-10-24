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
