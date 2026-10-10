import { StorageFile, FileCategory } from '../types/storage';

const DB_NAME = 'Bashar1000GB_DB';
const DB_VERSION = 1;
const STORE_FILES = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllStoredFiles(): Promise<StorageFile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readonly');
    const store = tx.objectStore(STORE_FILES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStoredFile(file: StorageFile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const request = store.put(file);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveMultipleStoredFiles(files: StorageFile[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    for (const f of files) {
      store.put(f);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteStoredFile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMultipleStoredFiles(ids: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllFiles(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getUserStoredFiles(ownerId: string): Promise<StorageFile[]> {
  const all = await getAllStoredFiles();
  return all.filter(f => f.ownerId === ownerId);
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
