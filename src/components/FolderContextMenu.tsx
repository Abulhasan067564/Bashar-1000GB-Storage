import React, { useEffect, useRef } from 'react';
import { StorageFile, FOLDER_COLOR_PRESETS, getFolderColorStyle } from '../types/storage';
import { 
  Folder, 
  FolderOpen,
  Palette, 
  Check, 
  X, 
  Trash2, 
  Star, 
  Edit3, 
  FolderInput, 
  Info,
  Sparkles,
  Ban
} from 'lucide-react';

interface FolderContextMenuProps {
  folder: StorageFile | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onSetColor: (folderId: string, colorId: string | undefined) => void;
  onOpenFolder?: (folder: StorageFile) => void;
  onRename?: (folder: StorageFile) => void;
  onMoveCopy?: (folder: StorageFile) => void;
  onToggleStar?: (folder: StorageFile) => void;
  onDelete?: (folder: StorageFile) => void;
  onViewDetails?: (folder: StorageFile) => void;
  lang: 'bn' | 'en';
}

export const FolderContextMenu: React.FC<FolderContextMenuProps> = ({
  folder,
  position,
  onClose,
  onSetColor,
  onOpenFolder,
  onRename,
  onMoveCopy,
  onToggleStar,
  onDelete,
  onViewDetails,
  lang
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click, window scroll, or Escape key
  useEffect(() => {
    if (!position || !folder) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [position, folder, onClose]);

  if (!position || !folder) return null;

  // Viewport boundary clamping
  const menuWidth = 260;
  const menuHeight = 360;
  const padding = 12;

  let x = position.x;
  let y = position.y;

  if (typeof window !== 'undefined') {
    if (x + menuWidth > window.innerWidth - padding) {
      x = Math.max(padding, window.innerWidth - menuWidth - padding);
    }
    if (y + menuHeight > window.innerHeight - padding) {
      y = Math.max(padding, window.innerHeight - menuHeight - padding);
    }
  }

  const currentColorStyle = getFolderColorStyle(folder.colorLabel);

  return (
    <div
      ref={menuRef}
      style={{ top: `${y}px`, left: `${x}px` }}
      className="fixed z-50 w-64 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-3 text-slate-100 animate-in fade-in zoom-in-95 duration-150 select-none"
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Header with folder identity */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`p-1.5 rounded-lg shrink-0 ${currentColorStyle ? currentColorStyle.bgLight : 'bg-amber-500/15'}`}>
            <Folder className={`w-4 h-4 ${currentColorStyle ? currentColorStyle.textClass : 'text-amber-400'}`} />
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-white truncate max-w-[170px]" title={folder.name}>
              {folder.name}
            </p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>{lang === 'bn' ? 'ফোল্ডার অপশন' : 'Folder Options'}</span>
              {currentColorStyle && (
                <>
                  <span>•</span>
                  <span className={`font-medium ${currentColorStyle.textClass}`}>
                    {lang === 'bn' ? currentColorStyle.nameBn : currentColorStyle.nameEn}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Color Label Section */}
      <div className="mb-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'bn' ? 'কালার লেবেল' : 'Color Label'}</span>
          </span>
          {folder.colorLabel && (
            <button
              onClick={() => {
                onSetColor(folder.id, undefined);
                onClose();
              }}
              className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition cursor-pointer"
              title={lang === 'bn' ? 'কালার মুছে ফেলুন' : 'Remove color'}
            >
              <Ban className="w-2.5 h-2.5" />
              <span>{lang === 'bn' ? 'রিমুভ' : 'Clear'}</span>
            </button>
          )}
        </div>

        {/* Color Palette Grid */}
        <div className="grid grid-cols-5 gap-1.5 p-1.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
          {FOLDER_COLOR_PRESETS.map(preset => {
            const isSelected = folder.colorLabel === preset.id || folder.colorLabel === preset.hex;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  onSetColor(folder.id, preset.id);
                  onClose();
                }}
                className={`relative group p-1 rounded-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                  isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-950' : ''
                }`}
                title={lang === 'bn' ? preset.nameBn : preset.nameEn}
              >
                <span
                  className="w-6 h-6 rounded-md shadow-md flex items-center justify-center border border-white/20 transition group-hover:shadow-lg"
                  style={{ backgroundColor: preset.hex }}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow stroke-[3]" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800/80 my-2" />

      {/* Quick Action List */}
      <div className="space-y-0.5 text-xs">
        {onOpenFolder && (
          <button
            onClick={() => {
              onOpenFolder(folder);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-cyan-300 transition text-left cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'bn' ? 'ফোল্ডার খুলুন' : 'Open Folder'}</span>
          </button>
        )}

        {onViewDetails && (
          <button
            onClick={() => {
              onViewDetails(folder);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'bn' ? 'মেটাডাটা ও বিবরণ' : 'Metadata & Details'}</span>
          </button>
        )}

        {onRename && (
          <button
            onClick={() => {
              onRename(folder);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'bn' ? 'নাম পরিবর্তন' : 'Rename'}</span>
          </button>
        )}

        {onMoveCopy && (
          <button
            onClick={() => {
              onMoveCopy(folder);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left cursor-pointer"
          >
            <FolderInput className="w-3.5 h-3.5 text-purple-400" />
            <span>{lang === 'bn' ? 'মুভ বা কপি করুন' : 'Move or Copy'}</span>
          </button>
        )}

        {onToggleStar && (
          <button
            onClick={() => {
              onToggleStar(folder);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-amber-300 transition text-left cursor-pointer"
          >
            <Star className={`w-3.5 h-3.5 ${folder.isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
            <span>
              {folder.isStarred
                ? (lang === 'bn' ? 'স্টার বাতিল করুন' : 'Unstar')
                : (lang === 'bn' ? 'স্টার করুন' : 'Add to Starred')}
            </span>
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => {
              onDelete(folder);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition text-left cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ডিলিট করুন' : 'Delete'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
