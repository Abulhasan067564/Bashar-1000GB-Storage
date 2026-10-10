import React from 'react';
import { ViewMode, FileCategory, ActiveTab } from '../types/storage';
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
  Sparkles
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
    <div className="bg-slate-900/40 border-b border-slate-800 p-4 space-y-3">
      {/* Top Row: Batch Selection & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Selection & Count */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSelectAll}
            disabled={totalFilteredFiles === 0}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition disabled:opacity-40"
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
                    ? (lang === 'bn' ? `সব একসাথে ডাউনলোড (${selectedCount})` : `Download Selected (${selectedCount})`)
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
              title={lang === 'bn' ? 'নির্বাচিত সব ফাইল একসাথে ডিলিট করুন' : 'Batch delete selected files'}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>
                {selectedCount > 0
                  ? (lang === 'bn' ? `সব একসাথে ডিলিট (${selectedCount})` : `Delete Selected (${selectedCount})`)
                  : (lang === 'bn' ? 'সব একসাথে ডিলিট' : 'Batch Delete')}
              </span>
            </button>
          ) : (
            /* Trash Actions */
            <div className="flex gap-2">
              <button
                onClick={onRestoreAllTrash}
                disabled={totalFilteredFiles === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold border border-emerald-800/60 transition disabled:opacity-40"
              >
                <ArchiveRestore className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'সব রিস্টোর করুন' : 'Restore All'}</span>
              </button>

              <button
                onClick={onEmptyTrash}
                disabled={totalFilteredFiles === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-200 text-xs font-bold border border-red-800 transition disabled:opacity-40"
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

      {/* Bottom Row: Category Filters & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
        {/* Category Pills */}
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
