import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StorageFile } from '../types/storage';
import { FileCard } from './FileCard';
import { FileListRow } from './FileListRow';

interface VirtualizedFileListProps {
  files: StorageFile[];
  viewMode: 'grid' | 'list';
  selectedFileIds: Set<string>;
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
  onFolderContextMenu?: (folder: StorageFile, e: React.MouseEvent) => void;
  isTrash?: boolean;
  lang: 'bn' | 'en';
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
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
  onFolderContextMenu,
  isTrash = false,
  lang,
  scrollContainerRef
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const [containerWidth, setContainerWidth] = useState(1200);

  // Determine grid columns based on container width
  const columns = useMemo(() => {
    if (containerWidth < 640) return 2; // mobile: 2 cols
    if (containerWidth < 768) return 3; // sm: 3 cols
    if (containerWidth < 1024) return 3; // md: 3 cols
    if (containerWidth < 1280) return 4; // lg: 4 cols
    return 5; // xl: 5 cols
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

  const totalCount = files.length;

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
    if (!shouldVirtualize || viewMode !== 'grid') return files;
    return files.slice(gridCalculation.startIndex, gridCalculation.endIndex);
  }, [files, shouldVirtualize, viewMode, gridCalculation.startIndex, gridCalculation.endIndex]);

  const visibleListFiles = useMemo(() => {
    if (!shouldVirtualize || viewMode !== 'list') return files;
    return files.slice(listCalculation.startIndex, listCalculation.endIndex);
  }, [files, shouldVirtualize, viewMode, listCalculation.startIndex, listCalculation.endIndex]);

  return (
    <div ref={containerRef} className="w-full">
      {viewMode === 'grid' ? (
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
                  onToggleSelect={onToggleSelect}
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onShare={onShare}
                  onDelete={onDelete}
                  onToggleStar={onToggleStar}
                  onViewDetails={onViewDetails}
                  onRestore={onRestore}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {files.map(file => (
              <FileCard
                key={file.id}
                file={file}
                isSelected={selectedFileIds.has(file.id)}
                onToggleSelect={onToggleSelect}
                onPreview={onPreview}
                onDownload={onDownload}
                onShare={onShare}
                onDelete={onDelete}
                onToggleStar={onToggleStar}
                onViewDetails={onViewDetails}
                onRestore={onRestore}
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
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">{lang === 'bn' ? 'ফাইল নাম' : 'File Name'}</th>
                <th className="py-3 px-4">{lang === 'bn' ? 'সাইজ' : 'Size'}</th>
                <th className="py-3 px-4 hidden md:table-cell">{lang === 'bn' ? 'আপলোড তারিখ' : 'Uploaded'}</th>
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
                  onToggleSelect={onToggleSelect}
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onShare={onShare}
                  onDelete={onDelete}
                  onToggleStar={onToggleStar}
                  onViewDetails={onViewDetails}
                  onRestore={onRestore}
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
