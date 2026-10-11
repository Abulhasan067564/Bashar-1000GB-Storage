import React, { useState } from 'react';
import { StorageFile, FileCategory } from '../../types/storage';
import { FilePlus, X, FileText, Check, Code, FileCode } from 'lucide-react';

interface CreateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileCreated: (newFile: StorageFile) => void;
  ownerId: string;
  currentFolderId?: string | null;
  lang: 'bn' | 'en';
}

const TEMPLATES: { labelBn: string; labelEn: string; ext: string; category: FileCategory; defaultContent: string }[] = [
  {
    labelBn: 'নোট / টেক্সট ফাইল (.txt)',
    labelEn: 'Text Note (.txt)',
    ext: '.txt',
    category: 'document',
    defaultContent: 'আমার প্রয়োজনীয় তথ্য ও নোট:\n১. \n২. \n৩. '
  },
  {
    labelBn: 'গজল লিরিক্স ফাইল (.txt)',
    labelEn: 'Gojol Lyrics (.txt)',
    ext: '.txt',
    category: 'document',
    defaultContent: 'গজল শিরোনাম:\nগীতিকার / শিল্পী:\n\n[লিরিক্স বা কথা এখানে লিখুন]'
  },
  {
    labelBn: 'ডকুমেন্ট ফাইল (.doc)',
    labelEn: 'Document (.doc)',
    ext: '.doc',
    category: 'document',
    defaultContent: 'ডকুমেন্ট শিরোনাম:\nতারিখ: ' + new Date().toLocaleDateString() + '\n\nবিবরণ:'
  },
  {
    labelBn: 'মার্কডাউন নোট (.md)',
    labelEn: 'Markdown (.md)',
    ext: '.md',
    category: 'document',
    defaultContent: '# নতুন ডকুমেন্টস\n\n- পয়েন্ট ১\n- পয়েন্ট ২\n'
  },
  {
    labelBn: 'কোড / স্ক্রিপ্ট (.js)',
    labelEn: 'JavaScript (.js)',
    ext: '.js',
    category: 'code',
    defaultContent: '// নতুন স্ক্রিপ্ট\nfunction run() {\n  console.log("Bashar 1000GB Cloud");\n}\nrun();'
  }
];

export const CreateFileModal: React.FC<CreateFileModalProps> = ({
  isOpen,
  onClose,
  onFileCreated,
  ownerId,
  currentFolderId,
  lang
}) => {
  const [fileName, setFileName] = useState('');
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [content, setContent] = useState(TEMPLATES[0].defaultContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (idx: number) => {
    setSelectedTemplateIndex(idx);
    setContent(TEMPLATES[idx].defaultContent);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const template = TEMPLATES[selectedTemplateIndex];
    let trimmedName = fileName.trim();

    if (!trimmedName) {
      setError(lang === 'bn' ? 'দয়া করে একটি ফাইলের নাম দিন।' : 'Please enter a file name.');
      return;
    }

    // Ensure extension exists
    if (!trimmedName.includes('.')) {
      trimmedName += template.ext;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Encode text content into UTF-8 data URL
      const utf8Bytes = new TextEncoder().encode(content);
      const blob = new Blob([utf8Bytes], { type: 'text/plain;charset=utf-8' });
      const size = blob.size;

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string) || '';
        const now = new Date().toISOString();
        const newFile: StorageFile = {
          id: 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
          name: trimmedName,
          size,
          type: 'text/plain',
          category: template.category,
          dataUrl: base64Data,
          uploadedAt: now,
          updatedAt: now,
          isStarred: false,
          isEncrypted: false,
          inTrash: false,
          ownerId,
          folderId: currentFolderId || null
        };

        onFileCreated(newFile);
        setIsSubmitting(false);
        setFileName('');
        setContent(TEMPLATES[0].defaultContent);
        onClose();
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error(err);
      setError(lang === 'bn' ? 'ফাইল তৈরি করতে সমস্যা হয়েছে।' : 'Error creating file.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'bn' ? 'নতুন ফাইল তৈরি করুন' : 'Create New File'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'ড্রাইভে টেক্সট, নোট বা ডকুমেন্ট ফাইল লিখে সংরক্ষণ করুন' : 'Write and save a text, note, or document file'}
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

        {/* Modal Body */}
        <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 text-red-200 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {lang === 'bn' ? 'ফাইলের ধরন বেছে নিন:' : 'Select File Type:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((tmpl, idx) => (
                <button
                  type="button"
                  key={tmpl.ext + idx}
                  onClick={() => handleSelectTemplate(idx)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition flex items-center justify-between ${
                    selectedTemplateIndex === idx
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/50'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate">{lang === 'bn' ? tmpl.labelBn : tmpl.labelEn}</span>
                  {selectedTemplateIndex === idx && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* File Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {lang === 'bn' ? 'ফাইলের নাম:' : 'File Name:'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: প্রয়োজনীয়-নোট, গজল-তালিকা' : 'e.g. My-Notes, Gojol-List'}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition"
                autoFocus
              />
              <span className="px-3 py-2.5 bg-slate-800/80 border border-slate-700 text-cyan-400 font-mono text-xs rounded-xl flex items-center">
                {TEMPLATES[selectedTemplateIndex].ext}
              </span>
            </div>
          </div>

          {/* Content / Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'bn' ? 'ফাইলের বিষয়বস্তু / লেখা:' : 'File Content:'}
              </label>
              <span className="text-[11px] text-slate-500">
                {new Blob([new TextEncoder().encode(content)]).size} {lang === 'bn' ? 'বাইট' : 'bytes'}
              </span>
            </div>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={lang === 'bn' ? 'এখানে ফাইলের লেখা বা তথ্য লিখুন...' : 'Write your notes or content here...'}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-2xl p-3 text-xs text-slate-100 placeholder-slate-600 outline-none font-mono resize-none transition leading-relaxed"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FilePlus className="w-4 h-4" />
              <span>{isSubmitting ? (lang === 'bn' ? 'তৈরি হচ্ছে...' : 'Creating...') : (lang === 'bn' ? 'ফাইল তৈরি করুন' : 'Create File')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
