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

export type ViewMode = 'grid' | 'list';
export type ActiveTab = 'all' | 'starred' | 'shared' | 'vault' | 'trash';
