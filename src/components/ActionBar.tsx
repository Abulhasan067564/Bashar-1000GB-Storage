import React from 'react';
import { ViewMode, FileCategory, ActiveTab, StorageFile, ClipboardState } from '../types/storage';
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
  ChevronRight
} from 'lucide-react';

interface ActionBarProps {
  activeTab: ActiveTab;
  totalFilteredFiles: number;
  selectedCount: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onBatchDelete: () => void;
  onBatchDownloadZip: () => void;
  onOpenUpload: () => void;
  onOpenCreateFile: () => void;
  onOpenCreateFolder: () => void;
  onOpenMoveModal: () => void;
  onOpenCopyModal: () => void;
  clipboard: ClipboardState | null;
  onExecuteClipboard: () => void;
  onCancelClipboard: () => void;
  currentFolder: StorageFile | null;
  onNavigateUpFolder: () => void;
  onEmptyTrash?: () => void;
  onRestoreAllTrash?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedCategory: FileCategory | 'all';
  onCategoryChange: (cat: FileCategory | 'all') => void;
  sortBy: 'date' | 'name' | 'size';
  onSortByChange: (sort: 'date' | 'name' | 'size') => void;
  isZipping?: boolean;
  lang: 'bn' | 'en';
}

export const ActionBar: React.FC<ActionBarProps> = ({
  activeTab,
  totalFilteredFiles,
  selectedCount,
  allSelected,
  onToggleSelectAll,
  onBatchDelete,
  onBatchDownloadZip,
  onOpenUpload,
  onOpenCreateFile,
  onOpenCreateFolder,
  onOpenMoveModal,
  onOpenCopyModal,
  clipboard,
  onExecuteClipboard,
  onCancelClipboard,
  currentFolder,
  onNavigateUpFolder,
  onEmptyTrash,
  onRestoreAllTrash,
  viewMode,
  onViewModeChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortByChange,
  isZipping = false,
  lang
}) => {
  const isTrashTab = activeTab === 'trash';

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
                  : (lang === 'bn' ? 'বর্তমান অবস্থান: বাশার ড্রাইভ (Bashar Drive)' : 'Target: Bashar Drive')}
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

      {/* Breadcrumb / Location Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          {currentFolder ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onNavigateUpFolder}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={onNavigateUpFolder}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'bn' ? 'বাশার ড্রাইভ' : 'Bashar Drive'}</span>
              </button>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                <Folder className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                <span>{currentFolder.name}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'bn' ? 'বাশার ড্রাইভ (Bashar Drive)' : 'Bashar Drive'}</span>
            </div>
          )}
        </div>

        {/* Primary Creation Action Buttons */}
        {!isTrashTab && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCreateFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
              title={lang === 'bn' ? 'নতুন টেক্সট বা ডকুমেন্ট ফাইল তৈরি করুন' : 'Create new document or text file'}
            >
              <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'bn' ? 'নতুন ফাইল' : 'New File'}</span>
            </button>

            <button
              onClick={onOpenCreateFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
              title={lang === 'bn' ? 'নতুন ফোল্ডার তৈরি করুন' : 'Create new folder'}
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'bn' ? 'নতুন ফোল্ডার' : 'New Folder'}</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 transition cursor-pointer"
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
        </div>

        {/* Batch Actions Group */}
        <div className="flex items-center gap-2 flex-wrap">
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

          {/* BULK DELETE */}
          {!isTrashTab ? (
            <button
              onClick={onBatchDelete}
              disabled={selectedCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-bold border border-red-800/60 transition disabled:opacity-40 cursor-pointer"
              title={lang === 'bn' ? 'নির্বাচিত ফাইল রিসাইকেল বিনে পাঠান' : 'Batch delete selected files'}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>
                {selectedCount > 0
                  ? (lang === 'bn' ? `ডিলিট (${selectedCount})` : `Delete (${selectedCount})`)
                  : (lang === 'bn' ? 'ডিলিট' : 'Batch Delete')}
              </span>
            </button>
          ) : (
            /* Trash Actions */
            <div className="flex gap-2">
              <button
                onClick={onRestoreAllTrash}
                disabled={totalFilteredFiles === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold border border-emerald-800/60 transition disabled:opacity-40 cursor-pointer"
              >
                <ArchiveRestore className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'সব রিস্টোর করুন' : 'Restore All'}</span>
              </button>

              <button
                onClick={onEmptyTrash}
                disabled={totalFilteredFiles === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-200 text-xs font-bold border border-red-800 transition disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ট্র্যাশ খালি করুন' : 'Empty Trash'}</span>
              </button>
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
        </div>
      </div>

      {/* Category Pills & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => onCategoryChange(cat.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition ${selectedCategory === cat.key ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              {lang === 'bn' ? cat.labelBn : cat.labelEn}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'bn' ? 'সর্ট:' : 'Sort:'}</span>
          <select
            value={sortBy}
            onChange={e => onSortByChange(e.target.value as 'date' | 'name' | 'size')}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-400"
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
