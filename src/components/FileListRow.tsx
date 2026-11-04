import React, { useState } from 'react';
import { StorageFile, getFolderColorStyle } from '../types/storage';
import { setupDesktopDragDownload } from '../utils/fileReaderHelper';
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
  Info,
  Palette,
  Edit3,
  Check
} from 'lucide-react';
import { formatTimeAgo } from '../utils/timeAgo';

interface FileListRowProps {
  file: StorageFile;
  isSelected: boolean;
  selectedFileIds?: Set<string>;
  onToggleSelect: (id: string) => void;
  onPreview: (file: StorageFile) => void;
  onDownload: (file: StorageFile) => void;
  onShare: (file: StorageFile) => void;
  onDelete: (file: StorageFile) => void;
  onToggleStar: (file: StorageFile) => void;
  onViewDetails?: (file: StorageFile) => void;
  onRestore?: (file: StorageFile) => void;
  onRename?: (file: StorageFile) => void;
  onOpenFolder?: (folder: StorageFile) => void;
  onQuickMove?: (file: StorageFile) => void;
  onQuickCopy?: (file: StorageFile) => void;
  onDropIntoFolder?: (draggedFileIds: string | string[], targetFolderId: string) => void;
  onFolderContextMenu?: (folder: StorageFile, e: React.MouseEvent) => void;
  isTrash?: boolean;
  lang: 'bn' | 'en';
}

export const FileListRow: React.FC<FileListRowProps> = ({
  file,
  isSelected,
  selectedFileIds,
  onToggleSelect,
  onPreview,
  onDownload,
  onShare,
  onDelete,
  onToggleStar,
  onViewDetails,
  onRestore,
  onRename,
  onOpenFolder,
  onQuickMove,
  onQuickCopy,
  onDropIntoFolder,
  onFolderContextMenu,
  isTrash = false,
  lang
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const isFolder = Boolean(file.isFolder);
  const itemColor = getFolderColorStyle(file.colorLabel);
  const folderColor = itemColor;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return isFolder ? (lang === 'bn' ? 'ফোল্ডার' : 'Folder') : '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryIcon = () => {
    if (isFolder) {
      if (folderColor) {
        return <Folder className={`w-4 h-4 ${folderColor.textClass} fill-current/20`} />;
      }
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
    // If the file being dragged is part of the current selection, drag ALL selected files!
    const isPartOfMultiSelection = Boolean(selectedFileIds && selectedFileIds.has(file.id) && selectedFileIds.size > 1);
    const idsToDrag = isPartOfMultiSelection
      ? Array.from(selectedFileIds!)
      : [file.id];

    // 1. Pack JSON payload for batch internal move
    e.dataTransfer.setData('application/json', JSON.stringify({
      action: 'move',
      fileIds: idsToDrag,
      count: idsToDrag.length
    }));
    // 2. Text plain fallback
    e.dataTransfer.setData('text/plain', idsToDrag.join(','));
    e.dataTransfer.effectAllowed = 'copyMove';

    // 3. For desktop drag download (single file)
    if (idsToDrag.length === 1 && !file.isFolder && !file.inTrash) {
      setupDesktopDragDownload(e, file);
    }
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

      let draggedIds: string[] = [];
      const jsonStr = e.dataTransfer.getData('application/json');
      if (jsonStr) {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && Array.isArray(parsed.fileIds)) {
            draggedIds = parsed.fileIds;
          }
        } catch {}
      }
      if (draggedIds.length === 0) {
        const textData = e.dataTransfer.getData('text/plain');
        if (textData) {
          draggedIds = textData.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      // Filter out target folder itself from moving into itself
      const validIds = draggedIds.filter(id => id !== file.id);
      if (validIds.length > 0 && onDropIntoFolder) {
        onDropIntoFolder(validIds, file.id);
      }
    }
  };

  return (
    <tr
      onClick={handleClickRow}
      onContextMenu={(e) => {
        if (isFolder && !isTrash) {
          e.preventDefault();
          e.stopPropagation();
          onFolderContextMenu?.(file, e);
        }
      }}
      draggable={!isFolder && !isTrash}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group border-b border-slate-800/80 hover:bg-slate-800/60 cursor-pointer transition ${
        isSelected
          ? 'bg-cyan-950/30'
          : isDragOver
            ? 'bg-amber-950/40 ring-2 ring-amber-400'
            : itemColor
              ? `${itemColor.bgLight} border-l-2 ${itemColor.borderClass}`
              : isFolder
                ? 'bg-slate-900/40'
                : ''
      }`}
    >
      {/* Select Checkbox */}
      <td className="py-3 px-4 w-10" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onToggleSelect(file.id)}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shadow-sm ${
            isSelected
              ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-cyan-500/30 ring-1 ring-cyan-400/40'
              : 'border-slate-500 bg-slate-950/80 hover:border-cyan-400 hover:bg-slate-900 text-transparent'
          }`}
          title={isSelected ? (lang === 'bn' ? 'অনির্বাচন করুন' : 'Deselect') : (lang === 'bn' ? 'টিক দিয়ে নির্বাচন করুন' : 'Click to select')}
          aria-label={isSelected ? 'Deselect' : 'Select'}
        >
          <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'text-slate-950' : 'text-slate-600/30'}`} />
        </button>
      </td>

      {/* Name & Icon */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border shrink-0 ${
            isFolder
              ? folderColor
                ? `${folderColor.bgLight} ${folderColor.borderClass}`
                : 'bg-amber-950/30 border-amber-500/30'
              : itemColor
                ? `${itemColor.bgLight} ${itemColor.borderClass}`
                : 'bg-slate-950 border-slate-800'
          }`}>
            {getCategoryIcon()}
          </div>
          <div className="truncate max-w-xs sm:max-w-md">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold truncate ${isFolder ? (folderColor ? `${folderColor.textClass} font-bold` : 'text-amber-200 font-bold') : (itemColor ? `${itemColor.textClass} font-bold` : 'text-slate-200')}`}>
                {file.name}
              </span>
              {itemColor && !isFolder && (
                <span
                  className="w-2 h-2 rounded-full shadow-sm ring-1 ring-white/20 shrink-0"
                  style={{ backgroundColor: itemColor.hex }}
                  title={`${lang === 'bn' ? 'কালার লেবেল' : 'Color'}: ${lang === 'bn' ? itemColor.nameBn : itemColor.nameEn}`}
                />
              )}
              {isFolder && (
                <div className="flex items-center gap-1 shrink-0">
                  {folderColor && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-white/20"
                      style={{ backgroundColor: folderColor.hex }}
                      title={`${lang === 'bn' ? 'কালার লেবেল' : 'Color'}: ${lang === 'bn' ? folderColor.nameBn : folderColor.nameEn}`}
                    />
                  )}
                  <span className={`text-[10px] font-bold font-mono uppercase ${folderColor ? folderColor.textClass : 'text-amber-400'}`}>
                    {lang === 'bn' ? 'ফোল্ডার' : 'Folder'}
                  </span>
                  {!isTrash && onFolderContextMenu && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFolderContextMenu(file, e);
                      }}
                      className="p-0.5 rounded text-slate-500 hover:text-cyan-300 transition opacity-0 group-hover:opacity-100"
                      title={lang === 'bn' ? 'কালার লেবেল দিন (রাইট-ক্লিক)' : 'Color label (Right-click)'}
                    >
                      <Palette className="w-3 h-3" />
                    </button>
                  )}
                </div>
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

      {/* Upload Date or Deleted Date */}
      <td className="py-3 px-4 text-xs text-slate-400 hidden md:table-cell">
        {isTrash ? (
          <div className="flex flex-col">
            <span className="text-red-400 font-semibold flex items-center gap-1">
              <Trash2 className="w-3 h-3 text-red-400 shrink-0" />
              {file.deletedAt ? new Date(file.deletedAt).toLocaleDateString() : new Date(file.uploadedAt).toLocaleDateString()}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
              {formatTimeAgo(file.deletedAt || file.uploadedAt, lang)}
            </span>
          </div>
        ) : (
          new Date(file.uploadedAt).toLocaleDateString()
        )}
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {!isTrash ? (
            <>
              {/* Rename */}
              {onRename && (
                <button
                  type="button"
                  onClick={() => onRename(file)}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
                  title={lang === 'bn' ? 'নাম পরিবর্তন' : 'Rename'}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

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
