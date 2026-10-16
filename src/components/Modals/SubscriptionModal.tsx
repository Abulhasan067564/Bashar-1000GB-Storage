import React, { useState } from 'react';
import { 
  Crown, 
  CheckCircle2, 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Clock, 
  Gift, 
  KeyRound,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { UserAccount, SiteSettings } from '../../types/storage';
import { SECRET_PROMO_CODE, getTrialStatus, toBengaliDigits } from '../../utils/bengaliNaming';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  siteSettings?: SiteSettings;
  onUnlockLifetime: (method: 'promo' | 'bkash' | 'nagad', trxId?: string) => Promise<void> | void;
  lang: 'bn' | 'en';
  isForceLocked?: boolean; // True if trial has expired and user cannot close without paying/promo
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  siteSettings,
  onUnlockLifetime,
  lang,
  isForceLocked = false
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const trial = getTrialStatus(currentUser);
  const bkashNumber = siteSettings?.bkashNumber || '01890342371';
  const nagadNumber = siteSettings?.nagadNumber || '01890342371';
  const fee = siteSettings?.subscriptionFee || 100;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Handle Promo Code application
  const handleApplyPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const code = promoCodeInput.trim();
    if (!code) {
      setErrorMessage(lang === 'bn' ? 'অনুগ্রহ করে প্রোমো কোড লিখুন।' : 'Please enter a promo code.');
      return;
    }

    if (code === SECRET_PROMO_CODE) {
      setIsSubmitting(true);
      try {
        await onUnlockLifetime('promo');
        setSuccessMessage(
          lang === 'bn' 
            ? 'অভিনন্দন! প্রোমো কোড সফলভাবে কার্যকর হয়েছে। আপনার অ্যাকাউন্টটি আজীবনের জন্য আনলক হয়েছে!' 
            : 'Congratulations! Secret promo code applied. Lifetime access unlocked!'
        );
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (err) {
        setErrorMessage(lang === 'bn' ? 'আনলক করতে সমস্যা হয়েছে।' : 'Failed to apply promo code.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setErrorMessage(
        lang === 'bn' 
          ? 'ভুল প্রোমো কোড! সঠিক প্রোমো কোড দিন।' 
          : 'Invalid promo code. Please enter a valid code.'
      );
    }
  };

  // Handle bKash / Nagad Send Money submission
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!senderNumber.trim() || senderNumber.trim().length < 11) {
      setErrorMessage(
        lang === 'bn' 
          ? 'অনুগ্রহ করে সঠিক বিকাশ/নগদ প্রেরক নম্বর (১১ ডিজিট) দিন।' 
          : 'Please enter a valid 11-digit sender phone number.'
      );
      return;
    }

    if (!trxId.trim() || trxId.trim().length < 6) {
      setErrorMessage(
        lang === 'bn' 
          ? 'অনুগ্রহ করে সঠিক ট্রানজেকশন আইডি (TrxID) দিন।' 
          : 'Please enter a valid Transaction ID (TrxID).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onUnlockLifetime(selectedMethod, `${senderNumber.trim()} | TrxID: ${trxId.trim().toUpperCase()}`);
      setSuccessMessage(
        lang === 'bn' 
          ? 'ধন্যবাদ! আপনার ১০০ টাকা সেন্ড মানি সফলভাবে নিশ্চিত হয়েছে। আপনার অ্যাকাউন্টটি আজীবনের জন্য আজীবন আনলক হয়ে গেছে!' 
          : 'Thank you! 100 Tk payment confirmed. Lifetime access permanently unlocked!'
      );
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setErrorMessage(lang === 'bn' ? 'পেমেন্ট সাবমিট করতে সমস্যা হয়েছে।' : 'Payment submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden my-auto">
        {/* Header Banner */}
        <div className={`px-5 py-5 border-b border-slate-800 flex items-center justify-between ${
          trial.isExpired 
            ? 'bg-gradient-to-r from-red-950 via-slate-900 to-amber-950'
            : 'bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${
              trial.isExpired 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
            }`}>
              <Crown className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{lang === 'bn' ? '১০০ টাকা আজীবন মেম্বারশিপ' : '100 Tk Lifetime Membership'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  {lang === 'bn' ? 'আজীবন' : 'Lifetime'}
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {trial.isExpired
                  ? (lang === 'bn' ? '১ মাস ফ্রি ট্রায়াল শেষ • এখনই আনলক করুন' : '1 Month Trial Expired • Unlock Now')
                  : (lang === 'bn' ? `ট্রায়াল বাকি: ${toBengaliDigits(trial.remainingDays)} দিন • যেকোনো সময় আনলক করতে পারবেন` : `${trial.remainingDays} days left in trial`)}
              </p>
            </div>
          </div>

          {!isForceLocked && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Trial Status Card */}
          <div className={`p-4 rounded-2xl border ${
            trial.isExpired
              ? 'bg-red-950/30 border-red-800/60 text-red-200'
              : 'bg-cyan-950/30 border-cyan-800/60 text-cyan-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {lang === 'bn' ? 'ব্যবহারের বর্তমান মেয়াদ:' : 'Current Usage Period:'}
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                trial.isExpired ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}>
                {trial.isExpired 
                  ? (lang === 'bn' ? 'মেয়াদ শেষ (Expired)' : 'Trial Expired') 
                  : (lang === 'bn' ? `${toBengaliDigits(trial.remainingDays)} দিন বাকি` : `${trial.remainingDays} days remaining`)}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {trial.isExpired ? (
                lang === 'bn'
                  ? 'আপনার ১ মাস (৩০ দিন) ফ্রি ট্রায়াল সম্পন্ন হয়েছে। ড্রাইভে ফাইল দেখতে, ডাউনলোড ও আপলোড করতে বিকাশ বা নগদে একবার ১০০ টাকা সেন্ড মানি করুন। জীবনে আর কখনো টাকা লাগবে না।'
                  : 'Your 30-day free trial has expired. To view, download, and upload files, please send 100 Tk once via bKash or Nagad.'
              ) : (
                lang === 'bn'
                  ? `আপনি ৩০ দিন ফ্রি ব্যবহার করতে পারবেন (এখনও ${toBengaliDigits(trial.remainingDays)} দিন বাকি আছে)। আপনি চাইলে এখনই ১০০ টাকা দিয়ে আজীবনের জন্য সম্পূর্ণ নিশ্চিন্তে আনলক করে নিতে পারেন!`
                  : `You have ${trial.remainingDays} days left in your free trial. You can upgrade anytime for lifetime access!`
              )}
            </p>
          </div>

          {/* Lifetime Promise Highlights */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{lang === 'bn' ? 'একবার ১০০ টাকা দিলে যা যা পাবেন:' : '100 Tk Lifetime Benefits:'}</span>
            </h4>
            <ul className="text-xs text-slate-300 space-y-1.5 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{lang === 'bn' ? 'একবার ১০০ টাকা দিলে সারা জীবনের লাগি দেওয়া লাগবে না' : 'Pay once, never pay again for lifetime'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{lang === 'bn' ? '১০০০ জিবি ক্লাউড স্টোরেজে সীমাহীন ফাইল আপলোড ও ডাউনলোড' : '1000 GB high-speed Cloud Storage'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{lang === 'bn' ? 'স্ক্রিন রেকর্ডার, ভয়েস রেকর্ডার ও ক্যালকুলেটর সব অ্যাক্সেস' : 'Full access to screen recorder, voice recorder & tools'}</span>
              </li>
            </ul>
          </div>

          {/* Option A: Payment Method (bKash / Nagad Send Money) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'bn' ? 'বিকাশ বা নগদে সেন্ড মানি করুন (১০০ টাকা)' : 'Send Money (100 Tk)'}</span>
              </h4>
            </div>

            {/* Method Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod('bkash')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  selectedMethod === 'bkash'
                    ? 'bg-pink-600/20 border-pink-500 text-pink-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                <span>bKash (বিকাশ)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('nagad')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  selectedMethod === 'nagad'
                    ? 'bg-orange-600/20 border-orange-500 text-orange-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>Nagad (নগদ)</span>
              </button>
            </div>

            {/* Number Copy Box */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block">
                  {selectedMethod === 'bkash' ? 'বিকাশ পার্সোনাল সেন্ড মানি নম্বর:' : 'নগদ পার্সোনাল সেন্ড মানি নম্বর:'}
                </span>
                <span className="text-base font-mono font-bold text-white tracking-wider">
                  {selectedMethod === 'bkash' ? bkashNumber : nagadNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(selectedMethod === 'bkash' ? bkashNumber : nagadNumber, selectedMethod)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedType === selectedMethod ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'কপি নম্বর' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Send Money Form */}
            <form onSubmit={handlePaymentSubmit} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    {lang === 'bn' ? 'আপনার বিকাশ/নগদ নম্বর:' : 'Sender Phone:'}
                  </label>
                  <input
                    type="text"
                    value={senderNumber}
                    onChange={e => setSenderNumber(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    {lang === 'bn' ? 'ট্রানজেকশন আইডি (TrxID):' : 'Transaction ID:'}
                  </label>
                  <input
                    type="text"
                    value={trxId}
                    onChange={e => setTrxId(e.target.value)}
                    placeholder="BL89XXXXX"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>{lang === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{lang === 'bn' ? '১০০ টাকা পেমেন্ট সাবমিট করে আজীবন আনলক করুন' : 'Confirm 100 Tk & Unlock Lifetime'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Option B: Secret Promo Code Input (প্রোমো কোড ব্যবহার করলে টাকা লাগবে না, কিন্তু কোড দেখানো যাবে না) */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-400" />
                <span>{lang === 'bn' ? 'প্রোমো কোড দিয়ে ফ্রি আনলক:' : 'Promo Code Free Unlock:'}</span>
              </span>
              <span className="text-[10px] text-slate-500">
                {lang === 'bn' ? 'কোড থাকলে বিনামূল্যে আনলক' : 'Free with code'}
              </span>
            </div>

            <form onSubmit={handleApplyPromoCode} className="flex gap-2">
              <input
                type="text"
                value={promoCodeInput}
                onChange={e => setPromoCodeInput(e.target.value)}
                placeholder={lang === 'bn' ? 'প্রোমো কোড এখানে লিখুন...' : 'Enter promo code...'}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubmitting || !promoCodeInput.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {lang === 'bn' ? 'কোড প্রয়োগ' : 'Apply'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
