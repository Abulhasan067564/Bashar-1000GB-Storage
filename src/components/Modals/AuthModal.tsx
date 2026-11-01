import React, { useState } from 'react';
import { UserAccount } from '../../types/storage';
import { Lock, User, Phone, Mail, KeyRound, HelpCircle, CheckCircle2, AlertCircle, X, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { 
  isSameEmailOrPhone, 
  matchesUserAccount,
  isEmail, 
  normalizeEmail,
  isPhoneNumber, 
  normalizePhone,
  convertBengaliDigitsToEnglish 
} from '../../utils/accountValidation';
import { removeDeletedUserId, findUserInFirestore, saveUserToFirestore } from '../../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onLoginSuccess: (user: UserAccount) => void;
  usersList: UserAccount[];
  onUpdateUsersList: (users: UserAccount[]) => void;
  lang: 'bn' | 'en';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  usersList,
  onUpdateUsersList,
  lang
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [secretName, setSecretName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawInput = emailOrPhone.trim();
    if (!rawInput) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে মোবাইল নম্বর অথবা জিমেইল দিন।' : 'Please enter mobile number or Gmail.');
      return;
    }
    if (!password) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে পাসওয়ার্ড দিন।' : 'Please enter password.');
      return;
    }

    const cleanInput = convertBengaliDigitsToEnglish(rawInput);

    // 1. Instant check in memory with dual phone/email matching
    let user = usersList.find(u => matchesUserAccount(u, cleanInput));

    // 2. Query Firestore for cloud sync (or if not found locally)
    try {
      const cloudUser = await findUserInFirestore(cleanInput);
      if (cloudUser) {
        if (user) {
          user = {
            ...user,
            ...cloudUser,
            isLifetimeUnlocked: Boolean(cloudUser.isLifetimeUnlocked || user.isLifetimeUnlocked)
          };
        } else {
          user = cloudUser;
        }
        const updated = [...usersList.filter(u => u.id !== user!.id), user];
        onUpdateUsersList(updated);
      }
    } catch (err) {
      console.warn('Login lookup notice:', err);
    }

    if (!user) {
      setError(
        lang === 'bn' 
          ? 'এই মোবাইল নম্বর বা জিমেইলের কোনো একাউন্ট পাওয়া যায়নি। প্রথমে "নতুন একাউন্ট" থেকে সাইন আপ করুন।' 
          : 'No account found with this phone or Gmail. Please sign up first.'
      );
      return;
    }

    if (user.status === 'disabled') {
      setError(
        lang === 'bn' 
          ? 'এই একাউন্টটি সাময়িকভাবে নিষ্ক্রিয় করা আছে। অ্যাডমিনের সাথে যোগাযোগ করুন।' 
          : 'This account has been disabled. Please contact admin.'
      );
      return;
    }

    if (user.passwordHash !== password) {
      setError(lang === 'bn' ? 'ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।' : 'Incorrect password!');
      return;
    }

    // Update last login
    const updatedUser = { ...user, lastLoginAt: new Date().toISOString() };
    saveUserToFirestore(updatedUser).catch(() => {});

    onLoginSuccess(updatedUser);
    onClose();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawPhone = phone.trim();
    const rawEmail = email.trim();

    // Mandatory: BOTH Phone and Gmail must be entered
    if (!rawPhone || !rawEmail) {
      setError(
        lang === 'bn' 
          ? 'অনুগ্রহ করে মোবাইল নম্বর এবং জিমেইল উভয়টি দিন।' 
          : 'Please enter both mobile number and Gmail address.'
      );
      return;
    }
    if (!password.trim()) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে পাসওয়ার্ড দিন।' : 'Please enter password.');
      return;
    }

    const cleanPhone = convertBengaliDigitsToEnglish(rawPhone);
    const cleanEmail = rawEmail.toLowerCase();

    if (!isPhoneNumber(cleanPhone)) {
      setError(
        lang === 'bn' 
          ? 'অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর লিখুন (যেমন: 017xxxxxxxx)।' 
          : 'Please enter a valid mobile number (e.g. 017xxxxxxxx).'
      );
      return;
    }

    if (!isEmail(cleanEmail)) {
      setError(
        lang === 'bn' 
          ? 'অনুগ্রহ করে একটি সঠিক জিমেইল বা ইমেইল ঠিকানা লিখুন (যেমন: user@gmail.com)।' 
          : 'Please enter a valid Gmail / Email address (e.g. user@gmail.com).'
      );
      return;
    }

    const normPhone = normalizePhone(cleanPhone);
    const normEmail = normalizeEmail(cleanEmail);

    // Check existing in local cache by phone or email
    const existingPhone = usersList.find(u => matchesUserAccount(u, normPhone));
    if (existingPhone) {
      setError(
        lang === 'bn' 
          ? 'এই মোবাইল নম্বর ইতিমধ্যে নিবন্ধিত আছে। দয়া করে লগইন করুন।' 
          : 'Mobile number already registered. Please sign in.'
      );
      return;
    }

    const existingEmail = usersList.find(u => matchesUserAccount(u, normEmail));
    if (existingEmail) {
      setError(
        lang === 'bn' 
          ? 'এই জিমেইল ঠিকানা ইতিমধ্যে নিবন্ধিত আছে। দয়া করে লগইন করুন।' 
          : 'Gmail address already registered. Please sign in.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Fast check Firestore cloud to avoid duplication across devices
      const cloudUserPhone = await findUserInFirestore(normPhone);
      if (cloudUserPhone) {
        setError(
          lang === 'bn'
            ? 'এই মোবাইল নম্বর দিয়ে ইতিমধ্যে ক্লাউডে একাউন্ট আছে। অনুগ্রহ করে লগইন করুন।'
            : 'Account with this phone already exists in cloud. Please sign in.'
        );
        setIsSubmitting(false);
        return;
      }

      const cloudUserEmail = await findUserInFirestore(normEmail);
      if (cloudUserEmail) {
        setError(
          lang === 'bn'
            ? 'এই জিমেইল দিয়ে ইতিমধ্যে ক্লাউডে একাউন্ট আছে। অনুগ্রহ করে লগইন করুন।'
            : 'Account with this Gmail already exists in cloud. Please sign in.'
        );
        setIsSubmitting(false);
        return;
      }

      const newUserId = 'u_' + normPhone;
      const cleanSecret = (secretName.trim() || name.trim() || 'bashar1000').toLowerCase();

      const newUser: UserAccount = {
        id: newUserId,
        name: name.trim() || (lang === 'bn' ? 'বাশার ইউজার' : 'Bashar User'),
        phone: normPhone,
        email: normEmail,
        emailOrPhone: normPhone,
        secretName: cleanSecret,
        birthDate: birthDate.trim() || undefined,
        passwordHash: password,
        totalStorageBytes: 1000 * 1024 * 1024 * 1024, // 1000 GB
        createdAt: new Date().toISOString(),
        status: 'active',
        role: 'user',
        isLifetimeUnlocked: false
      };

      removeDeletedUserId(newUser.id);
      const updated = [...usersList, newUser];
      onUpdateUsersList(updated);
      await saveUserToFirestore(newUser).catch(() => {});
      onLoginSuccess(newUser);
      onClose();
    } catch (err) {
      console.error('Sign up error:', err);
      setError(lang === 'bn' ? 'সাইন আপ সম্পন্ন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Sign up failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInput = convertBengaliDigitsToEnglish(emailOrPhone.trim());
    let user = usersList.find(u => matchesUserAccount(u, cleanInput));

    if (!user) {
      setIsSubmitting(true);
      try {
        const cloudUser = await findUserInFirestore(cleanInput);
        if (cloudUser) user = cloudUser;
      } finally {
        setIsSubmitting(false);
      }
    }

    if (!user) {
      setError(lang === 'bn' ? 'এই মোবাইল নম্বর বা জিমেইলের একাউন্টটি খুঁজে পাওয়া যায়নি।' : 'Account not found.');
      return;
    }

    if (user.secretName.trim().toLowerCase() !== secretName.trim().toLowerCase()) {
      setError(lang === 'bn' ? 'সিক্রেট নাম মেলেনি! একাউন্ট খোলার সময় দেওয়া সঠিক সিক্রেট নাম দিন।' : 'Secret name did not match! Please provide correct secret.');
      return;
    }

    if (newPassword.length < 4) {
      setError(lang === 'bn' ? 'নতুন পাসওয়ার্ড ন্যূনতম ৪ অক্ষরের হতে হবে।' : 'New password must be at least 4 characters.');
      return;
    }

    const updatedUser = { ...user, passwordHash: newPassword };
    const updated = usersList.map(u => u.id === user!.id ? updatedUser : u);

    onUpdateUsersList(updated);
    saveUserToFirestore(updatedUser).catch(() => {});

    setSuccess(lang === 'bn' ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করুন।' : 'Password updated successfully! Please login with your new password.');
    setTimeout(() => {
      setSuccess(null);
      setPassword(newPassword);
      setMode('login');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Bashar <span className="text-cyan-400">1000GB</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'bn' ? 'নিরাপদ ক্লাউড স্টোরেজ একাউন্ট' : 'Secure Cloud Storage Account'}
          </p>
        </div>

        {/* Tab switchers if not reset */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="flex bg-slate-800/80 p-1 rounded-xl mb-5 border border-slate-700/50">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${mode === 'login' ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'}`}
            >
              {lang === 'bn' ? 'লগইন করুন' : 'Sign In'}
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${mode === 'signup' ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'}`}
            >
              {lang === 'bn' ? 'নতুন একাউন্ট (Sign Up)' : 'Sign Up'}
            </button>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Form: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'bn' ? 'মোবাইল নম্বর অথবা জিমেইল (Phone or Gmail)' : 'Mobile Phone or Gmail'}</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={e => setEmailOrPhone(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: 017xxxxxxxx অথবা user@gmail.com' : 'e.g. 017xxxxxxxx or user@gmail.com'}
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:border-cyan-400 focus:outline-none transition"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {lang === 'bn' ? 'মোবাইল নম্বর অথবা জিমেইল এবং পাসওয়ার্ড দিয়ে লগইন করুন।' : 'Log in using either phone or Gmail with password.'}
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-300">
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
                <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:border-cyan-400 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{lang === 'bn' ? 'লগইন হচ্ছে...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <span>{lang === 'bn' ? 'লগইন করুন' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Form: SIGN UP */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {lang === 'bn' ? 'আপনার পূর্ণ নাম' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={lang === 'bn' ? 'মোঃ বাশার' : 'Bashar'}
                className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {lang === 'bn' ? 'জন্ম তারিখ (Date of Birth)' : 'Date of Birth'}
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* MOBILE NUMBER (বাধ্যতামূলক) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lang === 'bn' ? 'মোবাইল নম্বর (Phone Number)' : 'Mobile Phone Number'}</span>
                  <span className="text-red-400 font-bold">*</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-medium">{lang === 'bn' ? 'বাধ্যতামূলক' : 'Required'}</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: 017xxxxxxxx' : 'e.g. 017xxxxxxxx'}
                className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* GMAIL (বাধ্যতামূলক) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>{lang === 'bn' ? 'জিমেইল / ইমেইল (Gmail / Email)' : 'Gmail / Email'}</span>
                  <span className="text-red-400 font-bold">*</span>
                </span>
                <span className="text-[10px] text-blue-400 font-medium">{lang === 'bn' ? 'বাধ্যতামূলক' : 'Required'}</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: user@gmail.com' : 'e.g. user@gmail.com'}
                className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              />
              <p className="text-[10px] text-cyan-400/90 mt-1">
                {lang === 'bn' 
                  ? '🔒 সাইন আপে নম্বর ও জিমেইল উভয়টি দিতে হবে। পরবর্তীতে যে কোনো একটি দিয়ে লগইন করা যাবে।' 
                  : 'Both phone and Gmail are required on sign up. You can log in using either!'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* SECRET NAME */}
            <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1 text-cyan-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'সিক্রেট নাম (পাসওয়ার্ড রিকভারি কোড)' : 'Secret Name (Recovery Identifier)'}</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                {lang === 'bn'
                  ? 'পাসওয়ার্ড ভুলে গেলে এই সিক্রেট নাম দিয়ে পাসওয়ার্ড পরিবর্তন করতে পারবেন।'
                  : 'If you ever forget password, you will use this secret name to reset it.'}
              </p>
              <input
                type="text"
                required
                value={secretName}
                onChange={e => setSecretName(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: bashar-secret বা dhaka' : 'e.g. bashar-secret'}
                className="w-full bg-slate-900 border border-cyan-700/60 rounded-lg px-3 py-2 text-sm text-cyan-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{lang === 'bn' ? 'একাউন্ট তৈরি হচ্ছে...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{lang === 'bn' ? '১০০০ জিবি একাউন্ট তৈরি করুন' : 'Create 1000GB Account'}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Form: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="flex items-center gap-2 mb-2 text-cyan-400">
              <HelpCircle className="w-5 h-5" />
              <h3 className="font-semibold text-sm">
                {lang === 'bn' ? 'সিক্রেট নাম দিয়ে পাসওয়ার্ড রিসেট' : 'Reset Password with Secret Name'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'bn'
                ? 'আপনার রেজিস্টার্ড মোবাইল নম্বর অথবা জিমেইল এবং একাউন্ট খোলার সময় দেওয়া গোপন সিক্রেট নামটি লিখুন।'
                : 'Enter your registered phone or Gmail and secret name used during registration.'}
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {lang === 'bn' ? 'মোবাইল নম্বর অথবা জিমেইল' : 'Mobile Phone or Gmail'}
              </label>
              <input
                type="text"
                required
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                placeholder={lang === 'bn' ? '017xxxxxxxx বা user@gmail.com' : '017xxxxxxxx or user@gmail.com'}
                className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {lang === 'bn' ? 'আপনার সিক্রেট নাম (Secret Name)' : 'Your Secret Name'}
              </label>
              <input
                type="text"
                required
                value={secretName}
                onChange={e => setSecretName(e.target.value)}
                placeholder={lang === 'bn' ? 'আপনার দেওয়া গোপন নাম' : 'Enter secret name'}
                className="w-full bg-slate-950/70 border border-cyan-600/70 rounded-xl px-3 py-2 text-sm text-cyan-200 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {lang === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড দিন' : 'Enter new password'}
                className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 text-sm transition"
              >
                {lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
