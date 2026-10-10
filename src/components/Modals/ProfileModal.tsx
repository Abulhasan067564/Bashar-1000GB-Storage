import React, { useState, useRef } from 'react';
import { UserAccount } from '../../types/storage';
import { 
  User, 
  Calendar, 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  X, 
  Check, 
  Sparkles, 
  Camera,
  ShieldCheck
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onUpdateUser: (updatedUser: UserAccount) => void;
  onDeleteAccount: () => void;
  lang: 'bn' | 'en';
}

const PRESET_LOGOS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&auto=format&fit=crop&q=80'
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onDeleteAccount,
  lang
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [birthDate, setBirthDate] = useState(currentUser.birthDate || '');
  const [customLogo, setCustomLogo] = useState(currentUser.customLogo || '');
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন।' : 'Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCustomLogo(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(lang === 'bn' ? 'নাম খালি রাখা যাবে না।' : 'Name cannot be empty.');
      return;
    }

    const updated: UserAccount = {
      ...currentUser,
      name: name.trim(),
      birthDate: birthDate.trim() || undefined,
      customLogo: customLogo.trim() || undefined
    };

    onUpdateUser(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">
              {lang === 'bn' ? 'প্রোফাইল ও লোগো সেটিংস' : 'Profile & Logo Settings'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'লোগো, নাম ও জন্ম তারিখ আপডেট করুন' : 'Customize your logo, name & date of birth'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* CUSTOM LOGO SECTION (লোগো সেট করতে পারবে ইচ্ছামত) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'bn' ? 'ইচ্ছামত লোগো সেট করুন' : 'Custom Profile Logo'}</span>
            </div>

            {/* Logo Preview */}
            <div className="relative inline-block mx-auto">
              {customLogo ? (
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 mx-auto">
                  <img
                    src={customLogo}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-cyan-500/20 mx-auto">
                  {name.charAt(0).toUpperCase() || 'B'}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ছবি আপলোড করুন' : 'Upload Image'}</span>
              </button>

              {customLogo && (
                <button
                  type="button"
                  onClick={() => setCustomLogo('')}
                  className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 font-semibold text-xs rounded-xl border border-red-800/60 flex items-center gap-1 transition"
                  title="Remove logo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'মুছুন' : 'Remove'}</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>

            {/* Quick Preset Logos */}
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5">
                {lang === 'bn' ? 'অথবা রেডিমেড লোগো নির্বাচন করুন:' : 'Or pick a preset logo:'}
              </p>
              <div className="flex items-center justify-center gap-2">
                {PRESET_LOGOS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCustomLogo(url)}
                    className="w-7 h-7 rounded-lg overflow-hidden border border-slate-700 hover:border-cyan-400 transition hover:scale-110"
                  >
                    <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* NAME FIELD (নাম দিতে পারবে) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {lang === 'bn' ? 'আপনার নাম' : 'Full Name'}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={lang === 'bn' ? 'আপনার নাম লিখুন' : 'Enter your name'}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* DATE OF BIRTH FIELD (জন্ম তারিখ দিতে পারবে) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {lang === 'bn' ? 'জন্ম তারিখ' : 'Date of Birth'}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Account Details info */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>{lang === 'bn' ? 'ইমেইল/নম্বর:' : 'Email/Phone:'}</span>
              <span className="text-slate-200 font-mono">{currentUser.emailOrPhone}</span>
            </div>
            <div className="flex justify-between">
              <span>{lang === 'bn' ? 'সিক্রেট নাম:' : 'Secret Name:'}</span>
              <span className="text-cyan-400 font-mono">{currentUser.secretName}</span>
            </div>
          </div>

          {/* DANGER ZONE: DELETE ACCOUNT (একাউন্ট মুছে ফেলুন) */}
          <div className="bg-red-950/25 border border-red-900/50 rounded-2xl p-3.5 space-y-2">
            {!isConfirmingDelete ? (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-300">
                    {lang === 'bn' ? 'একাউন্ট মুছে ফেলুন' : 'Delete Account'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'bn' ? 'একাউন্ট ও সংরক্ষিত সব ফাইল স্থায়ীভাবে ডিলিট হবে' : 'Permanently remove your account and all files'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {lang === 'bn' ? 'একাউন্ট ডিলিট' : 'Delete'}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 animate-in fade-in">
                <p className="text-xs font-semibold text-red-200 leading-relaxed">
                  ⚠️ {lang === 'bn' 
                    ? 'আপনি কি নিশ্চিতভাবে এই একাউন্ট এবং এর সমস্ত ১০০০ জিবি স্টোরেজ ফাইল স্থায়ীভাবে মুছে ফেলতে চান?' 
                    : 'Are you sure you want to permanently delete this account and all uploaded files?'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                  >
                    {lang === 'bn' ? 'না, বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmingDelete(false);
                      onDeleteAccount();
                    }}
                    className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-md transition cursor-pointer"
                  >
                    {lang === 'bn' ? 'হ্যাঁ, স্থায়ীভাবে মুছুন' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Save */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition cursor-pointer"
            >
              {lang === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
