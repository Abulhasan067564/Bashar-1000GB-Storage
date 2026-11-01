/**
 * Safely converts an ArrayBuffer to a Base64 data URL without stack overflow
 */
export function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  try {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const CHUNK_SIZE = 0x8000; // 32KB chunks
    for (let i = 0; i < len; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);
    return `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
  } catch (e) {
    console.warn('Failed to convert ArrayBuffer to Base64:', e);
    return '';
  }
}

/**
 * Safely reads a File or Blob as a Data URL with multi-stage fallback.
 * Prevents "The requested file could not be read, typically due to permission problems
 * that have occurred after a reference to a file was acquired" errors from crashing the app.
 */
export async function safeReadFileAsDataUrl(file: File | Blob): Promise<string> {
  if (!file) return '';

  // Stage 1: Standard FileReader
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            resolve('');
          }
        };
        reader.onerror = () => {
          // Do not throw unhandled exception, reject gracefully to trigger fallback
          reject(reader.error || new Error('FileReader error'));
        };
        reader.onabort = () => {
          reject(new Error('FileReader aborted'));
        };
        reader.readAsDataURL(file);
      } catch (syncErr) {
        reject(syncErr);
      }
    });

    if (dataUrl && dataUrl.length > 0) {
      return dataUrl;
    }
  } catch (err: any) {
    console.warn('FileReader encountered issue, falling back to arrayBuffer:', err?.message || err);
  }

  // Stage 2: Direct file.arrayBuffer() fallback
  try {
    if (typeof file.arrayBuffer === 'function') {
      const buffer = await file.arrayBuffer();
      const mime = file.type || 'application/octet-stream';
      const dataUrl = arrayBufferToDataUrl(buffer, mime);
      if (dataUrl && dataUrl.length > 0) {
        return dataUrl;
      }
    }
  } catch (bufferErr: any) {
    console.warn('arrayBuffer read encountered issue, falling back to createObjectURL:', bufferErr?.message || bufferErr);
  }

  // Stage 3: URL.createObjectURL fallback
  try {
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const objUrl = URL.createObjectURL(file);
      if (objUrl) return objUrl;
    }
  } catch (urlErr) {
    console.warn('createObjectURL fallback failed:', urlErr);
  }

  // Stage 4: Graceful safe fallback if file permission was lost on OS level
  return '';
}

/**
 * Converts a data URL to a temporary Blob URL for native OS drag-out downloads
 */
export function dataUrlToBlobUrl(dataUrl: string, defaultMime = 'application/octet-stream'): string {
  try {
    if (dataUrl.startsWith('blob:')) return dataUrl;
    if (!dataUrl.startsWith('data:')) return dataUrl;

    const parts = dataUrl.split(',');
    const byteString = atob(parts[1]);
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : defaultMime;
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return dataUrl;
  }
}

/**
 * Configures the HTML5 Drag and Drop dataTransfer payload so dragging a file
 * from the web app directly to the computer desktop or a local file folder
 * triggers an immediate file download by the operating system/browser.
 */
export function setupDesktopDragDownload(
  e: React.DragEvent,
  file: {
    id: string;
    name: string;
    size: number;
    type?: string;
    dataUrl?: string;
    isFolder?: boolean;
    inTrash?: boolean;
  }
): void {
  // 1. Internal application drag data (for moving into folders or batch operations)
  e.dataTransfer.setData('text/plain', file.id);
  e.dataTransfer.effectAllowed = 'copyMove';

  if (file.isFolder || file.inTrash) return;

  try {
    const mime = file.type || 'application/octet-stream';
    const fileName = file.name || 'download';

    let downloadUrl = '';
    if (file.dataUrl) {
      downloadUrl = dataUrlToBlobUrl(file.dataUrl, mime);
    } else {
      // Direct server or fallback link if available
      downloadUrl = `${window.location.origin}/api/download/${encodeURIComponent(file.id)}?name=${encodeURIComponent(fileName)}`;
    }

    if (downloadUrl) {
      // Chromium HTML5 Drag-Out specification: DownloadURL = "mimeType:fileName:downloadUrl"
      e.dataTransfer.setData('DownloadURL', `${mime}:${fileName}:${downloadUrl}`);
      // URI-List for standard file drop targets
      e.dataTransfer.setData('text/uri-list', downloadUrl);
    }
  } catch (err) {
    console.warn('HTML5 drag-out desktop download initialization warning:', err);
  }
}
