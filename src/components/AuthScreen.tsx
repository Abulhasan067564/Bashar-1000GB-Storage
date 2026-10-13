import React, { useState, useRef } from 'react';
import { UserAccount, SiteSettings } from '../types/storage';
import { 
  isSameEmailOrPhone, 
  isEmail, 
  isPhoneNumber, 
  getNormalizedAccountIdentifier 
} from '../utils/accountValidation';
import { 
  removeDeletedUserId,
  saveUserToFirestore,
  findUserInFirestore 
} from '../services/firebase';
import { 
  Cloud, 
  User, 
  KeyRound, 
  Sparkles, 
  Languages, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload, 
  HelpCircle,
  Eye,
  EyeOff,
  Calendar,
  Camera,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { YouTubeBanner } from './YouTubeBanner';

interface AuthScreenProps {
  usersList: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onUpdateUsersList: (users: UserAccount[]) => void;
  siteSettings?: SiteSettings;
  lang: 'bn' | 'en';
  onToggleLang: () => void;
  onOpenAdminLogin?: () => void;
}

const PRESET_LOGOS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80'
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  usersList,
  onLoginSuccess,
  onUpdateUsersList,
  siteSettings,
  lang,
  onToggleLang,
  onOpenAdminLogin
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [customLogo, setCustomLogo] = useState('');
  const [secretName, setSecretName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const inputClean = emailOrPhone.trim();
    if (!inputClean) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে ইমেইল বা ফোন নম্বর দিন।' : 'Please enter email or phone.');
      return;
    }

    setIsLoggingIn(true);

    try {
      // 1. First look in local users list
      let user = usersList.find(u => isSameEmailOrPhone(u.emailOrPhone, inputClean));

      // 2. If not found locally (e.g. account created on another computer/browser/phone), check Firestore Cloud!
      if (!user) {
        const cloudUser = await findUserInFirestore(inputClean);
        if (cloudUser) {
          user = cloudUser;
          // Merge to local usersList and cache so this device now knows about it
          const updated = [...usersList.filter(u => u.id !== cloudUser.id), cloudUser];
          onUpdateUsersList(updated);
        }
      }

      if (!user) {
        setError(
          lang === 'bn' 
            ? 'এই ইমেইল বা মোবাইল নম্বরের কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে সঠিক তথ্য দিন অথবা নতুন অ্যাকাউন্ট খুলুন।' 
            : 'No account found with this email or phone. Please check or sign up.'
        );
        setIsLoggingIn(false);
        return;
      }

      if (user.status === 'disabled') {
        setError(
          lang === 'bn'
            ? 'আপনার অ্যাকাউন্টটি প্রশাসক দ্বারা সাময়িকভাবে নিষ্ক্রিয় করা হয়েছে। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।'
            : 'Your account has been disabled by the administrator. Please contact admin.'
        );
        setIsLoggingIn(false);
        return;
      }

      if (user.passwordHash !== password) {
        setError(lang === 'bn' ? 'ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।' : 'Incorrect password!');
        setIsLoggingIn(false);
        return;
      }

      setIsLoggingIn(false);
      onLoginSuccess(user);
    } catch (err) {
      console.warn('Login lookup notice:', err);
      setIsLoggingIn(false);
      setError(lang === 'bn' ? 'লগইনে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Login failed. Please try again.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const inputClean = emailOrPhone.trim();

    if (!inputClean || !password.trim() || !secretName.trim()) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে সকল প্রয়োজনীয় তথ্য পূরণ করুন।' : 'Please fill all required fields.');
      return;
    }

    // Identify if valid email or valid phone
    const isInputEmail = isEmail(inputClean);
    const isInputPhone = isPhoneNumber(inputClean);

    if (!isInputEmail && !isInputPhone) {
      setError(
        lang === 'bn'
          ? 'অনুগ্রহ করে সঠিক ইমেইল ঠিকানা (যেমন user@gmail.com) অথবা সঠিক মোবাইল নম্বর (যেমন 017xxxxxxxx) লিখুন।'
          : 'Please enter a valid email address (e.g. user@gmail.com) or a valid mobile number (e.g. 017xxxxxxxx).'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // STRICT CHECK: Ensure same email or same phone cannot be registered more than once
      // Check locally first
      let existing = usersList.find(u => isSameEmailOrPhone(u.emailOrPhone, inputClean));
      
      // Also check Firestore cloud in case created from another device or website URL
      if (!existing) {
        existing = (await findUserInFirestore(inputClean)) || undefined;
      }

      if (existing) {
        setIsSubmitting(false);
        // If password matches existing account, directly log the user in!
        if (password.trim() && existing.passwordHash === password.trim()) {
          onLoginSuccess(existing);
          return;
        }

        // Otherwise auto-switch to Login tab with phone/email prefilled
        setMode('login');
        if (isInputEmail) {
          setError(
            lang === 'bn' 
              ? 'এই ইমেইল ঠিকানা দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে! অনুগ্রহ করে পাসওয়ার্ড দিয়ে সরাসরি লগইন করুন।' 
              : 'This email is already registered! Please sign in with your password.'
          );
        } else {
          setError(
            lang === 'bn' 
              ? 'এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে! অনুগ্রহ করে পাসওয়ার্ড দিয়ে সরাসরি লগইন করুন।' 
              : 'This phone number is already registered! Please sign in with your password.'
          );
        }
        return;
      }

      // Generate deterministic user ID based on phone or email
      const normalizedIdent = inputClean.replace(/[\s\-\(\)\+]/g, '').toLowerCase();
      const newUserId = 'u_' + (normalizedIdent || Date.now());

      const newUser: UserAccount = {
        id: newUserId,
        name: name.trim() || (lang === 'bn' ? 'ব্যবহারকারী' : 'User'),
        emailOrPhone: inputClean,
        secretName: secretName.trim().toLowerCase(),
        passwordHash: password,
        birthDate: birthDate.trim() || undefined,
        customLogo: customLogo.trim() || undefined,
        totalStorageBytes: 1000 * 1024 * 1024 * 1024, // 1000 GB
        status: 'active',
        role: 'user',
        createdAt: new Date().toISOString()
      };

      removeDeletedUserId(newUser.id);
      
      // GUARANTEED CLOUD WRITE: write directly to Firestore so Admin and all other browsers immediately see the new account
      await saveUserToFirestore(newUser);

      const updated = [...usersList.filter(u => u.id !== newUser.id), newUser];
      onUpdateUsersList(updated);
      setIsSubmitting(false);
      onLoginSuccess(newUser);
    } catch (err) {
      console.warn('Sign up error:', err);
      setIsSubmitting(false);
      setError(lang === 'bn' ? 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Account creation failed. Please try again.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const inputClean = emailOrPhone.trim();
    let user = usersList.find(u => isSameEmailOrPhone(u.emailOrPhone, inputClean));

    if (!user) {
      user = (await findUserInFirestore(inputClean)) || undefined;
    }

    if (!user) {
      setError(lang === 'bn' ? 'এই একাউন্টটি খুঁজে পাওয়া যায়নি।' : 'Account not found.');
      return;
    }

    if (user.secretName.trim().toLowerCase() !== secretName.trim().toLowerCase()) {
      setError(lang === 'bn' ? 'সিক্রেট নাম মেলেনি! সঠিক সিক্রেট নাম লিখুন।' : 'Secret name did not match!');
      return;
    }

    if (newPassword.length < 4) {
      setError(lang === 'bn' ? 'নতুন পাসওয়ার্ড ন্যূনতম ৪ অক্ষরের হতে হবে।' : 'Password must be at least 4 characters.');
      return;
    }

    const updatedUser = { ...user, passwordHash: newPassword };
    await saveUserToFirestore(updatedUser);

    const updated = usersList.map(u => (u.id === user.id ? updatedUser : u));
    onUpdateUsersList(updated);
    setSuccess(lang === 'bn' ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! এখন লগইন করুন।' : 'Password updated successfully! You can login now.');
    setTimeout(() => {
      setSuccess(null);
      setPassword(newPassword);
      setMode('login');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {siteSettings?.siteLogoUrl ? (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden border border-cyan-400/50 shadow-lg shadow-cyan-500/20 bg-slate-900 shrink-0">
              <img
                src={siteSettings.siteLogoUrl}
                alt={siteSettings.siteName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20 shrink-0">
              <Cloud className="w-6 h-6 stroke-[2.5]" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-white">
                {siteSettings?.siteName || 'Bashar'}
              </span>
              <span className="px-1.5 py-0.5 text-xs font-black tracking-wide rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 uppercase shadow-sm">
                {siteSettings?.siteBadge || '1000GB'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              {lang === 'bn' ? (siteSettings?.taglineBn || '১ টেরাবাইট হাই-স্পিড ক্লাউড ভল্ট') : (siteSettings?.taglineEn || '1 TB Ultra-Fast Cloud Vault')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAdminLogin && (
            <button
              onClick={onOpenAdminLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900/70 text-rose-300 hover:text-white text-xs font-bold border border-rose-800/80 transition cursor-pointer shadow-sm shadow-rose-950"
              title={lang === 'bn' ? 'অ্যাডমিন প্যানেল লগইন' : 'Admin Portal Login'}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>{lang === 'bn' ? 'অ্যাডমিন লগইন' : 'Admin Login'}</span>
            </button>
          )}

          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
          >
            <Languages className="w-4 h-4 text-cyan-400" />
            <span className="uppercase text-xs font-mono">{lang === 'bn' ? 'EN' : 'বাং'}</span>
          </button>
        </div>
      </header>

      {/* YouTube Channel Promo Banner */}
      <YouTubeBanner lang={lang} siteSettings={siteSettings} />

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-8 max-w-6xl mx-auto w-full">
        {/* Left: Branding & Feature Badges */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {lang === 'bn'
                ? `${siteSettings?.storageQuotaGb || 1000} জিবি ফ্রি ক্লাউড স্পেস`
                : `${siteSettings?.storageQuotaGb || 1000} GB Free Cloud Storage`}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {lang === 'bn' ? (
              <>
                আপনার সমস্ত ফাইল রাখুন <br />
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                  {siteSettings?.siteName || 'Bashar'} {siteSettings?.siteBadge || '1000GB'}
                </span> ক্লাউডে
              </>
            ) : (
              <>
                Store All Your Files with <br />
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                  {siteSettings?.siteName || 'Bashar'} {siteSettings?.siteBadge || '1000GB'}
                </span>
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed">
            {lang === 'bn'
              ? 'ব্যবহার শুরু করতে প্রথমে আপনার একাউন্টে লগইন করুন অথবা নতুন একাউন্ট তৈরি করুন। ড্রাইভটিতে থাকছে সব ফাইল একসাথে আপলোড, ডিলিট, জিপ ডাউনলোড ও সিক্রেট নাম দিয়ে পাসওয়ার্ড রিকভারি।'
              : 'Sign up or login to access your 1000 GB cloud space with bulk uploads, batch deletion, zip download, and secret name recovery.'}
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-left max-w-md mx-auto lg:mx-0">
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-2.5">
              <Upload className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">
                {lang === 'bn' ? 'একসাথে সব ফাইল আপলোড' : 'Single & Batch Upload'}
              </span>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-2.5">
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">
                {lang === 'bn' ? 'সব একসাথে জিপ ডাউনলোড' : 'Download All as ZIP'}
              </span>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">
                {lang === 'bn' ? 'সিক্রেট নাম দিয়ে রিকভারি' : 'Secret Name Recovery'}
              </span>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-2.5">
              <User className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">
                {lang === 'bn' ? 'কাস্টম লোগো ও জন্ম তারিখ' : 'Custom Logo & Profile'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Auth Card */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
          {/* Tabs */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="flex bg-slate-950 p-1 rounded-2xl mb-5 border border-slate-800">
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition ${mode === 'signup' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                {lang === 'bn' ? 'সাইন আপ (Sign Up)' : 'Sign Up'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition ${mode === 'login' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                {lang === 'bn' ? 'লগইন (Sign In)' : 'Sign In'}
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* FORM: SIGN UP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
              {/* CUSTOM LOGO (লোগো সেট করতে পারবে ইচ্ছামত) */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 text-center space-y-2">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lang === 'bn' ? 'লোগো বা প্রোফাইল ছবি (ঐচ্ছিক)' : 'Profile Logo (Optional)'}</span>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-cyan-400/50 bg-slate-900 shrink-0">
                    {customLogo ? (
                      <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-base">
                        {name ? name.charAt(0).toUpperCase() : 'B'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] rounded-lg transition"
                    >
                      {lang === 'bn' ? 'লোগো আপলোড' : 'Upload Logo'}
                    </button>
                    {customLogo && (
                      <button
                        type="button"
                        onClick={() => setCustomLogo('')}
                        className="text-[10px] text-red-400 hover:underline"
                      >
                        {lang === 'bn' ? 'লোগো মুছুন' : 'Remove'}
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* FULL NAME (নাম দিতে পারবে) */}
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
                    placeholder={lang === 'bn' ? 'মোঃ বাশার' : 'Bashar'}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* DATE OF BIRTH (জন্ম তারিখ দিতে পারবে) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'জন্ম তারিখ (Date of Birth)' : 'Date of Birth'}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* EMAIL OR PHONE */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'ইমেইল অথবা মোবাইল নম্বর' : 'Email or Phone'}
                </label>
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={e => setEmailOrPhone(e.target.value)}
                  placeholder="01712345678 বা user@gmail.com"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <p className="text-[10px] text-cyan-400/80 mt-1">
                  {lang === 'bn' 
                    ? '🔒 একই মোবাইল নম্বর বা ইমেইল দিয়ে শুধুমাত্র একটি অ্যাকাউন্ট খোলা যাবে।' 
                    : '🔒 Only one account can be registered per email or mobile number.'}
                </p>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* SECRET NAME FIELD */}
              <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-2xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'সিক্রেট নাম (পাসওয়ার্ড রিকভারি কোড)' : 'Secret Name (Recovery Code)'}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {lang === 'bn'
                    ? 'পাসওয়ার্ড ভুলে গেলে এই সিক্রেট নাম দিয়ে তৎক্ষণাৎ পাসওয়ার্ড পরিবর্তন করতে পারবেন।'
                    : 'If you forget password, you will use this secret name to reset it.'}
                </p>
                <input
                  type="text"
                  required
                  value={secretName}
                  onChange={e => setSecretName(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: bashar-secret বা প্রিয় নাম' : 'e.g. bashar-secret'}
                  className="w-full bg-slate-900 border border-cyan-700/60 rounded-xl px-3 py-2 text-xs sm:text-sm text-cyan-100 placeholder:text-cyan-600 focus:border-cyan-400 focus:outline-none font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 transition cursor-pointer text-xs sm:text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>{lang === 'bn' ? 'ক্লাউডে একাউন্ট তৈরি হচ্ছে...' : 'Creating Cloud Account...'}</span>
                  </>
                ) : (
                  <span>{lang === 'bn' ? '১০০০ জিবি একাউন্ট তৈরি করুন' : 'Create 1000GB Account'}</span>
                )}
              </button>
            </form>
          )}

          {/* FORM: SIGN IN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'ইমেইল অথবা মোবাইল নম্বর' : 'Email or Phone'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={e => setEmailOrPhone(e.target.value)}
                    placeholder={lang === 'bn' ? '017xxxxxxxx বা user@gmail.com' : 'email or phone'}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition"
                  >
                    {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-cyan-500/25 transition cursor-pointer text-xs sm:text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>{lang === 'bn' ? 'ক্লাউড থেকে যাচাই করা হচ্ছে...' : 'Verifying from Cloud...'}</span>
                  </>
                ) : (
                  <span>{lang === 'bn' ? 'লগইন করুন ও প্রবেশ করুন' : 'Sign In'}</span>
                )}
              </button>
            </form>
          )}

          {/* FORM: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex items-center gap-2 mb-1 text-cyan-400">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm">
                  {lang === 'bn' ? 'সিক্রেট নাম দিয়ে পাসওয়ার্ড পরিবর্তন' : 'Reset Password with Secret Name'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'bn'
                  ? 'আপনার রেজিস্টার্ড ইমেইল/নম্বর এবং একাউন্ট খোলার সময় দেওয়া গোপন সিক্রেট নামটি লিখুন।'
                  : 'Enter your registered email/phone and secret name to change your password.'}
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'ইমেইল অথবা মোবাইল নম্বর' : 'Email or Phone'}
                </label>
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={e => setEmailOrPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'আপনার গোপন সিক্রেট নাম' : 'Your Secret Name'}
                </label>
                <input
                  type="text"
                  required
                  value={secretName}
                  onChange={e => setSecretName(e.target.value)}
                  placeholder={lang === 'bn' ? 'আপনার দেওয়া সিক্রেট নাম' : 'Enter secret name'}
                  className="w-full bg-slate-950/80 border border-cyan-600/70 rounded-xl px-3 py-2 text-xs sm:text-sm text-cyan-200 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড দিন' : 'Enter new password'}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
                >
                  {lang === 'bn' ? 'ফিরে যান' : 'Back'}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 text-xs transition"
                >
                  {lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3.5 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 border-t border-slate-800/40 bg-slate-950/60">
        <div>
          Bashar 1000GB Cloud Storage • 1000 GB High Security Vault
        </div>
        {onOpenAdminLogin && (
          <button
            onClick={onOpenAdminLogin}
            className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 transition text-[11px] font-medium cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
            <span>{lang === 'bn' ? 'অ্যাডমিন সিকিউরিটি প্যানেল' : 'Admin Security Console'}</span>
          </button>
        )}
      </footer>
    </div>
  );
};
