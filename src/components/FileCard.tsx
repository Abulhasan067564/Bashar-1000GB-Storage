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
  FolderOpen,
  Move,
  Copy,
  MoreVertical
} from 'lucide-react';

interface FileCardProps {
  file: StorageFile;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onPreview: (file: StorageFile) => void;
  onDownload: (file: StorageFile) => void;
  onShare: (file: StorageFile) => void;
  onDelete: (file: StorageFile) => void;
  onToggleStar: (file: StorageFile) => void;
  onRestore?: (file: StorageFile) => void;
  onOpenFolder?: (folder: StorageFile) => void;
  onQuickMove?: (file: StorageFile) => void;
  onQuickCopy?: (file: StorageFile) => void;
  onDropIntoFolder?: (draggedFileId: string, targetFolderId: string) => void;
  isTrash?: boolean;
  lang: 'bn' | 'en';
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  isSelected,
  onToggleSelect,
  onPreview,
  onDownload,
  onShare,
  onDelete,
  onToggleStar,
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

  const getCategoryTheme = () => {
    if (isFolder) {
      return { icon: Folder, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-500/40' };
    }
    switch (file.category) {
      case 'image':
        return { icon: ImageIcon, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/40' };
      case 'video':
        return { icon: Video, color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-800/40' };
      case 'audio':
        return { icon: Music, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/40' };
      case 'document':
        return { icon: FileText, color: 'text-sky-400', bg: 'bg-sky-950/40 border-sky-800/40' };
      case 'archive':
        return { icon: Archive, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/40' };
      case 'code':
        return { icon: Code2, color: 'text-teal-400', bg: 'bg-teal-950/40 border-teal-800/40' };
      default:
        return { icon: File, color: 'text-slate-400', bg: 'bg-slate-900 border-slate-800' };
    }
  };

  const theme = getCategoryTheme();
  const IconComponent = theme.icon;

  const handleClickCard = () => {
    if (isFolder) {
      if (onOpenFolder) onOpenFolder(file);
    } else {
      onPreview(file);
    }
  };

  // Drag and drop handlers
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
    <div
      onClick={handleClickCard}
      draggable={!isFolder && !isTrash}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative bg-slate-900/70 hover:bg-slate-800/90 border rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-cyan-500/5 flex flex-col justify-between ${
        isSelected
          ? 'border-cyan-400 ring-1 ring-cyan-400 bg-slate-800/90'
          : isDragOver
            ? 'border-amber-400 ring-2 ring-amber-400 bg-amber-950/30 scale-105'
            : isFolder
              ? 'border-amber-500/30 hover:border-amber-400/60 bg-slate-900/80'
              : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Header: Select Checkbox, Badges, Star */}
      <div className="flex items-center justify-between gap-1 mb-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(file.id); }}
          className="p-1 text-slate-400 hover:text-white transition"
          title={isSelected ? 'Deselect' : 'Select'}
        >
          {isSelected ? (
            <CheckCircle2 className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
          ) : (
            <Circle className="w-5 h-5 text-slate-600 group-hover:text-slate-400" />
          )}
        </button>

        <div className="flex items-center gap-1.5">
          {isFolder && (
            <span
              className="text-[10px] font-bold text-amber-400 tracking-wide uppercase font-mono"
              title={lang === 'bn' ? 'ফোল্ডার' : 'Folder'}
            >
              {lang === 'bn' ? 'ফোল্ডার' : 'Folder'}
            </span>
          )}

          {file.isEncrypted && (
            <span
              className="text-amber-400"
              title={lang === 'bn' ? 'এনক্রিপ্টেড ভল্ট ফাইল' : 'Encrypted Vault'}
            >
              <Lock className="w-3.5 h-3.5" />
            </span>
          )}

          {file.shared?.isShared && (
            <span
              className="text-cyan-400"
              title={lang === 'bn' ? 'শেয়ার করা লিঙ্ক সক্রিয়' : 'Public Share Active'}
            >
              <Share2 className="w-3.5 h-3.5" />
            </span>
          )}

          {!isTrash && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleStar(file); }}
              className={`p-1 rounded-lg transition ${file.isStarred ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-amber-400 opacity-0 group-hover:opacity-100'}`}
              title="Star"
            >
              <Star className={`w-4 h-4 ${file.isStarred ? 'fill-amber-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Middle: Thumbnail / Category Icon */}
      <div className="flex flex-col items-center justify-center py-3 my-auto">
        {isFolder ? (
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-inner bg-amber-500/10 border-amber-500/30 group-hover:scale-105 transition">
            <Folder className="w-8 h-8 text-amber-400 fill-amber-400/20" />
          </div>
        ) : file.category === 'image' && file.dataUrl ? (
          <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-700/60 bg-black/40 flex items-center justify-center shadow-inner group-hover:border-cyan-500/50 transition">
            <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-inner ${theme.bg}`}>
            <IconComponent className={`w-8 h-8 ${theme.color}`} />
          </div>
        )}

        <h4 className="mt-3 text-xs font-bold text-slate-100 text-center truncate max-w-[170px]" title={file.name}>
          {file.name}
        </h4>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 font-medium">
          <span>{formatBytes(file.size)}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>{new Date(file.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Footer: Quick Actions */}
      <div className="pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[10px] text-slate-500 font-mono uppercase">
          {isFolder ? 'Folder' : file.category}
        </span>

        {/* Action icons */}
        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
          {!isTrash ? (
            <>
              {/* Move Quick Action */}
              {onQuickMove && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onQuickMove(file); }}
                  className="p-1.5 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition"
                  title={lang === 'bn' ? 'ফোল্ডারে মুভ করুন' : 'Move to folder'}
                >
                  <Move className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Copy Quick Action */}
              {onQuickCopy && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onQuickCopy(file); }}
                  className="p-1.5 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition"
                  title={lang === 'bn' ? 'কপি করুন' : 'Copy'}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}

              {!isFolder && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onPreview(file); }}
                    className="p-1.5 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition"
                    title={lang === 'bn' ? 'প্রিভিউ' : 'Preview'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onShare(file); }}
                    className="p-1.5 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition"
                    title={lang === 'bn' ? 'শেয়ার' : 'Share'}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDownload(file); }}
                    className="p-1.5 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition"
                    title={lang === 'bn' ? 'ডাউনলোড' : 'Download'}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                className="p-1.5 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
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
                  onClick={(e) => { e.stopPropagation(); onRestore(file); }}
                  className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-slate-800 transition"
                  title={lang === 'bn' ? 'রিস্টোর করুন' : 'Restore'}
                >
                  <ArchiveRestore className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-slate-800 transition"
                title={lang === 'bn' ? 'সারা জীবনের জন্য ডিলিট (স্থায়ীভাবে)' : 'Delete permanently forever'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
