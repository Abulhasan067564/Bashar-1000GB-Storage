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
