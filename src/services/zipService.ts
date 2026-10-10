import JSZip from 'jszip';
import { StorageFile } from '../types/storage';

/**
 * Downloads a single file directly to user device
 */
export function downloadSingleFile(file: StorageFile): void {
  const link = document.createElement('a');
  link.download = file.name;
  
  if (file.dataUrl) {
    link.href = file.dataUrl;
  } else {
    // Generate placeholder blob if no raw data
    const blob = new Blob([`Bashar 1000GB File Content: ${file.name}\nSize: ${file.size} bytes\nUploaded: ${file.uploadedAt}`], { type: file.type || 'text/plain' });
    link.href = URL.createObjectURL(blob);
  }
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Packs multiple files into a single ZIP archive and triggers automatic download
 */
export async function downloadFilesAsZip(
  files: StorageFile[],
  zipName: string = 'Bashar-1000GB-Archive.zip',
  onProgress?: (percent: number, currentFileName: string) => void
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('Bashar_1000GB_Files');

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(Math.round(((i + 1) / files.length) * 100), file.name);
    }

    if (file.dataUrl && file.dataUrl.startsWith('data:')) {
      // Parse data URL
      const parts = file.dataUrl.split(',');
      const meta = parts[0];
      const data = parts[1];
      const isBase64 = meta.includes(';base64');

      if (isBase64) {
        folder?.file(file.name, data, { base64: true });
      } else {
        folder?.file(file.name, decodeURIComponent(data));
      }
    } else {
      folder?.file(
        file.name,
        `Bashar 1000GB Cloud Storage File\nFile: ${file.name}\nSize: ${file.size} bytes\nCategory: ${file.category}\nDate: ${file.uploadedAt}`
      );
    }
  }

  // Generate zip file
  const blob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) {
      onProgress(metadata.percent, 'Zipping files...');
    }
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
