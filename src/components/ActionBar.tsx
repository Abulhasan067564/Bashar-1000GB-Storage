import React, { useState, useEffect, useRef } from 'react';
import { ViewMode, FileCategory, ActiveTab, StorageFile, ClipboardState, SiteSettings, FOLDER_COLOR_PRESETS } from '../types/storage';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Download, 
  Upload, 
  LayoutGrid, 
  List, 
  Filter, 
  ArrowUpDown,
  ArchiveRestore,
  Sparkles,
  FilePlus,
  FolderPlus,
  Copy,
  Move,
  ClipboardPaste,
  X,
  HardDrive,
  Folder,
  ArrowLeft,
  ChevronRight,
  Video,
  Mic,
  Info,
  Star,
  StarOff,
  Palette,
  Layers,
  ChevronDown,
  Ban,
  Edit3
} from 'lucide-react';

interface ActionBarProps {
  activeTab: ActiveTab;
  siteSettings?: SiteSettings;
  totalFilteredFiles: number;
  selectedCount: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onBatchDelete: () => void;
  onBatchDownloadZip: () => void;
  onOpenUpload: () => void;
  onOpenCreateFile: () => void;
  onOpenCreateFolder: () => void;
  onOpenScreenRecorder?: () => void;
  onOpenVoiceRecorder?: () => void;
  onOpenMoveModal: () => void;
  onOpenCopyModal: () => void;
  onRenameSelected?: () => void;
  onBatchRenameSelected?: () => void;
  onDropIntoFolder?: (draggedFileIds: string | string[], targetFolderId: string | null) => void;
  onBatchSetFolderLabel?: (colorId: string | undefined) => void;
  onBatchToggleStar?: (starred: boolean) => void;
  clipboard: ClipboardState | null;
  onExecuteClipboard: () => void;
  onCancelClipboard: () => void;
  currentFolder: StorageFile | null;
  onNavigateUpFolder: () => void;
  onEmptyTrash?: () => void;
  onRestoreAllTrash?: () => void;
  onBatchRestoreTrash?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedCategory: FileCategory | 'all';
  onCategoryChange: (cat: FileCategory | 'all') => void;
  sortBy: 'date' | 'name' | 'size';
  onSortByChange: (sort: 'date' | 'name' | 'size') => void;
  isZipping?: boolean;
  isDetailsPanelOpen?: boolean;
  onToggleDetailsPanel?: () => void;
  lang: 'bn' | 'en';
}

export const ActionBar: React.FC<ActionBarProps> = ({
  activeTab,
  siteSettings,
  totalFilteredFiles,
  selectedCount,
  allSelected,
  onToggleSelectAll,
  onBatchDelete,
  onBatchDownloadZip,
  onOpenUpload,
  onOpenCreateFile,
  onOpenCreateFolder,
  onOpenScreenRecorder,
  onOpenVoiceRecorder,
  onOpenMoveModal,
  onOpenCopyModal,
  onRenameSelected,
  onBatchRenameSelected,
  onDropIntoFolder,
  onBatchSetFolderLabel,
  onBatchToggleStar,
  clipboard,
  onExecuteClipboard,
  onCancelClipboard,
  currentFolder,
  onNavigateUpFolder,
  onEmptyTrash,
  onRestoreAllTrash,
  onBatchRestoreTrash,
  viewMode,
  onViewModeChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortByChange,
  isZipping = false,
  isDetailsPanelOpen = false,
  onToggleDetailsPanel,
  lang
}) => {
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isBatchColorPickerOpen, setIsBatchColorPickerOpen] = useState(false);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);
  const [isDragOverBack, setIsDragOverBack] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);
  const batchColorPickerRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (batchColorPickerRef.current && !batchColorPickerRef.current.contains(event.target as Node)) {
        setIsBatchColorPickerOpen(false);
      }
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(event.target as Node)) {
        setIsBulkMenuOpen(false);
        setIsColorPickerOpen(false);
      }
    };
    if (isBatchColorPickerOpen || isBulkMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBatchColorPickerOpen, isBulkMenuOpen]);

  // Reset menus on selection change
  useEffect(() => {
    if (selectedCount === 0) {
      setIsBatchColorPickerOpen(false);
    }
    if (selectedCount <= 1) {
      setIsBulkMenuOpen(false);
      setIsColorPickerOpen(false);
    }
  }, [selectedCount]);

  // Handle dropping files onto breadcrumbs (e.g. Back button or Root Drive)
  const handleDropOnTarget = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    setIsDragOverRoot(false);
    setIsDragOverBack(false);
    if (!onDropIntoFolder) return;

    let idsToMove: string[] = [];
    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        if (parsed?.fileIds && Array.isArray(parsed.fileIds)) {
          idsToMove = parsed.fileIds;
        }
      }
    } catch {
      // fallback to plain text
    }

    if (idsToMove.length === 0) {
      const raw = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
      if (raw) {
        idsToMove = raw.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (idsToMove.length > 0) {
      onDropIntoFolder(idsToMove, targetFolderId);
    }
  };

  const isTrashTab = activeTab === 'trash';
  const driveTitle = siteSettings?.siteName ? `${siteSettings.siteName} Drive` : 'Bashar Drive';
  const driveTitleBn = siteSettings?.siteName ? `${siteSettings.siteName} ড্রাইভ` : 'বাশার ড্রাইভ';

  const categories: { key: FileCategory | 'all'; labelBn: string; labelEn: string }[] = [
    { key: 'all', labelBn: 'সকল', labelEn: 'All' },
    { key: 'image', labelBn: 'ছবি', labelEn: 'Images' },
    { key: 'video', labelBn: 'ভিডিও', labelEn: 'Videos' },
    { key: 'audio', labelBn: 'অডিও', labelEn: 'Audio' },
    { key: 'document', labelBn: 'ডকুমেন্টস', labelEn: 'Docs' },
    { key: 'archive', labelBn: 'আর্কাইভ', labelEn: 'Zips' },
    { key: 'code', labelBn: 'কোড', labelEn: 'Code' },
  ];

  return (
    <div className="bg-slate-900/50 border-b border-slate-800 p-3.5 sm:p-4 space-y-3">
      {/* Active Clipboard Bar (When Move or Copy is in progress) */}
      {clipboard && (
        <div className={`p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 border shadow-lg animate-in slide-in-from-top-2 ${
          clipboard.action === 'move' 
            ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-100'
            : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-100'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${clipboard.action === 'move' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
              {clipboard.action === 'move' ? <Move className="w-4 h-4 animate-bounce" /> : <Copy className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs font-bold">
                {clipboard.action === 'move'
                  ? (lang === 'bn' ? `মুভ মোড: ${clipboard.itemIds.length} টি ফাইল সরানো হচ্ছে` : `Move Mode: ${clipboard.itemIds.length} items`)
                  : (lang === 'bn' ? `কপি মোড: ${clipboard.itemIds.length} টি ফাইল অনুলিপি করা হচ্ছে` : `Copy Mode: ${clipboard.itemIds.length} items`)}
              </div>
              <div className="text-[11px] opacity-80">
                {currentFolder
                  ? (lang === 'bn' ? `বর্তমান অবস্থান: "${currentFolder.name}" ফোল্ডারের ভেতরে` : `Target: Inside "${currentFolder.name}"`)
                  : (lang === 'bn' ? `বর্তমান অবস্থান: ${driveTitleBn}` : `Target: ${driveTitle}`)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExecuteClipboard}
              className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer ${
                clipboard.action === 'move'
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>
                {clipboard.action === 'move'
                  ? (lang === 'bn' ? 'এখানে মুভ করুন (Move Here)' : 'Move Here')
                  : (lang === 'bn' ? 'এখানে পেস্ট করুন (Paste Here)' : 'Paste Here')}
              </span>
            </button>
            <button
              onClick={onCancelClipboard}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition"
              title={lang === 'bn' ? 'বাতিল' : 'Cancel'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb / Location Bar with Drag and Drop targets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs min-w-0 overflow-x-auto no-scrollbar py-0.5">
          {currentFolder ? (
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <button
                onClick={onNavigateUpFolder}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setIsDragOverBack(true);
                }}
                onDragLeave={() => setIsDragOverBack(false)}
                onDrop={(e) => handleDropOnTarget(e, currentFolder.folderId || null)}
                title={lang === 'bn' ? 'আগের ফোল্ডারে ফিরে যান (এখানে ড্রপ করে ফাইল স্থানান্তর করতে পারেন)' : 'Go up (Drop files here to move)'}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition font-semibold cursor-pointer border shrink-0 ${
                  isDragOverBack
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/50 scale-105 shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? (isDragOverBack ? 'এখানে ফেলুন' : 'ফিরে যান') : (isDragOverBack ? 'Drop Here' : 'Back')}</span>
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={onNavigateUpFolder}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setIsDragOverRoot(true);
                }}
                onDragLeave={() => setIsDragOverRoot(false)}
                onDrop={(e) => handleDropOnTarget(e, null)}
                title={lang === 'bn' ? 'মূল ড্রাইভে ফিরে যান (এখানে ড্রপ করে ফাইল মূল ড্রাইভে মুভ করুন)' : 'Root Drive (Drop files here to move to root)'}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition font-medium cursor-pointer border shrink-0 ${
                  isDragOverRoot
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/50 scale-105 shadow-md'
                    : 'text-slate-400 hover:text-white border-transparent'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'bn' ? (isDragOverRoot ? 'মূল ড্রাইভে ফেলুন' : driveTitleBn) : (isDragOverRoot ? 'Drop in Root' : driveTitle)}</span>
              </button>
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold truncate">
                <Folder className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{currentFolder.name}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'bn' ? driveTitleBn : driveTitle}</span>
            </div>
          )}
        </div>

        {/* Primary Creation Action Buttons */}
        {!isTrashTab && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={onOpenCreateFile}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
              title={lang === 'bn' ? 'নতুন টেক্সট বা ডকুমেন্ট ফাইল তৈরি করুন' : 'Create new document or text file'}
            >
              <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'bn' ? 'নতুন ফাইল' : 'New File'}</span>
            </button>

            <button
              onClick={onOpenCreateFolder}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
              title={lang === 'bn' ? 'নতুন ফোল্ডার তৈরি করুন' : 'Create new folder'}
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'bn' ? 'নতুন ফোল্ডার' : 'New Folder'}</span>
            </button>

            {onOpenScreenRecorder && (
              <button
                onClick={onOpenScreenRecorder}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 hover:text-rose-100 border border-rose-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
                title={lang === 'bn' ? 'স্ক্রিন রেকর্ডার' : 'Screen Recorder'}
              >
                <Video className="w-3.5 h-3.5 text-rose-400" />
                <span>{lang === 'bn' ? 'স্ক্রিন রেকর্ড' : 'Record'}</span>
              </button>
            )}

            {onOpenVoiceRecorder && (
              <button
                onClick={onOpenVoiceRecorder}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/70 text-indigo-300 hover:text-indigo-100 border border-indigo-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
                title={lang === 'bn' ? 'ভয়েস রেকর্ডার' : 'Voice Recorder'}
              >
                <Mic className="w-3.5 h-3.5 text-indigo-400" />
                <span>{lang === 'bn' ? 'ভয়েস রেকর্ড' : 'Voice'}</span>
              </button>
            )}

            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 transition cursor-pointer ml-auto sm:ml-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'আপলোড' : 'Upload'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Selection & Batch Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
        {/* Selection & Count */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSelectAll}
            disabled={totalFilteredFiles === 0}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition disabled:opacity-40 cursor-pointer"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-cyan-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>
              {allSelected
                ? (lang === 'bn' ? 'সব অনির্বাচিত করুন' : 'Deselect All')
                : (lang === 'bn' ? 'সব নির্বাচন করুন' : 'Select All')}
            </span>
          </button>

          {selectedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[11px] font-bold">
              {selectedCount} {lang === 'bn' ? 'টি নির্বাচিত' : 'selected'}
            </span>
          )}

          {selectedCount > 1 && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-cyan-300/90 font-medium bg-cyan-950/40 px-2.5 py-0.5 rounded-full border border-cyan-800/50">
              <Move className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>{lang === 'bn' ? 'যেকোনো নির্বাচিত ফাইল টেনে ফোল্ডারে মুভ করুন' : 'Drag any item to move all together'}</span>
            </span>
          )}
        </div>

        {/* Batch Actions Group */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* BULK ACTION DROPDOWN MENU - Appears ONLY when multiple files are selected (selectedCount > 1) */}
          {!isTrashTab && selectedCount > 1 && (
            <div className="relative" ref={bulkMenuRef}>
              <button
                onClick={() => setIsBulkMenuOpen(prev => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black shadow-lg shadow-cyan-500/25 border border-cyan-400/40 transition cursor-pointer animate-in zoom-in-95"
                title={lang === 'bn' ? 'নির্বাচিত একাধিক ফাইলের জন্য বাল্ক অ্যাকশন মেনু' : 'Bulk Action Menu for selected files'}
              >
                <Layers className="w-4 h-4 text-cyan-200" />
                <span>{lang === 'bn' ? `বাল্ক অ্যাকশন (${selectedCount})` : `Bulk Actions (${selectedCount})`}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isBulkMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Popover */}
              {isBulkMenuOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-72 sm:w-80 bg-slate-900/98 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 space-y-1">
                  <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>{lang === 'bn' ? 'বাল্ক অপারেশনসমূহ' : 'Bulk Operations'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-black">
                      {selectedCount} {lang === 'bn' ? 'টি আইটেম' : 'items'}
                    </span>
                  </div>

                  {/* Set Folder / Item Color Label */}
                  {onBatchSetFolderLabel && (
                    <div className="p-1">
                      <button
                        onClick={() => setIsColorPickerOpen(prev => !prev)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Palette className="w-4 h-4 text-amber-400" />
                          <span>{lang === 'bn' ? 'ফোল্ডার কালার লেবেল দিন' : 'Set Folder / Color Label'}</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isColorPickerOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isColorPickerOpen && (
                        <div className="mt-1 p-2.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2 animate-in fade-in">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {lang === 'bn' ? 'একটি কালার লেবেল বেছে নিন' : 'Choose a color label'}
                          </div>
                          <div className="grid grid-cols-5 gap-1.5">
                            {FOLDER_COLOR_PRESETS.map((color) => (
                              <button
                                key={color.id}
                                onClick={() => {
                                  onBatchSetFolderLabel(color.id);
                                  setIsBulkMenuOpen(false);
                                  setIsColorPickerOpen(false);
                                }}
                                className="group flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-800/80 transition cursor-pointer"
                                title={lang === 'bn' ? color.nameBn : color.nameEn}
                              >
                                <div
                                  className="w-6 h-6 rounded-full border-2 border-white/20 shadow-md group-hover:scale-110 group-hover:border-white transition-all duration-150"
                                  style={{ backgroundColor: color.hex }}
                                />
                                <span className="text-[9px] text-slate-400 truncate max-w-[48px] text-center">
                                  {lang === 'bn' ? color.nameBn.split(' ')[0] : color.nameEn.split(' ')[0]}
                                </span>
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              onBatchSetFolderLabel(undefined);
                              setIsBulkMenuOpen(false);
                              setIsColorPickerOpen(false);
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition cursor-pointer"
                          >
                            <Ban className="w-3 h-3" />
                            <span>{lang === 'bn' ? 'কালার লেবেল মুছুন (None)' : 'Clear Color Label'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mark as Starred */}
                  {onBatchToggleStar && (
                    <button
                      onClick={() => {
                        onBatchToggleStar(true);
                        setIsBulkMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-amber-300 hover:bg-amber-950/30 transition cursor-pointer"
                    >
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400/30" />
                      <span>{lang === 'bn' ? 'সবগুলোকে তারকাচিহ্নিত করুন' : 'Mark as Starred'}</span>
                    </button>
                  )}

                  {/* Remove Star */}
                  {onBatchToggleStar && (
                    <button
                      onClick={() => {
                        onBatchToggleStar(false);
                        setIsBulkMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <StarOff className="w-4 h-4 text-slate-400" />
                      <span>{lang === 'bn' ? 'তারকাচিহ্ন মুছে ফেলুন' : 'Remove Star'}</span>
                    </button>
                  )}

                  <div className="h-px bg-slate-800 my-1" />

                  {/* Batch Rename */}
                  {onBatchRenameSelected && (
                    <button
                      onClick={() => {
                        onBatchRenameSelected();
                        setIsBulkMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-cyan-300 hover:bg-cyan-950/30 transition cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 text-cyan-400" />
                      <span>{lang === 'bn' ? 'বাল্ক/ব্যাচ রিনেম (Batch Rename)' : 'Batch Rename'}</span>
                    </button>
                  )}

                  {/* Move Selected */}
                  <button
                    onClick={() => {
                      onOpenMoveModal();
                      setIsBulkMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-indigo-300 hover:bg-indigo-950/30 transition cursor-pointer"
                  >
                    <Move className="w-4 h-4 text-indigo-400" />
                    <span>{lang === 'bn' ? 'ফোল্ডারে মুভ করুন (Move)' : 'Move Selected'}</span>
                  </button>

                  {/* Copy Selected */}
                  <button
                    onClick={() => {
                      onOpenCopyModal();
                      setIsBulkMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-cyan-300 hover:bg-cyan-950/30 transition cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-cyan-400" />
                    <span>{lang === 'bn' ? 'কপি করুন (Copy)' : 'Copy Selected'}</span>
                  </button>

                  {/* Download as ZIP */}
                  <button
                    onClick={() => {
                      onBatchDownloadZip();
                      setIsBulkMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-cyan-300 hover:bg-cyan-950/30 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>{lang === 'bn' ? 'জিপ আকারে ডাউনলোড (ZIP)' : 'Download as ZIP'}</span>
                  </button>

                  <div className="h-px bg-slate-800 my-1" />

                  {/* Delete / Move to Bin */}
                  <button
                    onClick={() => {
                      onBatchDelete();
                      setIsBulkMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-300 hover:text-red-200 hover:bg-red-950/40 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>{lang === 'bn' ? 'রিসাইকেল বিনে পাঠান (Delete)' : 'Move to Recycle Bin'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* RENAME (নাম পরিবর্তন) BUTTON FOR SINGLE SELECTION */}
          {!isTrashTab && selectedCount === 1 && onRenameSelected && (
            <button
              onClick={onRenameSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white text-xs font-bold border border-cyan-500/40 transition cursor-pointer shadow-sm"
              title={lang === 'bn' ? 'নির্বাচিত ফাইলের নাম পরিবর্তন করুন' : 'Rename selected item'}
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'bn' ? 'নাম পরিবর্তন' : 'Rename'}</span>
            </button>
          )}

          {/* BATCH RENAME (ব্যাচ রিনেম) BUTTON FOR MULTIPLE SELECTION */}
          {!isTrashTab && selectedCount > 1 && onBatchRenameSelected && (
            <button
              onClick={onBatchRenameSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white text-xs font-bold border border-cyan-500/40 transition cursor-pointer shadow-sm"
              title={lang === 'bn' ? 'নির্বাচিত একাধিক ফাইলের নাম একসাথে ব্যাচ রিনেম করুন' : 'Batch rename multiple selected files'}
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'bn' ? `ব্যাচ রিনেম (${selectedCount})` : `Batch Rename (${selectedCount})`}</span>
            </button>
          )}

          {/* STANDALONE BATCH COLOR LABEL (কালার লেবেল) TOOL FOR ANY SELECTION */}
          {!isTrashTab && selectedCount > 0 && onBatchSetFolderLabel && (
            <div className="relative" ref={batchColorPickerRef}>
              <button
                onClick={() => setIsBatchColorPickerOpen(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/90 to-orange-950/90 hover:from-amber-900 hover:to-orange-900 text-amber-300 hover:text-amber-100 text-xs font-bold border border-amber-500/50 transition cursor-pointer shadow-sm active:scale-95 animate-in zoom-in-95"
                title={lang === 'bn' ? `নির্বাচিত ${selectedCount} টি আইটেমে কালার লেবেল দিন` : `Set color label for ${selectedCount} selected items`}
              >
                <Palette className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{lang === 'bn' ? `কালার লেবেল (${selectedCount})` : `Color Label (${selectedCount})`}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-200 ${isBatchColorPickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Batch Color Palette Popover */}
              {isBatchColorPickerOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-72 sm:w-80 bg-slate-900/98 backdrop-blur-xl border border-amber-500/50 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                        <Palette className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {lang === 'bn' ? 'কালার লেবেল বেছে নিন' : 'Choose Color Label'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {lang === 'bn' ? 'নির্বাচিত ফাইল ও ফোল্ডারে যুক্ত হবে' : 'Applies to selected files & folders'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-black">
                      {selectedCount} {lang === 'bn' ? 'টি নির্বাচিত' : 'selected'}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {FOLDER_COLOR_PRESETS.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => {
                          onBatchSetFolderLabel(color.id);
                          setIsBatchColorPickerOpen(false);
                        }}
                        className="group flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-800/90 transition cursor-pointer active:scale-95 border border-transparent hover:border-slate-700"
                        title={lang === 'bn' ? color.nameBn : color.nameEn}
                      >
                        <div
                          className="w-7 h-7 rounded-full border-2 border-white/20 shadow-md group-hover:scale-115 group-hover:border-white transition-all duration-150 relative"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="text-[10px] text-slate-300 truncate max-w-[50px] text-center font-medium group-hover:text-white">
                          {lang === 'bn' ? color.nameBn.split(' ')[0] : color.nameEn.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        onBatchSetFolderLabel(undefined);
                        setIsBatchColorPickerOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lang === 'bn' ? 'কালার লেবেল মুছুন (স্বাভাবিক কালার)' : 'Reset / Remove Color'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MOVE (মুভ) BUTTON */}
          {!isTrashTab && selectedCount > 0 && (
            <button
              onClick={onOpenMoveModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-600/50 transition cursor-pointer shadow-sm"
              title={lang === 'bn' ? 'নির্বাচিত ফাইলগুলো ফোল্ডারের ভিতরে মুভ করুন' : 'Move selected files to folder'}
            >
              <Move className="w-3.5 h-3.5 text-indigo-400" />
              <span>{lang === 'bn' ? `মুভ (${selectedCount})` : `Move (${selectedCount})`}</span>
            </button>
          )}

          {/* COPY (কপি) BUTTON */}
          {!isTrashTab && selectedCount > 0 && (
            <button
              onClick={onOpenCopyModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 hover:text-white text-xs font-bold border border-cyan-600/50 transition cursor-pointer shadow-sm"
              title={lang === 'bn' ? 'নির্বাচিত ফাইলগুলো কপি করে অন্য ফোল্ডারে রাখুন' : 'Copy selected files to folder'}
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'bn' ? `কপি (${selectedCount})` : `Copy (${selectedCount})`}</span>
            </button>
          )}

          {/* BULK DOWNLOAD ALL (ZIP) */}
          {!isTrashTab && (
            <button
              onClick={onBatchDownloadZip}
              disabled={totalFilteredFiles === 0 || isZipping}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-cyan-500/30 shadow-sm transition disabled:opacity-40 cursor-pointer"
              title={lang === 'bn' ? 'নির্বাচিত বা সকল ফাইল জিপ আকারে একসাথে ডাউনলোড' : 'Download selected or all files as ZIP'}
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {isZipping
                  ? (lang === 'bn' ? 'প্যাক হচ্ছে...' : 'Zipping...')
                  : selectedCount > 0
                    ? (lang === 'bn' ? `ডাউনলোড (${selectedCount})` : `Download (${selectedCount})`)
                    : (lang === 'bn' ? 'সব একসাথে ডাউনলোড' : 'Download All as ZIP')}
              </span>
            </button>
          )}

          {/* BULK DELETE / TRASH ACTIONS */}
          {!isTrashTab ? (
            <button
              onClick={onBatchDelete}
              disabled={selectedCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-bold border border-red-800/60 transition disabled:opacity-40 cursor-pointer"
              title={lang === 'bn' ? 'নির্বাচিত ফাইল রিসাইকেল বিনে পাঠান' : 'Move selected files to Recycle Bin'}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>
                {selectedCount > 0
                  ? (lang === 'bn' ? `রিসাইকেল বিনে পাঠান (${selectedCount})` : `Move to Bin (${selectedCount})`)
                  : (lang === 'bn' ? 'রিসাইকেল বিনে পাঠান' : 'Move to Bin')}
              </span>
            </button>
          ) : (
            /* Trash Actions */
            <div className="flex gap-2">
              {selectedCount > 0 ? (
                <>
                  <button
                    onClick={onBatchRestoreTrash}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-bold border border-emerald-700/60 transition cursor-pointer"
                    title={lang === 'bn' ? 'নির্বাচিত ফাইল রিস্টোর করুন' : 'Restore selected files'}
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? `রিস্টোর (${selectedCount})` : `Restore (${selectedCount})`}</span>
                  </button>

                  <button
                    onClick={onBatchDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-200 text-xs font-bold border border-red-800 transition cursor-pointer"
                    title={lang === 'bn' ? 'নির্বাচিত ফাইল সারা জীবনের জন্য স্থায়ীভাবে মুছে ফেলুন' : 'Permanently delete selected files forever'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? `সারা জীবনের জন্য ডিলিট (${selectedCount})` : `Delete Forever (${selectedCount})`}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onRestoreAllTrash}
                    disabled={totalFilteredFiles === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold border border-emerald-800/60 transition disabled:opacity-40 cursor-pointer"
                    title={lang === 'bn' ? 'সব ফাইল ড্রাইভটিতে রিস্টোর করুন' : 'Restore all files'}
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'সব রিস্টোর করুন' : 'Restore All'}</span>
                  </button>

                  <button
                    onClick={onEmptyTrash}
                    disabled={totalFilteredFiles === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-200 text-xs font-bold border border-red-800 transition disabled:opacity-40 cursor-pointer"
                    title={lang === 'bn' ? 'রিসাইকেল বিন খালি করে সব ফাইল সারা জীবনের জন্য মুছে ফেলুন' : 'Empty Recycle Bin and delete forever'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'সারা জীবনের জন্য সব ডিলিট' : 'Delete All Forever'}</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-0.5 ml-1">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Collapsible Metadata / File Details Side Panel Toggle */}
          {onToggleDetailsPanel && (
            <button
              onClick={onToggleDetailsPanel}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ml-1 cursor-pointer border shadow-sm ${
                isDetailsPanelOpen
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 ring-1 ring-cyan-500/40'
                  : 'bg-slate-950/80 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
              }`}
              title={lang === 'bn' ? 'ফাইল মেটাডাটা ও বিস্তারিত প্যানেল খুলুন/বন্ধ করুন' : 'Toggle File Metadata & Details Panel'}
            >
              <Info className={`w-3.5 h-3.5 ${isDetailsPanelOpen ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{lang === 'bn' ? 'মেটাডাটা' : 'Metadata'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-1 px-1 touch-pan-x flex-nowrap shrink-0 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => onCategoryChange(cat.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition cursor-pointer shrink-0 ${
                selectedCategory === cat.key
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {lang === 'bn' ? cat.labelBn : cat.labelEn}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 text-xs text-slate-400 ml-auto shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'bn' ? 'সর্ট:' : 'Sort:'}</span>
          <select
            value={sortBy}
            onChange={e => onSortByChange(e.target.value as 'date' | 'name' | 'size')}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="date">{lang === 'bn' ? 'তারিখ (সর্বশেষ)' : 'Date (Newest)'}</option>
            <option value="name">{lang === 'bn' ? 'নাম (A-Z)' : 'Name (A-Z)'}</option>
            <option value="size">{lang === 'bn' ? 'সাইজ (বড় থেকে ছোট)' : 'Size (Largest)'}</option>
          </select>
        </div>
      </div>
    </div>
  );
};
