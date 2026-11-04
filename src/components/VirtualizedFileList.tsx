import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Check, Search, X } from 'lucide-react';
import { StorageFile } from '../types/storage';
import { FileCard } from './FileCard';
import { FileListRow } from './FileListRow';
import { toBengaliDigits } from '../utils/bengaliNaming';

interface VirtualizedFileListProps {
  files: StorageFile[];
  viewMode: 'grid' | 'list';
  selectedFileIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll?: () => void;
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
  onRename?: (file: StorageFile) => void;
  onDropIntoFolder?: (draggedFileIds: string | string[], targetFolderId: string) => void;
  onFolderContextMenu?: (folder: StorageFile, e: React.MouseEvent) => void;
  isTrash?: boolean;
  lang: 'bn' | 'en';
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  searchQuery?: string;
  onClearSearch?: () => void;
}

// Fixed dimensions for deterministic, jump-free virtualization
const LIST_ROW_HEIGHT = 57; // 57px per table row
const GRID_ROW_HEIGHT = 228; // ~212px card height + 16px gap
const OVERSCAN_ROWS = 4; // Rows to pre-render above and below viewport

export const VirtualizedFileList: React.FC<VirtualizedFileListProps> = ({
  files,
  viewMode,
  selectedFileIds,
  onToggleSelect,
  onToggleSelectAll,
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
  lang,
  scrollContainerRef,
  searchQuery = '',
  onClearSearch
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const [containerWidth, setContainerWidth] = useState(1200);

  // Determine grid columns based on container width
  const columns = useMemo(() => {
    if (containerWidth < 440) return 1; // Narrow mobile: 1 column
    if (containerWidth < 680) return 2; // Standard mobile / phablet: 2 cols
    if (containerWidth < 1024) return 3; // Tablet / small desktop: 3 cols
    if (containerWidth < 1280) return 4; // Large desktop: 4 cols
    return 5; // Extra large desktop: 5 cols
  }, [containerWidth]);

  // Find actual scrolling element (passed ref or parent with overflow-y or window)
  const getScrollElement = useCallback((): HTMLElement | Window => {
    if (scrollContainerRef?.current) return scrollContainerRef.current;
    let parent = containerRef.current?.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return parent;
      }
      parent = parent.parentElement;
    }
    return window;
  }, [scrollContainerRef]);

  // Measure container dimensions with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateDimensions = () => {
      if (el) {
        setContainerWidth(el.clientWidth || window.innerWidth);
      }
    };
    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Track scroll position of scrolling container with requestAnimationFrame throttling
  useEffect(() => {
    const scrollEl = getScrollElement();
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (scrollEl === window) {
          const listRect = containerRef.current?.getBoundingClientRect();
          const top = listRect ? Math.max(0, -listRect.top) : 0;
          setScrollTop(top);
          setViewportHeight(window.innerHeight);
        } else {
          const el = scrollEl as HTMLElement;
          const listEl = containerRef.current;
          if (listEl) {
            const listTopInScrollEl = listEl.offsetTop;
            const currentScrollTop = el.scrollTop;
            const relativeScroll = Math.max(0, currentScrollTop - listTopInScrollEl);
            setScrollTop(relativeScroll);
            setViewportHeight(el.clientHeight || 800);
          }
        }
      });
    };

    // Initial measurement
    handleScroll();

    if (scrollEl === window) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll, { passive: true });
      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    } else {
      const el = scrollEl as HTMLElement;
      el.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll, { passive: true });
      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        el.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [getScrollElement]);

  // Real-time filter updating the view as the user types in the search input on the Navbar, filtering by file name and category
  const displayFiles = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return files;
    }

    const q = searchQuery.toLowerCase().trim();

    // Comprehensive multilingual & alias category mapping
    const categoryKeywords: Record<string, string[]> = {
      image: ['image', 'img', 'photo', 'picture', 'pic', 'ছবি', 'ইমেজ', 'ফটোগ্রাফি', 'ওয়ালপেপার', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp'],
      video: ['video', 'vid', 'movie', 'film', 'ভিডিও', 'মুভি', 'নাটক', 'ওয়াজ', 'mp4', 'mkv', 'webm', 'mov', 'avi'],
      audio: ['audio', 'music', 'sound', 'song', 'mp3', 'wav', 'অডিও', 'গান', 'সুর', 'গজল', 'রেকর্ড', 'ogg', 'm4a', 'flac'],
      document: ['document', 'doc', 'text', 'txt', 'pdf', 'word', 'sheet', 'ডকুমেন্ট', 'নথি', 'লেখা', 'বই', 'docx', 'xlsx', 'pptx', 'csv'],
      archive: ['archive', 'zip', 'rar', 'tar', '7z', 'gz', 'সংকুচিত', 'আর্কাইভ', 'জিপ'],
      code: ['code', 'script', 'programming', 'dev', 'কোড', 'সোর্স', 'html', 'js', 'ts', 'tsx', 'jsx', 'py', 'css', 'json', 'sql']
    };

    return files.filter(file => {
      // 1. File name match (real-time substring)
      if (file.name.toLowerCase().includes(q)) return true;

      // 2. Direct category match in English (e.g. "image", "video")
      if (file.category.toLowerCase().includes(q)) return true;

      // 3. Category match via aliases/Bengali terms
      for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        if (file.category === cat) {
          if (keywords.some(kw => kw.includes(q) || q.includes(kw))) {
            return true;
          }
        }
      }

      // 4. Folder keyword match
      if (file.isFolder && (q.includes('folder') || q.includes('ফোল্ডার') || q.includes('dir'))) {
        return true;
      }

      // 5. File extension match (e.g. searching 'png', 'pdf', 'mp4')
      const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
      if (ext && (ext.includes(q.replace(/^\./, '')) || q.includes(ext))) {
        return true;
      }

      // 6. Tags match
      if (file.tags && file.tags.some(t => t.toLowerCase().includes(q))) {
        return true;
      }

      return false;
    });
  }, [files, searchQuery]);

  // When search query changes, smoothly reset scroll to top so matching items are instantly visible
  useEffect(() => {
    if (searchQuery !== undefined) {
      setScrollTop(0);
      const scrollEl = getScrollElement();
      if (scrollEl && scrollEl !== window) {
        (scrollEl as HTMLElement).scrollTop = 0;
      }
    }
  }, [searchQuery, getScrollElement]);

  const totalCount = displayFiles.length;

  // Don't virtualize if very small count (< 16 items) to minimize overhead
  const shouldVirtualize = totalCount > 16;

  // Virtualization Calculations:
  // 1. Grid View Virtualization
  const gridCalculation = useMemo(() => {
    if (!shouldVirtualize || viewMode !== 'grid') {
      return {
        startRow: 0,
        endRow: Math.ceil(totalCount / columns),
        totalRows: Math.ceil(totalCount / columns),
        startIndex: 0,
        endIndex: totalCount,
        totalHeight: Math.ceil(totalCount / columns) * GRID_ROW_HEIGHT,
        topOffset: 0
      };
    }

    const totalRows = Math.ceil(totalCount / columns);
    const startRow = Math.max(0, Math.floor(scrollTop / GRID_ROW_HEIGHT) - OVERSCAN_ROWS);
    const visibleRowCount = Math.ceil(viewportHeight / GRID_ROW_HEIGHT) + (OVERSCAN_ROWS * 2);
    const endRow = Math.min(totalRows, startRow + visibleRowCount);

    const startIndex = startRow * columns;
    const endIndex = Math.min(totalCount, endRow * columns);
    const totalHeight = totalRows * GRID_ROW_HEIGHT;
    const topOffset = startRow * GRID_ROW_HEIGHT;

    return {
      startRow,
      endRow,
      totalRows,
      startIndex,
      endIndex,
      totalHeight,
      topOffset
    };
  }, [shouldVirtualize, viewMode, totalCount, columns, scrollTop, viewportHeight]);

  // 2. List View Virtualization
  const listCalculation = useMemo(() => {
    if (!shouldVirtualize || viewMode !== 'list') {
      return {
        startIndex: 0,
        endIndex: totalCount,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0
      };
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / LIST_ROW_HEIGHT) - (OVERSCAN_ROWS * 2));
    const visibleRows = Math.ceil(viewportHeight / LIST_ROW_HEIGHT) + (OVERSCAN_ROWS * 4);
    const endIndex = Math.min(totalCount, startIndex + visibleRows);

    const topSpacerHeight = startIndex * LIST_ROW_HEIGHT;
    const bottomSpacerHeight = Math.max(0, (totalCount - endIndex) * LIST_ROW_HEIGHT);

    return {
      startIndex,
      endIndex,
      topSpacerHeight,
      bottomSpacerHeight
    };
  }, [shouldVirtualize, viewMode, totalCount, scrollTop, viewportHeight]);

  // Subset of visible files
  const visibleGridFiles = useMemo(() => {
    if (!shouldVirtualize || viewMode !== 'grid') return displayFiles;
    return displayFiles.slice(gridCalculation.startIndex, gridCalculation.endIndex);
  }, [displayFiles, shouldVirtualize, viewMode, gridCalculation.startIndex, gridCalculation.endIndex]);

  const visibleListFiles = useMemo(() => {
    if (!shouldVirtualize || viewMode !== 'list') return displayFiles;
    return displayFiles.slice(listCalculation.startIndex, listCalculation.endIndex);
  }, [displayFiles, shouldVirtualize, viewMode, listCalculation.startIndex, listCalculation.endIndex]);

  return (
    <div ref={containerRef} className="w-full">
      {/* Real-time search query feedback banner */}
      {searchQuery && searchQuery.trim() && (
        <div className="mb-4 p-3 rounded-2xl bg-slate-900/90 border border-cyan-500/40 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg backdrop-blur-md animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Search className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-slate-300 font-medium">
                {lang === 'bn' ? 'রিয়েল-টাইম সার্চ ফলাফল:' : 'Real-Time Filter:'}{' '}
                <strong className="text-cyan-300 font-bold">{toBengaliDigits(totalCount)}</strong> {lang === 'bn' ? 'টি ফাইল ফিল্টার করা হয়েছে' : 'matching files'}
              </span>
              <span className="text-cyan-400 font-mono ml-1.5 text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                "{searchQuery}"
              </span>
            </div>
          </div>

          {onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="px-2.5 py-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] transition flex items-center gap-1 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
              <span>{lang === 'bn' ? 'ফিল্টার মুছুন' : 'Clear'}</span>
            </button>
          )}
        </div>
      )}

      {totalCount === 0 && searchQuery && searchQuery.trim() ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800/80 rounded-2xl bg-slate-900/30 space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-800/80 text-cyan-400">
            <Search className="w-8 h-8 opacity-70" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200">
              {lang === 'bn' ? `"${searchQuery}" এর জন্য কোনো ফাইল পাওয়া যায়নি` : `No files found for "${searchQuery}"`}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {lang === 'bn' ? 'ফাইলের নাম বা ক্যাটাগরি (ছবি, ভিডিও, অডিও, ডকুমেন্ট, কোড) দিয়ে সার্চ করুন।' : 'Try searching by file name, category (image, video, audio, doc, code) or extension.'}
            </p>
          </div>
          {onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
            >
              {lang === 'bn' ? 'সকল ফাইল দেখুন' : 'Show All Files'}
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Virtualized Grid View */
        shouldVirtualize ? (
          <div
            style={{ height: `${gridCalculation.totalHeight}px`, position: 'relative' }}
            className="w-full"
          >
            <div
              style={{
                position: 'absolute',
                top: `${gridCalculation.topOffset}px`,
                left: 0,
                right: 0,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: '1rem'
              }}
            >
              {visibleGridFiles.map(file => (
                <FileCard
                  key={file.id}
                  file={file}
                  isSelected={selectedFileIds.has(file.id)}
                  selectedFileIds={selectedFileIds}
                  onToggleSelect={onToggleSelect}
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onShare={onShare}
                  onDelete={onDelete}
                  onToggleStar={onToggleStar}
                  onViewDetails={onViewDetails}
                  onRestore={onRestore}
                  onRename={onRename}
                  onOpenFolder={onOpenFolder}
                  onQuickMove={onQuickMove}
                  onQuickCopy={onQuickCopy}
                  onDropIntoFolder={onDropIntoFolder}
                  onFolderContextMenu={onFolderContextMenu}
                  isTrash={isTrash}
                  lang={lang}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[440px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
            {displayFiles.map(file => (
              <FileCard
                key={file.id}
                file={file}
                isSelected={selectedFileIds.has(file.id)}
                selectedFileIds={selectedFileIds}
                onToggleSelect={onToggleSelect}
                onPreview={onPreview}
                onDownload={onDownload}
                onShare={onShare}
                onDelete={onDelete}
                onToggleStar={onToggleStar}
                onViewDetails={onViewDetails}
                onRestore={onRestore}
                onRename={onRename}
                onOpenFolder={onOpenFolder}
                onQuickMove={onQuickMove}
                onQuickCopy={onQuickCopy}
                onDropIntoFolder={onDropIntoFolder}
                onFolderContextMenu={onFolderContextMenu}
                isTrash={isTrash}
                lang={lang}
              />
            ))}
          </div>
        )
      ) : (
        /* Virtualized List / Table View */
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                <th className="py-3 px-4 w-10">
                  {onToggleSelectAll && (
                    <button
                      type="button"
                      onClick={onToggleSelectAll}
                      title={lang === 'bn' ? 'সব ফাইল নির্বাচন/অনির্বাচন করুন' : 'Select or deselect all'}
                      className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer border-slate-500 bg-slate-950/80 hover:border-cyan-400 hover:bg-slate-900"
                    >
                      {displayFiles.length > 0 && displayFiles.every(f => selectedFileIds.has(f.id)) ? (
                        <div className="w-full h-full bg-cyan-500 rounded-xs flex items-center justify-center text-slate-950">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : displayFiles.some(f => selectedFileIds.has(f.id)) ? (
                        <div className="w-2.5 h-2.5 bg-cyan-400 rounded-xs" />
                      ) : null}
                    </button>
                  )}
                </th>
                <th className="py-3 px-4">{lang === 'bn' ? 'ফাইল নাম' : 'File Name'}</th>
                <th className="py-3 px-4">{lang === 'bn' ? 'সাইজ' : 'Size'}</th>
                <th className="py-3 px-4 hidden md:table-cell">
                  {isTrash 
                    ? (lang === 'bn' ? 'ডিলিট করার তারিখ' : 'Deleted Date') 
                    : (lang === 'bn' ? 'আপলোড তারিখ' : 'Uploaded')}
                </th>
                <th className="py-3 px-4 text-right">{lang === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {shouldVirtualize && listCalculation.topSpacerHeight > 0 && (
                <tr style={{ height: `${listCalculation.topSpacerHeight}px` }} aria-hidden="true">
                  <td colSpan={5} className="p-0 border-0 pointer-events-none" />
                </tr>
              )}

              {visibleListFiles.map(file => (
                <FileListRow
                  key={file.id}
                  file={file}
                  isSelected={selectedFileIds.has(file.id)}
                  selectedFileIds={selectedFileIds}
                  onToggleSelect={onToggleSelect}
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onShare={onShare}
                  onDelete={onDelete}
                  onToggleStar={onToggleStar}
                  onViewDetails={onViewDetails}
                  onRestore={onRestore}
                  onRename={onRename}
                  onOpenFolder={onOpenFolder}
                  onQuickMove={onQuickMove}
                  onQuickCopy={onQuickCopy}
                  onDropIntoFolder={onDropIntoFolder}
                  onFolderContextMenu={onFolderContextMenu}
                  isTrash={isTrash}
                  lang={lang}
                />
              ))}

              {shouldVirtualize && listCalculation.bottomSpacerHeight > 0 && (
                <tr style={{ height: `${listCalculation.bottomSpacerHeight}px` }} aria-hidden="true">
                  <td colSpan={5} className="p-0 border-0 pointer-events-none" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
