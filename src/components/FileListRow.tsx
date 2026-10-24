import React, { useState } from 'react';
import { StorageFile } from '../types/storage';
import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive, 
  Code2, 
  File, 
  Star, 
  Share2, 
  Download, 
  Trash2, 
  Lock, 
  Eye, 
  CheckCircle2, 
  Circle,
  ArchiveRestore,
  Folder,
  Move,
  Copy,
  Info
} from 'lucide-react';

interface FileListRowProps {
  file: StorageFile;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onPreview: (file: StorageFile) => void;
  onDownload: (file: StorageFile) => void;
  onShare: (file: StorageFile) => void;
  onDelete: (file: StorageFile) => void;
  onToggleStar: (file: StorageFile) => void;
  onViewDetails?: (file: StorageFile) => void;
  onRestore?: (file: StorageFile) => void;
  onOpenFolder?: (folder: StorageFile) => void;
  onQuickMove?: (file: StorageFile) => void;
  onQuickCopy?: (file: StorageFile) => void;
  onDropIntoFolder?: (draggedFileId: string, targetFolderId: string) => void;
  isTrash?: boolean;
  lang: 'bn' | 'en';
}

export const FileListRow: React.FC<FileListRowProps> = ({
  file,
  isSelected,
  onToggleSelect,
  onPreview,
  onDownload,
  onShare,
  onDelete,
  onToggleStar,
  onViewDetails,
  onRestore,
  onOpenFolder,
  onQuickMove,
  onQuickCopy,
  onDropIntoFolder,
  isTrash = false,
  lang
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const isFolder = Boolean(file.isFolder);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return isFolder ? (lang === 'bn' ? 'ফোল্ডার' : 'Folder') : '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryIcon = () => {
    if (isFolder) {
      return <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />;
    }
    switch (file.category) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-purple-400" />;
      case 'video':
        return <Video className="w-4 h-4 text-rose-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-amber-400" />;
      case 'document':
        return <FileText className="w-4 h-4 text-sky-400" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-emerald-400" />;
      case 'code':
        return <Code2 className="w-4 h-4 text-teal-400" />;
      default:
        return <File className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleClickRow = () => {
    if (isFolder) {
      if (onOpenFolder) onOpenFolder(file);
    } else {
      onPreview(file);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', file.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isFolder && !isTrash) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isFolder && !isTrash) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId && draggedId !== file.id && onDropIntoFolder) {
        onDropIntoFolder(draggedId, file.id);
      }
    }
  };

  return (
    <tr
      onClick={handleClickRow}
      draggable={!isFolder && !isTrash}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group border-b border-slate-800/80 hover:bg-slate-800/60 cursor-pointer transition ${
        isSelected
          ? 'bg-cyan-950/20'
          : isDragOver
            ? 'bg-amber-950/40 ring-1 ring-amber-400'
            : isFolder
              ? 'bg-slate-900/40'
              : ''
      }`}
    >
      {/* Select */}
      <td className="py-3 px-4 w-10" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onToggleSelect(file.id)}
          className="text-slate-400 hover:text-white"
        >
          {isSelected ? (
            <CheckCircle2 className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
          ) : (
            <Circle className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
          )}
        </button>
      </td>

      {/* Name & Icon */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border shrink-0 ${isFolder ? 'bg-amber-950/30 border-amber-500/30' : 'bg-slate-950 border-slate-800'}`}>
            {getCategoryIcon()}
          </div>
          <div className="truncate max-w-xs sm:max-w-md">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold truncate ${isFolder ? 'text-amber-200 font-bold' : 'text-slate-200'}`}>
                {file.name}
              </span>
              {isFolder && (
                <span className="text-amber-400 text-[10px] font-bold font-mono uppercase">
                  {lang === 'bn' ? 'ফোল্ডার' : 'Folder'}
                </span>
              )}
              {file.isEncrypted && (
                <span title="Encrypted Vault">
                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                </span>
              )}
              {file.shared?.isShared && (
                <span title="Shared">
                  <Share2 className="w-3 h-3 text-blue-400 shrink-0" />
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 uppercase font-mono">
              {isFolder ? (lang === 'bn' ? 'ডিরেক্টরি' : 'DIRECTORY') : file.category}
            </span>
          </div>
        </div>
      </td>

      {/* Size */}
      <td className="py-3 px-4 text-xs text-slate-400 font-mono">
        {formatBytes(file.size)}
      </td>

      {/* Upload Date */}
      <td className="py-3 px-4 text-xs text-slate-400 hidden md:table-cell">
        {new Date(file.uploadedAt).toLocaleDateString()}
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {!isTrash ? (
            <>
              {/* Move */}
              {onQuickMove && (
                <button
                  type="button"
                  onClick={() => onQuickMove(file)}
                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                  title={lang === 'bn' ? 'মুভ করুন' : 'Move to folder'}
                >
                  <Move className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Copy */}
              {onQuickCopy && (
                <button
                  type="button"
                  onClick={() => onQuickCopy(file)}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
                  title={lang === 'bn' ? 'কপি করুন' : 'Copy'}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}

              {!isFolder && (
                <>
                  <button
                    type="button"
                    onClick={() => onToggleStar(file)}
                    className={`p-1.5 rounded-lg transition ${file.isStarred ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
                    title="Star"
                  >
                    <Star className={`w-3.5 h-3.5 ${file.isStarred ? 'fill-amber-400' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onPreview(file)}
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
                    title="Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onShare(file)}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                    title="Share"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload(file)}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {onViewDetails && (
                <button
                  type="button"
                  onClick={() => onViewDetails(file)}
                  className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
                  title={lang === 'bn' ? 'মেটাডাটা ও ফাইল বিবরণ' : 'Details & Metadata'}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onDelete(file)}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                title={lang === 'bn' ? 'রিসাইকেল বিনে পাঠান' : 'Move to Recycle Bin'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              {onRestore && (
                <button
                  type="button"
                  onClick={() => onRestore(file)}
                  className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-lg transition"
                  title={lang === 'bn' ? 'রিস্টোর করুন' : 'Restore'}
                >
                  <ArchiveRestore className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(file)}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition"
                title={lang === 'bn' ? 'সারা জীবনের জন্য ডিলিট (স্থায়ীভাবে)' : 'Delete permanently forever'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};
