import React, { useState, useMemo } from 'react';
import { StorageFile } from '../../types/storage';
import { 
  Edit3, 
  X, 
  Check, 
  Folder, 
  File, 
  AlertCircle, 
  ArrowRight, 
  Hash, 
  Type, 
  Search, 
  Sliders, 
  FileText,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export type RenameMode = 'prefix_suffix' | 'numbering' | 'find_replace' | 'case_format';

interface BatchRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: StorageFile[];
  onBatchRenameSubmit: (renamedList: { id: string; newName: string }[]) => Promise<void> | void;
  lang: 'bn' | 'en';
}

export const BatchRenameModal: React.FC<BatchRenameModalProps> = ({
  isOpen,
  onClose,
  files,
  onBatchRenameSubmit,
  lang
}) => {
  const [activeMode, setActiveMode] = useState<RenameMode>('prefix_suffix');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preserveExtension, setPreserveExtension] = useState(true);

  // Mode 1: Prefix & Suffix
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');

  // Mode 2: Numbering
  const [numberingType, setNumberingType] = useState<'keep_name' | 'custom_name'>('keep_name');
  const [customBaseName, setCustomBaseName] = useState('File');
  const [numberFormat, setNumberFormat] = useState<'_num' | '-num' | 'paren' | 'bracket' | 'prefix_num'>('_num');
  const [startNumber, setStartNumber] = useState(1);
  const [paddingDigits, setPaddingDigits] = useState(2); // 01, 02...

  // Mode 3: Find & Replace
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [replaceAll, setReplaceAll] = useState(true);

  // Mode 4: Case & Format
  const [letterCase, setLetterCase] = useState<'keep' | 'lower' | 'upper' | 'title'>('keep');
  const [spaceHandling, setSpaceHandling] = useState<'keep' | 'hyphen' | 'underscore' | 'remove'>('keep');

  // Helper to split file name and extension
  const splitName = (name: string, isFolder: boolean) => {
    if (isFolder || !preserveExtension) {
      return { base: name, ext: '' };
    }
    const lastDot = name.lastIndexOf('.');
    if (lastDot > 0 && lastDot < name.length - 1) {
      return {
        base: name.substring(0, lastDot),
        ext: name.substring(lastDot) // includes '.'
      };
    }
    return { base: name, ext: '' };
  };

  // Helper to format numbering string
  const formatNumber = (num: number, padding: number, formatStyle: typeof numberFormat) => {
    const numStr = String(num).padStart(padding, '0');
    switch (formatStyle) {
      case '_num':
        return `_${numStr}`;
      case '-num':
        return `-${numStr}`;
      case 'paren':
        return ` (${numStr})`;
      case 'bracket':
        return ` [${numStr}]`;
      case 'prefix_num':
        return `${numStr}_`;
      default:
        return `_${numStr}`;
    }
  };

  // Helper to apply title case
  const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };

  // Compute preview for all files
  const previews = useMemo(() => {
    const results: { file: StorageFile; oldName: string; newName: string; hasError: boolean; errorMessage?: string }[] = [];
    const usedNames = new Set<string>();

    files.forEach((file, index) => {
      const { base, ext } = splitName(file.name, Boolean(file.isFolder));
      let newBase = base;

      if (activeMode === 'prefix_suffix') {
        newBase = `${prefix}${newBase}${suffix}`;
      } else if (activeMode === 'numbering') {
        const currentNum = startNumber + index;
        const formattedNum = formatNumber(currentNum, paddingDigits, numberFormat);
        if (numberingType === 'custom_name') {
          const root = customBaseName.trim() || 'File';
          if (numberFormat === 'prefix_num') {
            newBase = `${formattedNum}${root}`;
          } else {
            newBase = `${root}${formattedNum}`;
          }
        } else {
          if (numberFormat === 'prefix_num') {
            newBase = `${formattedNum}${newBase}`;
          } else {
            newBase = `${newBase}${formattedNum}`;
          }
        }
      } else if (activeMode === 'find_replace') {
        if (findText) {
          try {
            const flags = (isCaseSensitive ? '' : 'i') + (replaceAll ? 'g' : '');
            // escape regex special chars in findText
            const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedFind, flags);
            newBase = newBase.replace(regex, replaceText);
          } catch {
            newBase = newBase.split(findText).join(replaceText);
          }
        }
      } else if (activeMode === 'case_format') {
        if (letterCase === 'lower') {
          newBase = newBase.toLowerCase();
        } else if (letterCase === 'upper') {
          newBase = newBase.toUpperCase();
        } else if (letterCase === 'title') {
          newBase = toTitleCase(newBase);
        }

        if (spaceHandling === 'hyphen') {
          newBase = newBase.replace(/\s+/g, '-');
        } else if (spaceHandling === 'underscore') {
          newBase = newBase.replace(/\s+/g, '_');
        } else if (spaceHandling === 'remove') {
          newBase = newBase.replace(/\s+/g, '');
        }
      }

      const finalName = `${newBase}${ext}`.trim();
      let hasError = false;
      let errorMessage: string | undefined = undefined;

      if (!finalName) {
        hasError = true;
        errorMessage = lang === 'bn' ? 'নাম খালি হতে পারে না' : 'Name cannot be empty';
      } else if (/[\/\\:*?"<>|]/.test(finalName)) {
        hasError = true;
        errorMessage = lang === 'bn' ? 'অবৈধ অক্ষর (/ \\ : * ? " < > |)' : 'Invalid characters';
      } else if (usedNames.has(finalName)) {
        hasError = true;
        errorMessage = lang === 'bn' ? 'একই নামের ডুপ্লিকেট রয়েছে' : 'Duplicate name collision';
      }

      usedNames.add(finalName);
      results.push({
        file,
        oldName: file.name,
        newName: finalName,
        hasError,
        errorMessage
      });
    });

    return results;
  }, [
    files, 
    activeMode, 
    preserveExtension, 
    prefix, 
    suffix, 
    numberingType, 
    customBaseName, 
    numberFormat, 
    startNumber, 
    paddingDigits, 
    findText, 
    replaceText, 
    isCaseSensitive, 
    replaceAll, 
    letterCase, 
    spaceHandling,
    lang
  ]);

  const hasAnyErrors = previews.some(p => p.hasError);
  const totalChanged = previews.filter(p => p.oldName !== p.newName).length;

  if (!isOpen || files.length === 0) return null;

  const handleReset = () => {
    setPrefix('');
    setSuffix('');
    setCustomBaseName('File');
    setStartNumber(1);
    setPaddingDigits(2);
    setNumberFormat('_num');
    setFindText('');
    setReplaceText('');
    setLetterCase('keep');
    setSpaceHandling('keep');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasAnyErrors || totalChanged === 0) return;

    setIsSubmitting(true);
    try {
      const updates = previews
        .filter(p => p.oldName !== p.newName)
        .map(p => ({ id: p.file.id, newName: p.newName }));

      await Promise.resolve(onBatchRenameSubmit(updates));
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('Batch rename failed:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {lang === 'bn' ? 'ব্যাচ রিনেম (Batch Rename)' : 'Batch Rename Files'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[11px] font-black">
                  {files.length} {lang === 'bn' ? 'টি ফাইল' : 'files'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'bn' 
                  ? 'নির্বাচিত ফাইলগুলোর নামে প্রিফিক্স, সাফিক্স, ক্রমিক সংখ্যায়ন বা ফাইন্ড-রিপ্লেস করুন' 
                  : 'Add prefixes, suffixes, numbering sequences, or find & replace across selected files'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Renaming Mode Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
              {lang === 'bn' ? 'রিনেমের ধরণ নির্ধারণ করুন' : 'Select Renaming Strategy'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setActiveMode('prefix_suffix')}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                  activeMode === 'prefix_suffix'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400/40'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'bn' ? 'প্রিফিক্স ও সাফিক্স' : 'Prefix & Suffix'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('numbering')}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                  activeMode === 'numbering'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400/40'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Hash className="w-4 h-4 text-amber-400" />
                <span>{lang === 'bn' ? 'ক্রমিক সংখ্যায়ন (1, 2...)' : 'Numbering Sequence'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('find_replace')}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                  activeMode === 'find_replace'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400/40'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Search className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'bn' ? 'খুঁজুন ও বদলান' : 'Find & Replace'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('case_format')}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                  activeMode === 'case_format'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400/40'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Type className="w-4 h-4 text-purple-400" />
                <span>{lang === 'bn' ? 'কেস ও স্পেস ফরম্যাট' : 'Case & Formatting'}</span>
              </button>
            </div>
          </div>

          {/* Mode Configuration Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
            {/* Mode 1: Prefix & Suffix */}
            {activeMode === 'prefix_suffix' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {lang === 'bn' ? 'উপসর্গ (Prefix - নামের শুরুতে যোগ)' : 'Prefix (Add to beginning)'}
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: Project_ বা Vacation_' : 'e.g. Project_ or Photo_'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {lang === 'bn' ? 'প্রতিটি ফাইলের মূল নামের শুরুতে বসবে' : 'Appears before each original filename'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {lang === 'bn' ? 'অনুসর্গ (Suffix - নামের শেষে যোগ)' : 'Suffix (Add to end before extension)'}
                  </label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: _final বা _v2' : 'e.g. _final or _v2'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {lang === 'bn' ? 'ফাইলের এক্সটেনশনের আগে বসবে' : 'Appears right before the file extension'}
                  </span>
                </div>
              </div>
            )}

            {/* Mode 2: Numbering */}
            {activeMode === 'numbering' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="numberingType"
                      checked={numberingType === 'keep_name'}
                      onChange={() => setNumberingType('keep_name')}
                      className="accent-cyan-400 cursor-pointer"
                    />
                    <span>{lang === 'bn' ? 'মূল নাম অপরিবর্তিত রেখে নম্বর যোগ' : 'Keep original name + add number'}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="numberingType"
                      checked={numberingType === 'custom_name'}
                      onChange={() => setNumberingType('custom_name')}
                      className="accent-cyan-400 cursor-pointer"
                    />
                    <span>{lang === 'bn' ? 'নতুন অভিন্ন নাম দিয়ে ক্রমানুসারে সাজানো' : 'Replace with uniform base name'}</span>
                  </label>
                </div>

                {numberingType === 'custom_name' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {lang === 'bn' ? 'অভিন্ন মূল নাম (Base Name)' : 'Uniform Base Name'}
                    </label>
                    <input
                      type="text"
                      value={customBaseName}
                      onChange={(e) => setCustomBaseName(e.target.value)}
                      placeholder={lang === 'bn' ? 'যেমন: Invoice, Document, Photo' : 'e.g. Invoice, Document, Photo'}
                      className="w-full sm:w-1/2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {lang === 'bn' ? 'নম্বরের স্টাইল' : 'Number Style'}
                    </label>
                    <select
                      value={numberFormat}
                      onChange={(e) => setNumberFormat(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="_num">{lang === 'bn' ? 'আন্ডারস্কোর: _01, _02' : 'Underscore: _01, _02'}</option>
                      <option value="-num">{lang === 'bn' ? 'হাইফেন: -01, -02' : 'Hyphen: -01, -02'}</option>
                      <option value="paren">{lang === 'bn' ? 'বন্ধনী: (1), (2)' : 'Parentheses: (1), (2)'}</option>
                      <option value="bracket">{lang === 'bn' ? 'থার্ড ব্র্যাকেট: [01], [02]' : 'Brackets: [01], [02]'}</option>
                      <option value="prefix_num">{lang === 'bn' ? 'শুরুতে বসানো: 01_, 02_' : 'Prefix: 01_, 02_'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {lang === 'bn' ? 'শুরু নম্বর' : 'Start Number'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={startNumber}
                      onChange={(e) => setStartNumber(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {lang === 'bn' ? 'ডিজিট প্যাডিং (Padding)' : 'Padding Digits'}
                    </label>
                    <select
                      value={paddingDigits}
                      onChange={(e) => setPaddingDigits(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value={1}>{lang === 'bn' ? '১ ডিজিট (1, 2, 3...)' : '1 digit (1, 2, 3...)'}</option>
                      <option value={2}>{lang === 'bn' ? '২ ডিজিট (01, 02...)' : '2 digits (01, 02...)'}</option>
                      <option value={3}>{lang === 'bn' ? '৩ ডিজিট (001, 002...)' : '3 digits (001, 002...)'}</option>
                      <option value={4}>{lang === 'bn' ? '৪ ডিজিট (0001, 0002...)' : '4 digits (0001, 0002...)'}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 3: Find & Replace */}
            {activeMode === 'find_replace' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {lang === 'bn' ? 'যে শব্দটি খুঁজবেন (Find)' : 'Find text'}
                    </label>
                    <input
                      type="text"
                      value={findText}
                      onChange={(e) => setFindText(e.target.value)}
                      placeholder={lang === 'bn' ? 'যেমন: IMG_, Copy, v1' : 'e.g. IMG_, Copy, old'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {lang === 'bn' ? 'নতুন যা বসাবেন (Replace With)' : 'Replace with'}
                    </label>
                    <input
                      type="text"
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      placeholder={lang === 'bn' ? 'যেমন: Photo_, Final (অথবা খালি রাখুন)' : 'e.g. Photo_, Final (or leave empty)'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCaseSensitive}
                      onChange={(e) => setIsCaseSensitive(e.target.checked)}
                      className="rounded accent-cyan-400 cursor-pointer"
                    />
                    <span>{lang === 'bn' ? 'কেস সংবেদনশীল (Case sensitive)' : 'Case sensitive'}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceAll}
                      onChange={(e) => setReplaceAll(e.target.checked)}
                      className="rounded accent-cyan-400 cursor-pointer"
                    />
                    <span>{lang === 'bn' ? 'সবগুলো উপস্থিতি প্রতিস্থাপন করুন' : 'Replace all occurrences'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Mode 4: Case & Format */}
            {activeMode === 'case_format' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {lang === 'bn' ? 'অক্ষরের কেস পরিবর্তন' : 'Change Letter Case'}
                  </label>
                  <select
                    value={letterCase}
                    onChange={(e) => setLetterCase(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="keep">{lang === 'bn' ? 'অপরিবর্তিত রাখুন' : 'Keep original case'}</option>
                    <option value="lower">{lang === 'bn' ? 'সব ছোট হাতের (lowercase)' : 'lowercase'}</option>
                    <option value="upper">{lang === 'bn' ? 'সব বড় হাতের (UPPERCASE)' : 'UPPERCASE'}</option>
                    <option value="title">{lang === 'bn' ? 'টাইটেল কেস (Title Case)' : 'Title Case'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {lang === 'bn' ? 'স্পেস পরিবর্তন' : 'Space Conversion'}
                  </label>
                  <select
                    value={spaceHandling}
                    onChange={(e) => setSpaceHandling(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="keep">{lang === 'bn' ? 'স্পেস অপরিবর্তিত রাখুন' : 'Keep spaces'}</option>
                    <option value="hyphen">{lang === 'bn' ? 'স্পেসের বদলে হাইফেন (-)' : 'Replace spaces with hyphens (-)'}</option>
                    <option value="underscore">{lang === 'bn' ? 'স্পেসের বদলে আন্ডারস্কোর (_)' : 'Replace spaces with underscores (_)'}</option>
                    <option value="remove">{lang === 'bn' ? 'স্পেস সম্পূর্ণ মুছে ফেলুন' : 'Remove spaces'}</option>
                  </select>
                </div>
              </div>
            )}

            {/* Global Options */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveExtension}
                  onChange={(e) => setPreserveExtension(e.target.checked)}
                  className="rounded accent-cyan-400 cursor-pointer"
                />
                <span>{lang === 'bn' ? 'ফাইলের এক্সটেনশন অপরিবর্তিত রাখুন (.pdf, .png ইত্যাদি নিরাপদ রাখুন)' : 'Preserve file extension (.pdf, .png etc.)'}</span>
              </label>

              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{lang === 'bn' ? 'রিসেট' : 'Reset'}</span>
              </button>
            </div>
          </div>

          {/* Conflict / Warning Notice */}
          {hasAnyErrors && (
            <div className="p-3 bg-red-950/70 border border-red-800 rounded-2xl flex items-center gap-2.5 text-xs text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                {lang === 'bn' 
                  ? 'কিছু ফাইলের নামের সাথে সাংঘর্ষিক সমস্যা বা অবৈধ অক্ষর রয়েছে। অনুগ্রহ করে রিনেম সেটিংস সংশোধন করুন।' 
                  : 'Some filenames have naming collisions or invalid characters. Please adjust your settings.'}
              </span>
            </div>
          )}

          {/* Live Preview List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {lang === 'bn' ? 'লাইভ প্রিভিউ (পরিবর্তনের ফলাফল)' : 'Live Preview'}
                </span>
                <span className="text-[11px] text-cyan-400 font-semibold">
                  ({totalChanged} {lang === 'bn' ? 'টি পরিবর্তন হবে' : 'will change'})
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                {lang === 'bn' ? 'প্রয়োগ করার আগেই ফলাফল দেখে নিন' : 'Verify new names before applying'}
              </span>
            </div>

            <div className="border border-slate-800 rounded-2xl bg-slate-950/50 overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-800/60">
              {previews.map((item, idx) => {
                const isModified = item.oldName !== item.newName;
                return (
                  <div 
                    key={item.file.id} 
                    className={`p-2.5 px-3.5 flex items-center justify-between gap-3 text-xs transition ${
                      item.hasError ? 'bg-red-950/20' : isModified ? 'bg-cyan-950/10 hover:bg-cyan-950/20' : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-slate-500 w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      {item.file.isFolder ? (
                        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <File className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                      <span className="text-slate-400 truncate max-w-[200px] sm:max-w-[260px]" title={item.oldName}>
                        {item.oldName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span className={`font-semibold truncate max-w-[220px] sm:max-w-[300px] ${
                        item.hasError ? 'text-red-400' : isModified ? 'text-cyan-300' : 'text-slate-500'
                      }`} title={item.newName}>
                        {item.newName}
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {item.hasError ? (
                        <span className="px-2 py-0.5 rounded-md bg-red-900/40 text-red-300 border border-red-700/60 text-[10px] font-bold">
                          {item.errorMessage}
                        </span>
                      ) : isModified ? (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                          {lang === 'bn' ? 'পরিবর্তিত' : 'Changed'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-500 text-[10px]">
                          {lang === 'bn' ? 'অপরিবর্তিত' : 'Unchanged'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400 hidden sm:block">
            {lang === 'bn' 
              ? `${files.length} টির মধ্যে ${totalChanged} টি ফাইলের নাম পরিবর্তিত হবে` 
              : `${totalChanged} of ${files.length} filenames will be updated`}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || hasAnyErrors || totalChanged === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? (lang === 'bn' ? 'পরিবর্তন হচ্ছে...' : 'Renaming...')
                  : (lang === 'bn' ? `ব্যাচ রিনেম প্রয়োগ করুন (${totalChanged})` : `Apply Batch Rename (${totalChanged})`)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
