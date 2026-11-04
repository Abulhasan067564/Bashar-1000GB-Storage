import QRCode from 'qrcode';
import { StorageFile, UserAccount, FileCategory } from '../types/storage';

export type ScannedPayloadType = 'auth_pair' | 'shared_file' | 'direct_url' | 'text';

export interface ScannedResult {
  raw: string;
  type: ScannedPayloadType;
  title: string;
  description?: string;
  data?: any;
}

// Determine file category from extension and mime type
export function detectCategory(fileName: string, mimeType: string): FileCategory {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
  if (mimeType.startsWith('video/') || ['mp4', 'webm', 'mkv', 'mov', 'avi', 'flv', 'wmv'].includes(ext)) return 'video';
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('officedocument') || ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp'].includes(ext)) return 'code';
  return 'other';
}

// Parse scanned QR code content into recognizable actions
export function parseScannedPayload(raw: string): ScannedResult {
  const trimmed = raw.trim();

  // 1. Try parsing JSON for account connect / pairing payload
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === 'bashar_connect' || parsed.type === 'auth_pair' || (parsed.userId && (parsed.email || parsed.phone))) {
        return {
          raw: trimmed,
          type: 'auth_pair',
          title: parsed.name ? `${parsed.name} এর অ্যাকাউন্ট কানেক্ট` : 'অ্যাকাউন্ট পেয়ারিং ও কানেক্ট',
          description: parsed.email || parsed.phone || parsed.userEmailOrPhone || 'ডিভাইস লিংক',
          data: parsed
        };
      }
      if (parsed.type === 'shared_file' && parsed.fileId) {
        return {
          raw: trimmed,
          type: 'shared_file',
          title: parsed.fileName || 'শেয়ার করা ফাইল',
          description: `সাইজ: ${parsed.fileSize || 'অজানা'} • আইডি: ${parsed.fileId}`,
          data: parsed
        };
      }
    } catch {
      // not valid JSON, proceed to URL check
    }
  }

  // 2. Check for URL
  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.toLowerCase();
    const searchParams = url.searchParams;

    // A. Check if it's an account pairing URL
    if (searchParams.get('action') === 'pair' || searchParams.get('pairToken') || pathname.includes('/pair')) {
      return {
        raw: trimmed,
        type: 'auth_pair',
        title: 'রিমোট অ্যাকাউন্ট কানেক্ট লিঙ্ক',
        description: url.host,
        data: {
          token: searchParams.get('token') || searchParams.get('pairToken'),
          userId: searchParams.get('userId'),
          email: searchParams.get('email'),
          phone: searchParams.get('phone')
        }
      };
    }

    // B. Check if it's a shared file URL on this drive
    if (pathname.includes('/share/') || searchParams.has('sharedFile') || searchParams.has('shareId')) {
      const shareId = pathname.includes('/share/') 
        ? pathname.split('/share/')[1]?.split('/')[0] 
        : (searchParams.get('shareId') || searchParams.get('sharedFile') || '');

      return {
        raw: trimmed,
        type: 'shared_file',
        title: 'শেয়ার করা ফাইল লিংক',
        description: `Share ID: ${shareId || 'লিংক'}`,
        data: { shareId, url: trimmed }
      };
    }

    // C. Check if it's a direct URL to a file (media, document, etc.)
    const fileExt = pathname.split('.').pop() || '';
    const knownExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'mp4', 'mp3', 'pdf', 'txt', 'zip', 'json', 'csv', 'doc', 'docx'];
    if (knownExts.includes(fileExt)) {
      const fileName = decodeURIComponent(pathname.split('/').pop() || 'downloaded-file');
      return {
        raw: trimmed,
        type: 'direct_url',
        title: fileName,
        description: `অনলাইন ফাইল লিংক (${url.hostname})`,
        data: { url: trimmed, fileName }
      };
    }

    // D. Generic web URL
    return {
      raw: trimmed,
      type: 'direct_url',
      title: url.hostname,
      description: trimmed,
      data: { url: trimmed }
    };
  } catch {
    // 3. Fallback: Plain text / Code / Note
    return {
      raw: trimmed,
      type: 'text',
      title: 'টেক্সট / ডেটা',
      description: trimmed.length > 60 ? trimmed.substring(0, 60) + '...' : trimmed,
      data: { text: trimmed }
    };
  }
}

// Generate device pairing QR payload string
export function generatePairingPayload(user: UserAccount): string {
  const payload = {
    type: 'bashar_connect',
    version: '1.0',
    userId: user.id,
    name: user.name,
    email: user.email || '',
    phone: user.phone || '',
    emailOrPhone: user.emailOrPhone,
    secretName: user.secretName || '',
    role: user.role || 'user',
    totalStorageBytes: user.totalStorageBytes || 1000 * 1024 * 1024 * 1024,
    timestamp: Date.now()
  };
  return JSON.stringify(payload);
}

// Generate crisp QR code data URL (PNG)
export async function generateQRCode(text: string, size = 300): Promise<string> {
  return await QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: {
      dark: '#030712',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  });
}

// Import remote file from URL and turn into a StorageFile
export async function downloadRemoteFile(
  url: string,
  targetFolderId: string | null,
  ownerId: string,
  ownerPhone?: string,
  ownerEmail?: string
): Promise<StorageFile> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ফাইল ডাউনলোড ব্যর্থ হয়েছে (HTTP ${response.status})`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || 'application/octet-stream';

  // Extract name from URL
  const urlObj = new URL(url);
  let fileName = decodeURIComponent(urlObj.pathname.split('/').pop() || 'remote_file');
  if (!fileName.includes('.')) {
    const ext = mimeType.split('/')[1]?.split('+')[0] || 'bin';
    fileName = `${fileName}.${ext}`;
  }

  // Convert blob to base64 dataUrl
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const now = new Date().toISOString();
  const newFile: StorageFile = {
    id: 'f_qr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    name: fileName,
    size: blob.size,
    type: mimeType,
    category: detectCategory(fileName, mimeType),
    dataUrl: dataUrl,
    uploadedAt: now,
    updatedAt: now,
    isStarred: false,
    isEncrypted: false,
    inTrash: false,
    ownerId: ownerId,
    ownerPhone: ownerPhone,
    ownerEmail: ownerEmail,
    ownerEmailOrPhone: ownerPhone || ownerEmail || ownerId,
    folderId: targetFolderId || null
  };

  return newFile;
}
