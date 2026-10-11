import React, { useState } from 'react';
import { StorageFile } from '../../types/storage';
import { 
  FolderInput, 
  Copy, 
  Move, 
  X, 
  Folder, 
  HardDrive, 
  Check, 
  FolderPlus, 
  ArrowRight,
  Info
} from 'lucide-react';

interface MoveCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: 'move' | 'copy';
  selectedFiles: StorageFile[];
  allFolders: StorageFile[];
  currentFolderId?: string | null;
  onExecute: (action: 'move' | 'copy', targetFolderId: string | null) => void;
  onCreateFolder?: (folderName: string) => StorageFile | null;
  lang: 'bn' | 'en';
}

export const MoveCopyModal: React.FC<MoveCopyModalProps> = ({
  isOpen,
  onClose,
  action,
  selectedFiles,
  allFolders,
  currentFolderId,
  onExecute,
  onCreateFolder,
  lang
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  if (!isOpen || selectedFiles.length === 0) return null;

  // Selected item IDs to avoid moving a folder into itself
  const selectedIds = new Set(selectedFiles.map(f => f.id));
  const validFolders = allFolders.filter(f => !selectedIds.has(f.id) && !f.inTrash);

  const isMove = action === 'move';

  const handleCreateInlineFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !onCreateFolder) return;
    const created = onCreateFolder(newFolderName.trim());
    if (created) {
      setSelectedTargetId(created.id);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleConfirm = () => {
    onExecute(action, selectedTargetId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-800 ${isMove ? 'bg-indigo-950/40' : 'bg-cyan-950/40'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isMove 
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' 
                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
            }`}>
              {isMove ? <Move className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isMove
                  ? (lang === 'bn' ? 'ফাইল মুভ করুন (Move Files)' : 'Move Files to Folder')
                  : (lang === 'bn' ? 'ফাইল কপি করুন (Copy Files)' : 'Copy Files to Folder')}
              </h3>
              <p className="text-xs text-slate-400">
                {selectedFiles.length} {lang === 'bn' ? 'টি ফাইল নির্বাচিত হয়েছে' : 'files selected'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explanation Banner */}
        <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-slate-300">
            {isMove ? (
              lang === 'bn' 
                ? 'মুভ করার পর ফাইলগুলো নির্বাচিত ফোল্ডারের ভিতরে চলে যাবে এবং বাইরের মূল জায়গা থেকে সরে যাবে।'
                : 'Selected files will be moved inside the target folder and removed from their current location.'
            ) : (
              lang === 'bn'
                ? 'কপি করার পর একটি হুবহু কপি ফোল্ডারের ভিতরে যাবে, এবং বর্তমান ফাইলের মূল কপিটি বাইরে অক্ষত থাকবে।'
                : 'A duplicate will be created inside the target folder, while your original files remain intact.'
            )}
          </p>
        </div>

        {/* Body / Folder Selector */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Target destination folder list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'bn' ? 'গন্তব্য ফোল্ডার বেছে নিন:' : 'Select Target Destination:'}
              </label>

              {onCreateFolder && !isCreatingFolder && (
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition font-medium"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'নতুন ফোল্ডার বানান' : 'New Folder'}</span>
                </button>
              )}
            </div>

            {/* Inline create folder */}
            {isCreatingFolder && (
              <form onSubmit={handleCreateInlineFolder} className="mb-3 p-3 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder={lang === 'bn' ? 'নতুন ফোল্ডারের নাম...' : 'New folder name...'}
                    className="flex-1 bg-slate-900 border border-slate-800 text-xs px-3 py-1.5 rounded-lg text-white outline-none focus:border-amber-400"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
                  >
                    {lang === 'bn' ? 'যোগ করুন' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}
                    className="px-2 py-1.5 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {/* Root Drive option */}
              <button
                type="button"
                onClick={() => setSelectedTargetId(null)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition ${
                  selectedTargetId === null
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>{lang === 'bn' ? 'মূল ড্রাইভ (Root Drive / বাইরে)' : 'Root Drive (Root / Top Level)'}</span>
                </div>
                {selectedTargetId === null && <Check className="w-4 h-4 text-cyan-400" />}
              </button>

              {/* Folders List */}
              {validFolders.map(folder => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedTargetId(folder.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition ${
                    selectedTargetId === folder.id
                      ? 'bg-amber-500/15 border-amber-400 text-amber-200 ring-1 ring-amber-400/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Folder className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400/20" />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  {selectedTargetId === folder.id && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                </button>
              ))}

              {validFolders.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                  {lang === 'bn' ? 'এখনো কোনো ফোল্ডার নেই। উপরে "নতুন ফোল্ডার বানান" ক্লিক করে এখনই তৈরি করতে পারেন।' : 'No custom folders yet. Click "New Folder" above to create one.'}
                </div>
              )}
            </div>
          </div>

          {/* List of files being moved/copied */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              {lang === 'bn' ? 'নির্বাচিত ফাইলসমূহ:' : 'Selected Files:'}
            </label>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 max-h-32 overflow-y-auto space-y-1">
              {selectedFiles.map(f => (
                <div key={f.id} className="text-[11px] text-slate-300 truncate flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition"
          >
            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-2 cursor-pointer ${
              isMove
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/30'
            }`}
          >
            {isMove ? <Move className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>
              {isMove
                ? (lang === 'bn' ? 'এখানে মুভ করুন (Move Here)' : 'Move Here')
                : (lang === 'bn' ? 'এখানে কপি করুন (Copy Here)' : 'Copy Here')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
