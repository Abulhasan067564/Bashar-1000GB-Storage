/**
 * Client-side File Compression Utility
 * Helps users effectively save their 1000GB quota by compressing images and media
 * before uploading to Bashar Cloud Storage.
 */

export interface CompressionOptions {
  enabled: boolean;
  level: 'balanced' | 'maximum' | 'original';
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
}

export interface CompressionResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercentage: number;
  isCompressed: boolean;
}

/**
 * Get recommended compression parameters based on chosen level
 */
export function getCompressionPreset(level: 'balanced' | 'maximum' | 'original'): {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  mimeType: string;
} {
  switch (level) {
    case 'maximum':
      return {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.65,
        mimeType: 'image/jpeg'
      };
    case 'balanced':
    default:
      return {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.82,
        mimeType: 'image/jpeg'
      };
  }
}

/**
 * Compress an image file using browser HTML5 Canvas
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = { enabled: true, level: 'balanced' }
): Promise<CompressionResult> {
  const originalSize = file.size;

  if (!options.enabled || options.level === 'original' || !file.type.startsWith('image/')) {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      file,
      dataUrl,
      originalSize,
      compressedSize: originalSize,
      savedBytes: 0,
      savedPercentage: 0,
      isCompressed: false
    };
  }

  // Animated GIFs or SVG are usually best kept as original to prevent animation loss
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      file,
      dataUrl,
      originalSize,
      compressedSize: originalSize,
      savedBytes: 0,
      savedPercentage: 0,
      isCompressed: false
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const preset = getCompressionPreset(options.level);
          const maxW = options.maxWidth || preset.maxWidth;
          const maxH = options.maxHeight || preset.maxHeight;
          const quality = options.quality !== undefined ? options.quality : preset.quality;

          let width = img.width;
          let height = img.height;

          // Maintain aspect ratio while downscaling if larger than max dimensions
          if (width > maxW || height > maxH) {
            if (width / height > maxW / maxH) {
              height = Math.round((height * maxW) / width);
              width = maxW;
            } else {
              width = Math.round((width * maxH) / height);
              height = maxH;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to uncompressed if canvas context fails
            const fallbackDataUrl = (e.target?.result as string) || '';
            resolve({
              file,
              dataUrl: fallbackDataUrl,
              originalSize,
              compressedSize: originalSize,
              savedBytes: 0,
              savedPercentage: 0,
              isCompressed: false
            });
            return;
          }

          // Smooth high-quality scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fill white background for transparent PNGs converted to JPEG
          if (file.type === 'image/png' || file.type.includes('png')) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Use WebP if supported, otherwise JPEG
          const outputMime = 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(outputMime, quality);

          // Calculate size from base64 string
          const base64Data = compressedDataUrl.split(',')[1] || '';
          const compressedSizeBytes = Math.round((base64Data.length * 3) / 4);

          // Only keep compressed version if it actually reduced the size
          if (compressedSizeBytes < originalSize) {
            const savedBytes = originalSize - compressedSizeBytes;
            const savedPercentage = Math.round((savedBytes / originalSize) * 100);

            // Create a new compressed File object
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const compressedBlob = new Blob([byteArray], { type: outputMime });
            const compressedFile = new File([compressedBlob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: outputMime,
              lastModified: Date.now()
            });

            resolve({
              file: compressedFile,
              dataUrl: compressedDataUrl,
              originalSize,
              compressedSize: compressedSizeBytes,
              savedBytes,
              savedPercentage,
              isCompressed: true
            });
          } else {
            // Original was already lighter
            const rawDataUrl = (e.target?.result as string) || '';
            resolve({
              file,
              dataUrl: rawDataUrl,
              originalSize,
              compressedSize: originalSize,
              savedBytes: 0,
              savedPercentage: 0,
              isCompressed: false
            });
          }
        } catch (err) {
          console.warn('Canvas compression fallback:', err);
          const rawDataUrl = (e.target?.result as string) || '';
          resolve({
            file,
            dataUrl: rawDataUrl,
            originalSize,
            compressedSize: originalSize,
            savedBytes: 0,
            savedPercentage: 0,
            isCompressed: false
          });
        }
      };

      img.onerror = () => {
        const rawDataUrl = (e.target?.result as string) || '';
        resolve({
          file,
          dataUrl: rawDataUrl,
          originalSize,
          compressedSize: originalSize,
          savedBytes: 0,
          savedPercentage: 0,
          isCompressed: false
        });
      };

      img.src = (e.target?.result as string) || '';
    };

    reader.onerror = () => {
      resolve({
        file,
        dataUrl: '',
        originalSize,
        compressedSize: originalSize,
        savedBytes: 0,
        savedPercentage: 0,
        isCompressed: false
      });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Helper to read raw File as DataURL
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes nicely
 */
export function formatCompressionBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
