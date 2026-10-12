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
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff
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
  
  // Password change state
  const [verificationMode, setVerificationMode] = useState<'old_password' | 'secret_name'>('old_password');
  const [oldPassword, setOldPassword] = useState('');
  const [enteredSecretName, setEnteredSecretName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Show / reveal current password and secret name state
  const [revealCurrentPassword, setRevealCurrentPassword] = useState(false);
  const [revealSecretName, setRevealSecretName] = useState(false);
  
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
    setError(null);

    if (!name.trim()) {
      setError(lang === 'bn' ? 'নাম খালি রাখা যাবে না।' : 'Name cannot be empty.');
      return;
    }

    // If attempting to change password
    if (newPassword.trim() || oldPassword.trim() || enteredSecretName.trim()) {
      if (!newPassword.trim()) {
        setError(lang === 'bn' ? 'অনুগ্রহ করে নতুন পাসওয়ার্ড লিখুন।' : 'Please enter a new password.');
        return;
      }

      if (newPassword.trim().length < 4) {
        setError(lang === 'bn' ? 'পাসওয়ার্ড ন্যূনতম ৪ অক্ষরের হতে হবে।' : 'Password must be at least 4 characters.');
        return;
      }

      if (newPassword !== confirmPassword) {
        setError(lang === 'bn' ? 'পাসওয়ার্ড দুটি মেলেনি! নিশ্চিতকরণ পাসওয়ার্ড চেক করুন।' : 'Passwords do not match! Please check confirmation.');
        return;
      }

      // Verification: must match either old password OR secret name
      if (verificationMode === 'old_password') {
        if (!oldPassword.trim()) {
          setError(
            lang === 'bn'
              ? 'পাসওয়ার্ড পরিবর্তন করতে আগের পাসওয়ার্ড দিন, অথবা সিক্রেট নাম দিয়ে পরিবর্তন করুন।'
              : 'Please enter your previous password, or switch to Secret Name verification.'
          );
          return;
        }

        if (currentUser.passwordHash && oldPassword.trim() !== currentUser.passwordHash) {
          setError(
            lang === 'bn'
              ? 'আগের পাসওয়ার্ড সঠিক নয়! সঠিক আগের পাসওয়ার্ড দিন অথবা সিক্রেট নাম দিয়ে পাসওয়ার্ড পরিবর্তন করুন।'
              : 'Previous password is incorrect! Enter correct password or verify with your Secret Name.'
          );
          return;
        }
      } else {
        // secret_name mode
        if (!enteredSecretName.trim()) {
          setError(
            lang === 'bn'
              ? 'পাসওয়ার্ড পরিবর্তন করতে আপনার সিক্রেট নাম লিখুন।'
              : 'Please enter your secret name to change password.'
          );
          return;
        }

        if (enteredSecretName.trim().toLowerCase() !== currentUser.secretName.trim().toLowerCase()) {
          setError(
            lang === 'bn'
              ? 'সিক্রেট নাম সঠিক নয়! একাউন্ট তৈরির সময় দেওয়া সঠিক সিক্রেট নাম লিখুন।'
              : 'Secret name does not match! Please enter the correct secret name.'
          );
          return;
        }
      }
    }

    const updated: UserAccount = {
      ...currentUser,
      name: name.trim(),
      birthDate: birthDate.trim() || undefined,
      customLogo: customLogo.trim() || undefined,
      passwordHash: newPassword.trim() ? newPassword.trim() : currentUser.passwordHash
    };

    onUpdateUser(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-100 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header - Profile Title line */}
        <div className="flex items-center gap-3.5 pb-4 mb-5 border-b border-slate-800/80">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>{lang === 'bn' ? 'ইউজার প্রোফাইল' : 'User Profile'}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                1000 GB
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'আপনার লোগো, নাম, জন্ম তারিখ এবং নিরাপত্তা তথ্য' : 'Manage your avatar, name, birth date & password'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
            <span className="text-sm">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* LINE 1: LOGO & AVATAR SETTINGS (লোগো নির্বাচন ও আপলোড) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 transition hover:border-slate-700/80">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'bn' ? '১. প্রোফাইল লোগো ও ছবি' : '1. Profile Logo & Avatar'}</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                {lang === 'bn' ? 'কাস্টম বা রেডিমেড' : 'Custom or Preset'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Logo Preview */}
              <div className="relative shrink-0">
                {customLogo ? (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-md shadow-cyan-500/20 bg-slate-950">
                    <img
                      src={customLogo}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-md shadow-cyan-500/20">
                    {name.charAt(0).toUpperCase() || 'B'}
                  </div>
                )}
              </div>

              {/* Upload & Actions */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'ছবি আপলোড করুন' : 'Upload Image'}</span>
                  </button>

                  {customLogo && (
                    <button
                      type="button"
                      onClick={() => setCustomLogo('')}
                      className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 font-semibold text-xs rounded-xl border border-red-800/60 flex items-center gap-1 transition cursor-pointer"
                      title="Remove logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'রিমুভ' : 'Remove'}</span>
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

                {/* Preset Logos Inline */}
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">
                    {lang === 'bn' ? 'রেডিমেড লোগো নির্বাচন করুন:' : 'Or choose preset:'}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {PRESET_LOGOS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCustomLogo(url)}
                        className={`w-7 h-7 rounded-lg overflow-hidden border transition hover:scale-110 cursor-pointer ${
                          customLogo === url ? 'border-cyan-400 ring-2 ring-cyan-500/50' : 'border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LINE 2: FULL NAME (নাম) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 transition hover:border-slate-700/80">
            <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'bn' ? '২. আপনার নাম' : '2. Full Name'}</span>
              <span className="text-red-400 text-xs">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={lang === 'bn' ? 'আপনার পূর্ণ নাম লিখুন' : 'Enter your full name'}
                className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none transition"
              />
            </div>
          </div>

          {/* LINE 3: DATE OF BIRTH (জন্ম তারিখ) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 transition hover:border-slate-700/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'bn' ? '৩. জন্ম তারিখ' : '3. Date of Birth'}</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {birthDate || (lang === 'bn' ? 'দেওয়া হয়নি' : 'Not set')}
              </span>
            </div>
            <div className="relative">
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 focus:border-cyan-400 focus:outline-none transition"
              />
            </div>
          </div>

          {/* LINE 4: ACCOUNT DETAILS / EMAIL / PHONE, SECRET NAME & PASSWORD (ফাইলের/প্রোফাইলের ভিতরে সিক্রেট নাম ও পাসওয়ার্ড দেখা যাবে) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'bn' ? '৪. একাউন্ট তথ্য ও নিরাপত্তা ডিটেইলস' : '4. Account Security & Details'}</span>
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-cyan-300 border border-slate-700">
                {lang === 'bn' ? 'ভিজিবল' : 'Visible'}
              </span>
            </div>

            {/* Email / Phone line */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/90 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">
                  {lang === 'bn' ? 'ইমেইল বা মোবাইল নম্বর:' : 'Email / Mobile Phone:'}
                </span>
                <span className="text-slate-100 font-mono font-semibold text-xs">{currentUser.emailOrPhone}</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md">
                {lang === 'bn' ? 'ভেরিফাইড' : 'Verified'}
              </span>
            </div>

            {/* Secret Name line (সিক্রেট নাম দেখা যাবে) */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/90 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">
                  {lang === 'bn' ? 'আপনার সিক্রেট নাম (Secret Name):' : 'Your Secret Name:'}
                </span>
                <span className="text-cyan-300 font-mono font-bold text-xs tracking-wider">
                  {revealSecretName ? currentUser.secretName : '••••••••••••'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRevealSecretName(prev => !prev)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-[11px] flex items-center gap-1 transition cursor-pointer"
                title={revealSecretName ? 'Hide' : 'Show'}
              >
                {revealSecretName ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lang === 'bn' ? 'লুকান' : 'Hide'}</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-cyan-300 font-medium">{lang === 'bn' ? 'দেখুন' : 'Show'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Current Password line (পাসওয়ার্ড কি আছে সেটাও দেখা যাবে) */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/90 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">
                  {lang === 'bn' ? 'বর্তমান পাসওয়ার্ড (Password):' : 'Current Password:'}
                </span>
                <span className="text-amber-300 font-mono font-bold text-xs tracking-wider">
                  {revealCurrentPassword ? (currentUser.passwordHash || '(কোনো পাসওয়ার্ড সেট নেই)') : '••••••••••••'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRevealCurrentPassword(prev => !prev)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-[11px] flex items-center gap-1 transition cursor-pointer"
                title={revealCurrentPassword ? 'Hide' : 'Show'}
              >
                {revealCurrentPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lang === 'bn' ? 'লুকান' : 'Hide'}</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300 font-medium">{lang === 'bn' ? 'পাসওয়ার্ড দেখুন' : 'Show'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* LINE 5: PASSWORD UPDATE SECTION (পাসওয়ার্ড পরিবর্তন: আগের পাসওয়ার্ড দিয়ে নাহলে পরিবর্তন করতে পারব না, সিগ্রেট নাম দিয়ে পরিবর্তন করতে পারব) */}
          <div className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl p-4 space-y-3 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                <KeyRound className="w-4 h-4" />
                <span>{lang === 'bn' ? '৫. পাসওয়ার্ড পরিবর্তন' : '5. Change Password'}</span>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                {lang === 'bn' ? 'প্রয়োজন হলে' : 'Optional'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {lang === 'bn' 
                ? 'পাসওয়ার্ড পরিবর্তন করতে আগের পাসওয়ার্ড দিতে হবে; আগের পাসওয়ার্ড না থাকলে সিক্রেট নাম দিয়ে পরিবর্তন করতে হবে।' 
                : 'To change password, provide your previous password or verify via secret name.'}
            </p>

            {/* Verification Method Switcher */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setVerificationMode('old_password')}
                className={`py-2 px-2 rounded-lg font-semibold transition text-center cursor-pointer ${
                  verificationMode === 'old_password'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔑 {lang === 'bn' ? 'আগের পাসওয়ার্ড দিয়ে' : 'Old Password'}
              </button>
              <button
                type="button"
                onClick={() => setVerificationMode('secret_name')}
                className={`py-2 px-2 rounded-lg font-semibold transition text-center cursor-pointer ${
                  verificationMode === 'secret_name'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🛡️ {lang === 'bn' ? 'সিক্রেট নাম দিয়ে' : 'Secret Name'}
              </button>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Verification Input */}
              {verificationMode === 'old_password' ? (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      {lang === 'bn' ? 'আগের পাসওয়ার্ড লিখুন:' : 'Enter Old Password:'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setVerificationMode('secret_name')}
                      className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                    >
                      {lang === 'bn' ? 'মনে নেই? সিক্রেট নাম দিন' : 'Forgot? Use Secret Name'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder={lang === 'bn' ? 'বর্তমান / পুরানো পাসওয়ার্ড' : 'Current / Old password'}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(p => !p)}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showOldPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {lang === 'bn' ? 'আপনার সিক্রেট নাম (Secret Name):' : 'Your Secret Name:'}
                  </label>
                  <input
                    type="text"
                    value={enteredSecretName}
                    onChange={e => setEnteredSecretName(e.target.value)}
                    placeholder={lang === 'bn' ? 'অ্যাকাউন্ট খোলার সময় দেওয়া গোপন নাম' : 'Secret name registered during signup'}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              )}

              {/* New Password Field */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'নতুন পাসওয়ার্ড:' : 'New Password:'}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড দিন (ন্যূনতম ৪ অক্ষর)' : 'Enter new password (min 4 chars)'}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(p => !p)}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Field */}
              {newPassword.length > 0 && (
                <div className="animate-in fade-in">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {lang === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন:' : 'Confirm New Password:'}
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder={lang === 'bn' ? 'আবার নতুন পাসওয়ার্ড লিখুন' : 'Re-type new password'}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* LINE 6: DANGER ZONE - DELETE ACCOUNT (একাউন্ট মুছে ফেলুন) */}
          <div className="bg-red-950/25 border border-red-900/40 rounded-2xl p-3.5 space-y-2">
            {!isConfirmingDelete ? (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>{lang === 'bn' ? '৬. একাউন্ট ডিলিট জোন' : '6. Delete Account'}</span>
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
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
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

          {/* ACTION BUTTONS (সংরক্ষণ ও বাতিল) */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition active:scale-95 cursor-pointer"
            >
              {lang === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
