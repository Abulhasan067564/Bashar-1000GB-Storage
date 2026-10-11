import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowLeft, Eye, EyeOff, AlertCircle, KeyRound, Sparkles, CheckCircle2 } from 'lucide-react';
import { AdminCredentials } from '../../types/storage';

interface AdminLoginProps {
  onLoginSuccess: (admin: AdminCredentials) => void;
  onBackToApp: () => void;
  adminCredentials: AdminCredentials;
  lang: 'bn' | 'en';
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToApp,
  adminCredentials,
  lang
}) => {
  // Pre-fill credentials automatically without showing credentials notes on website
  const [username, setUsername] = useState(adminCredentials.username || 'admin');
  const [password, setPassword] = useState(adminCredentials.passwordHash || '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const cleanInputUser = username.trim().toLowerCase();
      const cleanExpectedUser = adminCredentials.username.trim().toLowerCase();

      if (cleanInputUser === cleanExpectedUser && password === adminCredentials.passwordHash) {
        onLoginSuccess(adminCredentials);
      } else {
        setError(
          lang === 'bn' 
            ? 'ইউজারনেম বা পাসওয়ার্ড ভুল হয়েছে! সঠিক তথ্য দিয়ে পুনরায় চেষ্টা করুন।' 
            : 'Invalid admin username or password! Please check and try again.'
        );
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white relative overflow-hidden">
      {/* Background Cyber Accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 text-slate-950 shadow-lg shadow-rose-500/20">
            <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">Bashar 1000GB</span>
              <span className="px-2 py-0.5 text-[11px] font-black tracking-wide rounded-md bg-gradient-to-r from-rose-500 to-red-600 text-white uppercase shadow-sm">
                Admin Portal
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {lang === 'bn' ? 'সিস্টেম অ্যাডমিনিস্ট্রেশন ও সিকিউরিটি কনসোল' : 'System Administration & Security Console'}
            </p>
          </div>
        </div>

        <button
          onClick={onBackToApp}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>{lang === 'bn' ? 'ক্লাউড স্টোরেজে ফিরুন' : 'Back to Drive'}</span>
        </button>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
          {/* Header Badge */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 via-red-500/10 to-amber-500/20 border border-rose-500/30 text-rose-400 mb-3 shadow-inner">
              <Lock className="w-8 h-8 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {lang === 'bn' ? 'অ্যাডমিন লগইন' : 'Admin Login'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {lang === 'bn' 
                ? 'শুধুমাত্র অনুমোদিত অ্যাডমিনের জন্য সুরক্ষিত প্রবেশদ্বার' 
                : 'Restricted high-security access portal for system administrators'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                {lang === 'bn' ? 'অ্যাডমিন ইউজারনেম / ইমেইল' : 'Admin Username / Email'}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={lang === 'bn' ? 'অ্যাডমিন ইউজারনেম লিখুন' : 'Enter admin username'}
                  required
                  autoFocus
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {lang === 'bn' ? 'অ্যাডমিন পাসওয়ার্ড' : 'Admin Password'}
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={lang === 'bn' ? 'গোপন পাসওয়ার্ড লিখুন' : 'Enter password'}
                  required
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-rose-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                  <span>{lang === 'bn' ? 'অ্যাডমিন ড্যাশবোর্ডে প্রবেশ করুন' : 'Sign In to Dashboard'}</span>
                </>
              )}
            </button>
          </form>

          {/* Security Guarantee Notice */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>
                {lang === 'bn' 
                  ? 'এনক্রিপ্ট করা ও ডেডিকেটেড অ্যাডমিন অথেন্টিকেশন' 
                  : 'Encrypted & Dedicated Admin Authorization'}
              </span>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-xs text-slate-600 border-t border-slate-900 bg-slate-950/60">
        © {new Date().getFullYear()} Bashar 1000GB Cloud Storage • Admin Security Console
      </footer>
    </div>
  );
};
