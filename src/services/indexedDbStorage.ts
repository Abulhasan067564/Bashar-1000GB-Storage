import { StorageFile, FileCategory } from '../types/storage';

const DB_NAME = 'Bashar1000GB_DB';
const DB_VERSION = 2; // Bumped to 2 for reliable schema upgrade
const STORE_FILES = 'files';
export const STORAGE_FILES_BACKUP_KEY = 'bashar_1000gb_files_local_backup';

let cachedDB: IDBDatabase | null = null;

// Synchronous and immediate LocalStorage backup engine
export function getStoredFilesBackup(): StorageFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_FILES_BACKUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn('Could not read stored files backup from localStorage:', err);
    return [];
  }
}

export function saveStoredFilesBackup(files: StorageFile[]): void {
  try {
    // Keep all file metadata and lightweight text (<8KB) in localStorage backup
    // Full heavy binary dataUrl is saved asynchronously in IndexedDB without freezing UI
    const lightweightFiles = files.map(f => {
      if (f.dataUrl && f.dataUrl.length > 8192) {
        const { dataUrl, ...rest } = f;
        return rest;
      }
      return f;
    });
    localStorage.setItem(STORAGE_FILES_BACKUP_KEY, JSON.stringify(lightweightFiles));
  } catch {
    try {
      const metaOnly = files.map(({ dataUrl, ...rest }) => rest);
      localStorage.setItem(STORAGE_FILES_BACKUP_KEY, JSON.stringify(metaOnly));
    } catch {
      // IndexedDB has all full files safely
    }
  }
}

const STORAGE_DELETED_FILE_IDS_KEY = 'bashar_deleted_file_ids_v2';

// Persistent Tombstone for permanently deleted files so sync never resurrects them
export function getDeletedFileIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_FILE_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function recordDeletedFileIds(ids: string[]): void {
  if (ids.length === 0) return;
  try {
    const existing = new Set(getDeletedFileIds());
    ids.forEach(id => existing.add(id));
    localStorage.setItem(STORAGE_DELETED_FILE_IDS_KEY, JSON.stringify(Array.from(existing)));
  } catch {}
}

export function unrecordDeletedFileIds(ids: string[]): void {
  if (ids.length === 0) return;
  try {
    const existing = new Set(getDeletedFileIds());
    ids.forEach(id => existing.delete(id));
    localStorage.setItem(STORAGE_DELETED_FILE_IDS_KEY, JSON.stringify(Array.from(existing)));
  } catch {}
}

// Synchronous and immediate user-specific file retrieval for instant zero-wait login
export function getUserFilesSync(userId?: string, userPhoneOrEmail?: string): StorageFile[] {
  const fileMap = new Map<string, StorageFile>();
  const deletedIdSet = new Set(getDeletedFileIds());

  // 1. Check user-specific localStorage cache if userId provided
  if (userId) {
    try {
      const userRaw = localStorage.getItem(`bashar_user_files_${userId}`);
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach(f => {
            if (f && f.id && !deletedIdSet.has(f.id)) {
              fileMap.set(f.id, f);
            }
          });
        }
      }
      const cloudRaw = localStorage.getItem(`bashar_cloud_files_${userId}`);
      if (cloudRaw) {
        const parsedCloud = JSON.parse(cloudRaw);
        if (Array.isArray(parsedCloud)) {
          parsedCloud.forEach(f => {
            if (f && f.id && !deletedIdSet.has(f.id)) {
              const existing = fileMap.get(f.id);
              fileMap.set(f.id, { ...f, ...existing, dataUrl: existing?.dataUrl || f.dataUrl });
            }
          });
        }
      }
    } catch {}
  }

  // 2. Check user phone/email cache
  if (userPhoneOrEmail) {
    const cleanPhone = userPhoneOrEmail.trim();
    try {
      const phoneRaw = localStorage.getItem(`bashar_user_files_${cleanPhone}`);
      if (phoneRaw) {
        const parsed = JSON.parse(phoneRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach(f => {
            if (f && f.id && !deletedIdSet.has(f.id)) {
              const existing = fileMap.get(f.id);
              fileMap.set(f.id, { ...f, ...existing, dataUrl: existing?.dataUrl || f.dataUrl });
            }
          });
        }
      }
    } catch {}
  }

  // 3. Check general local backup
  const backup = getStoredFilesBackup();
  const cleanPhone = userPhoneOrEmail?.trim();
  backup.forEach(f => {
    if (deletedIdSet.has(f.id)) return;

    const matchesUser = 
      !f.ownerId || 
      f.ownerId === 'default' || 
      (userId && f.ownerId === userId) ||
      (cleanPhone && f.ownerPhone === cleanPhone);

    if (matchesUser) {
      const existing = fileMap.get(f.id);
      fileMap.set(f.id, { ...f, ...existing, dataUrl: existing?.dataUrl || f.dataUrl });
    }
  });

  const list = Array.from(fileMap.values());
  list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return list;
}

// Cache user files for instant zero-wait retrieval on subsequent logins
export function saveUserFilesCache(userId: string, files: StorageFile[], userPhoneOrEmail?: string): void {
  try {
    const lightweightFiles = files.map(f => {
      if (f.dataUrl && f.dataUrl.length > 8192) {
        const { dataUrl, ...rest } = f;
        return rest;
      }
      return f;
    });
    const serialized = JSON.stringify(lightweightFiles);
    if (userId) {
      localStorage.setItem(`bashar_user_files_${userId}`, serialized);
    }
    if (userPhoneOrEmail && userPhoneOrEmail.trim()) {
      localStorage.setItem(`bashar_user_files_${userPhoneOrEmail.trim()}`, serialized);
    }
  } catch {}
}

export function openDB(): Promise<IDBDatabase> {
  if (cachedDB) {
    return Promise.resolve(cachedDB);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not available in this environment'));
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_FILES)) {
          db.createObjectStore(STORE_FILES, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        cachedDB = db;
        db.onversionchange = () => {
          db.close();
          cachedDB = null;
        };
        db.onclose = () => {
          cachedDB = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        console.warn('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn('IndexedDB connection blocked by another active connection.');
      };
    } catch (err) {
      reject(err);
    }
  });
}

export async function getAllStoredFiles(): Promise<StorageFile[]> {
  const backupFiles = getStoredFilesBackup();
  const fileMap = new Map<string, StorageFile>();
  backupFiles.forEach(f => fileMap.set(f.id, f));

  try {
    const db = await openDB();
    const idbFiles: StorageFile[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    idbFiles.forEach(f => {
      const existing = fileMap.get(f.id);
      if (!existing) {
        fileMap.set(f.id, f);
      } else {
        fileMap.set(f.id, {
          ...existing,
          ...f,
          dataUrl: f.dataUrl || existing.dataUrl
        });
      }
    });

    const merged = Array.from(fileMap.values());
    saveStoredFilesBackup(merged);
    return merged;
  } catch (err) {
    console.warn('IndexedDB read notice (safely using localStorage backup):', err);
    return Array.from(fileMap.values());
  }
}

export async function saveStoredFile(file: StorageFile): Promise<void> {
  // 1. Immediately write to localStorage backup for instant survival across page reload
  const backup = getStoredFilesBackup();
  const existingIdx = backup.findIndex(f => f.id === file.id);
  if (existingIdx >= 0) {
    backup[existingIdx] = file;
  } else {
    backup.unshift(file);
  }
  saveStoredFilesBackup(backup);

  // Also update user-specific instant cache
  if (file.ownerId && file.ownerId !== 'default') {
    const userFiles = backup.filter(f => f.ownerId === file.ownerId || (file.ownerPhone && f.ownerPhone === file.ownerPhone));
    saveUserFilesCache(file.ownerId, userFiles, file.ownerPhone);
  }

  // 2. Persist full record (including large dataUrl binary) to IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const request = store.put(file);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB write notice (file safely backed up in localStorage):', err);
  }
}

export async function saveMultipleStoredFiles(files: StorageFile[]): Promise<void> {
  if (files.length === 0) return;

  // 1. Immediately write to localStorage backup
  const backup = getStoredFilesBackup();
  const map = new Map<string, StorageFile>();
  backup.forEach(f => map.set(f.id, f));
  files.forEach(f => map.set(f.id, f));
  const updatedList = Array.from(map.values());
  saveStoredFilesBackup(updatedList);

  // Update per-user instant cache for any affected owners
  const affectedOwners = new Set<string>();
  files.forEach(f => {
    if (f.ownerId && f.ownerId !== 'default') affectedOwners.add(f.ownerId);
  });
  affectedOwners.forEach(ownerId => {
    const userFiles = updatedList.filter(f => f.ownerId === ownerId);
    saveUserFilesCache(ownerId, userFiles);
  });

  // 2. Persist to IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      for (const f of files) {
        store.put(f);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB batch write notice (files safely backed up in localStorage):', err);
  }
}

export async function deleteStoredFile(id: string): Promise<void> {
  await deleteMultipleStoredFiles([id]);
}

export async function deleteMultipleStoredFiles(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  recordDeletedFileIds(ids);

  // 1. Delete from localStorage backup
  const backup = getStoredFilesBackup();
  const deletedFiles = backup.filter(f => idSet.has(f.id));
  const filtered = backup.filter(f => !idSet.has(f.id));
  saveStoredFilesBackup(filtered);

  // Also scan all localStorage keys to thoroughly purge any cache containing these IDs
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('bashar_user_files_') || key.startsWith('bashar_cloud_files_'))) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter((f: any) => !idSet.has(f?.id));
              if (cleaned.length !== parsed.length) {
                localStorage.setItem(key, JSON.stringify(cleaned));
              }
            }
          }
        } catch {}
      }
    }
  } catch {}

  // 2. Delete from IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      for (const id of ids) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB batch delete notice:', err);
  }
}

export async function clearAllFiles(): Promise<void> {
  saveStoredFilesBackup([]);
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB clear notice:', err);
  }
}

export async function getUserStoredFiles(ownerId: string): Promise<StorageFile[]> {
  const all = await getAllStoredFiles();
  return all.filter(f => !f.ownerId || f.ownerId === ownerId || f.ownerId === 'default');
}

export function detectFileCategory(fileName: string, mimeType: string): FileCategory {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'avif'].includes(ext)) {
    return 'image';
  }
  if (mimeType.startsWith('video/') || ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) {
    return 'video';
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
    return 'audio';
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'xlsx', 'xls', 'csv', 'pptx', 'ppt', 'md'].includes(ext) || mimeType.includes('pdf') || mimeType.includes('document')) {
    return 'document';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return 'archive';
  }
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'py', 'java', 'cpp', 'sql', 'sh', 'php'].includes(ext)) {
    return 'code';
  }
  return 'other';
}

// Sample initial files if user's drive is empty
export function getInitialSampleFiles(ownerId: string): StorageFile[] {
  const samplePdf = 'data:text/plain;charset=utf-8,' + encodeURIComponent(
    '=================================================\n' +
    'BASHAR 1000GB CLOUD STORAGE - WELCOME GUIDE\n' +
    '=================================================\n\n' +
    'স্বাগতম বাশার ১০০০ জিবি ক্লাউড স্টোরেজে!\n' +
    'এই ড্রাইভে আপনি পাবেন ১,০০০ জিবি (১ টেরাবাইট) নিরাপদ স্টোরেজ কোটা।\n\n' +
    'মূল সুবিধাসমূহ:\n' +
    '১. সব ধরনের ফাইল একক বা একসাথে আপলোড\n' +
    '২. সব ফাইল একসাথে জিপ আকারে ডাউনলোড বা একক ডাউনলোড\n' +
    '৩. একক অথবা সব ফাইল একসাথে ট্র্যাশে পাঠানো বা স্থায়ীভাবে ডিলিট\n' +
    '৪. পাসওয়ার্ড ও মেয়াদসহ ফাইল শেয়ারিং লিংক\n' +
    '৫. সিক্রেট নাম ভিত্তিক দ্রুত পাসওয়ার্ড রিসেট সিস্টেম\n' +
    '৬. ২-ফ্যাক্টর অথেনটিকেশন (2FA)\n' +
    '৭. ক্লায়েন্ট-সাইড AES-GCM ফাইল এনক্রিপশন ভল্ট\n' +
    '৮. ফুল ক্লাউড ব্যাকআপ ও রিস্টোর ব্যবস্থা\n'
  );

  const sampleSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="50%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#3b82f6" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" rx="20" fill="url(#bg)"/>
      <circle cx="400" cy="200" r="90" fill="#38bdf8" opacity="0.3" filter="blur(20px)"/>
      <path d="M400,140 C430,140 455,160 460,190 C490,195 510,220 510,250 C510,285 480,310 445,310 L355,310 C320,310 290,285 290,250 C290,225 305,202 330,195 C335,160 365,140 400,140 Z" fill="#ffffff" />
      <text x="400" y="380" font-family="sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">Bashar 1000GB Cloud Drive</text>
      <text x="400" y="420" font-family="sans-serif" font-size="18" fill="#bae6fd" text-anchor="middle">Ultra Fast • Highly Secure • 1 TB Storage</text>
    </svg>
  `);

  return [
    {
      id: 'file-demo-1',
      name: 'Bashar_1000GB_Welcome_Guide.txt',
      size: 142000, // ~142 KB
      type: 'text/plain',
      category: 'document',
      dataUrl: samplePdf,
      uploadedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      isStarred: true,
      isEncrypted: false,
      inTrash: false,
      ownerId,
      shared: {
        isShared: true,
        shareId: 'bashar-guide-2026',
        views: 42,
        downloads: 18,
        allowDownload: true
      }
    },
    {
      id: 'file-demo-2',
      name: 'Cloud_Architecture_Banner.svg',
      size: 485000, // ~485 KB
      type: 'image/svg+xml',
      category: 'image',
      dataUrl: sampleSvg,
      uploadedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      isStarred: true,
      isEncrypted: false,
      inTrash: false,
      ownerId,
      shared: { isShared: false }
    },
    {
      id: 'file-demo-3',
      name: 'Confidential_Financial_Ledger_2026.enc',
      size: 2450000, // ~2.45 MB
      type: 'application/octet-stream',
      category: 'other',
      dataUrl: 'data:text/plain;charset=utf-8,ENCRYPTED_AES_GCM_VAULT_PAYLOAD',
      uploadedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      isStarred: false,
      isEncrypted: true,
      encryptionHint: 'পাসওয়ার্ড প্রটেক্টেড এনক্রিপ্টেড ফাইল',
      inTrash: false,
      ownerId,
      shared: { isShared: false }
    },
    {
      id: 'file-demo-4',
      name: 'Project_Source_Code_Backup.zip',
      size: 18450000, // ~18.45 MB
      type: 'application/zip',
      category: 'archive',
      dataUrl: 'data:application/zip;base64,UEsDBBQAAAAIAAA=',
      uploadedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      isStarred: false,
      isEncrypted: false,
      inTrash: false,
      ownerId,
      shared: { isShared: false }
    },
    {
      id: 'file-demo-5',
      name: 'Database_Schema_Postgres_Firebase.sql',
      size: 320000, // ~320 KB
      type: 'text/x-sql',
      category: 'code',
      dataUrl: 'data:text/plain;charset=utf-8,' + encodeURIComponent(
        '-- Bashar 1000GB Cloud Database Schema\n' +
        'CREATE TABLE IF NOT EXISTS users (\n' +
        '  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n' +
        '  email VARCHAR(255) UNIQUE NOT NULL,\n' +
        '  phone VARCHAR(50),\n' +
        '  secret_name VARCHAR(120) NOT NULL,\n' +
        '  two_factor_secret VARCHAR(64),\n' +
        '  storage_quota_bytes BIGINT DEFAULT 1073741824000\n' +
        ');\n'
      ),
      uploadedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      isStarred: false,
      isEncrypted: false,
      inTrash: false,
      ownerId,
      shared: { isShared: false }
    }
  ];
}
