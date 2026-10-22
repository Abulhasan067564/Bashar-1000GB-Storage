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
  AlertCircle,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { UserAccount, SiteSettings } from '../../types/storage';
import { SECRET_PROMO_CODE, getTrialStatus, toBengaliDigits } from '../../utils/bengaliNaming';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  siteSettings?: SiteSettings;
  onUnlockLifetime: (method: 'promo' | 'bkash' | 'nagad', trxId?: string) => Promise<void> | void;
  onSubmitManualPaymentRequest?: (data: {
    senderPhone: string;
    trxId: string;
    method: 'bkash' | 'nagad';
  }) => Promise<void> | void;
  lang: 'bn' | 'en';
  isForceLocked?: boolean;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  siteSettings,
  onUnlockLifetime,
  onSubmitManualPaymentRequest,
  lang,
  isForceLocked = false
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'promo'>('manual');
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad'>('bkash');

  // Manual TrxID state
  const [manualPhone, setManualPhone] = useState(
    currentUser?.pendingSenderPhone || currentUser?.emailOrPhone?.replace(/[^0-9]/g, '').slice(-11) || ''
  );
  const [manualTrxId, setManualTrxId] = useState(currentUser?.pendingTrxId || '');
  const [isManualSubmitted, setIsManualSubmitted] = useState(false);

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState('');

  // General States
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Target receiver number is 01734211584
  const targetNumber = siteSettings?.bkashNumber || '01734211584';
  const fee = siteSettings?.subscriptionFee || 100;

  if (!isOpen) return null;

  const trial = getTrialStatus(currentUser);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Handle Manual TrxID submission (অ্যাডমিন প্যানেলে জমা হবে, অ্যাডমিন অ্যাপ্রুভ দিলে আজীবন আনলক হবে)
  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanPhone = manualPhone.trim();
    if (!cleanPhone || cleanPhone.length < 11) {
      setErrorMessage(
        lang === 'bn' 
          ? 'অনুগ্রহ করে সঠিক প্রেরক বিকাশ বা নগদ নম্বর (১১ ডিজিট) দিন।' 
          : 'Please enter your 11-digit sender phone number.'
      );
      return;
    }

    const cleanTrx = manualTrxId.trim().toUpperCase();
    if (!cleanTrx || cleanTrx.length < 5) {
      setErrorMessage(
        lang === 'bn' 
          ? 'অনুগ্রহ করে সঠিক ট্রানজেকশন আইডি (TrxID) দিন।' 
          : 'Please enter a valid Transaction ID (TrxID).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmitManualPaymentRequest) {
        await onSubmitManualPaymentRequest({
          senderPhone: cleanPhone,
          trxId: cleanTrx,
          method: selectedMethod
        });
      }
      setIsManualSubmitted(true);
      setSuccessMessage(
        lang === 'bn'
          ? 'আপনার ট্রানজেকশন আইডি অ্যাডমিন প্যানেলে জমা হয়েছে! অ্যাডমিন অ্যাপ্রুভ দিলে সাথে সাথে আজীবন আনলক হবে।'
          : 'TrxID submitted to Admin Panel! Lifetime access will be granted once approved.'
      );
    } catch {
      setErrorMessage(lang === 'bn' ? 'পেমেন্ট সাবমিট করতে সমস্যা হয়েছে।' : 'Payment submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Promo Code application (Bashar2026@100gb)
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
            ? '🎉 গোপন প্রোমো কোড সফলভাবে কার্যকর হয়েছে! আপনার অ্যাকাউন্ট আজীবনের জন্য আনলক হলো।' 
            : '🎉 Promo code applied successfully! Lifetime unlocked.'
        );
        setTimeout(() => {
          onClose();
        }, 1800);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setErrorMessage(lang === 'bn' ? '❌ ভুল প্রোমো কোড! সঠিক কোড দিন।' : 'Invalid promo code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl shadow-cyan-950/40 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Decorative Top Accent Glow */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-pink-500 to-cyan-500" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 flex items-start justify-between gap-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
              <Crown className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  {lang === 'bn' ? '১০০০ জিবি ক্লাউড ড্রাইভ' : '1000 GB Cloud Drive'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black tracking-wide uppercase">
                  {lang === 'bn' ? '১০০৳ আজীবন' : '100 Tk Lifetime'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {lang === 'bn' 
                  ? 'বিকাশ বা নগদে সেন্ড মানি করে আজীবন আনলক করুন' 
                  : 'Send Money via bKash or Nagad for lifetime access'}
              </p>
            </div>
          </div>

          {!isForceLocked && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Trial / Lifetime Status Pill */}
          {trial.isLifetime ? (
            <div className="bg-emerald-950/70 border-2 border-emerald-500/60 rounded-2xl p-4 text-emerald-200 text-xs flex items-center gap-3 shadow-xl shadow-emerald-950/40">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-0.5">
                <span className="font-black text-emerald-300 block text-sm">
                  {lang === 'bn' ? '🎉 আজীবন আনলক আছে (Lifetime VIP Unlocked)!' : '🎉 Lifetime VIP Unlocked!'}
                </span>
                <span className="text-[11px] text-emerald-200/90 leading-relaxed block">
                  {lang === 'bn'
                    ? 'আপনার একাউন্ট আজীবনের জন্য আনলক আছে। ১০০ টাকা দেওয়ার পর থেকে স্থায়ীভাবে আনলক হয়েছে, জীবনে আর কখনো টাকা দেওয়া লাগবে না এবং অন্য যে কোনো ওয়েবসাইটে গিয়েও দেখালে বলবে আনলক আছে।'
                    : 'Your 1000 GB account is permanently unlocked for life. Paid once, never pay again, and verified unlocked across all websites and devices.'}
                </span>
              </div>
            </div>
          ) : trial.isExpired ? (
            <div className="bg-rose-950/70 border border-rose-500/50 rounded-2xl p-4 text-rose-200 text-xs flex items-center gap-3 shadow-lg shadow-rose-950/40 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <span className="font-bold text-rose-300 block text-sm">
                  {lang === 'bn' ? '⚠️ ১ মাসের মেয়াদ শেষ হয়েছে!' : '⚠️ 1 Month Free Trial Expired!'}
                </span>
                <span className="text-[11px] text-rose-300/80 leading-relaxed">
                  {lang === 'bn'
                    ? '১০০ টাকা বিকাশ বা নগদে সেন্ড মানি করুন। একবার দিলে জীবনের জন্য আর দিতে হবে না।'
                    : 'Send 100 Tk via bKash/Nagad. Pay once, unlocked forever.'}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {lang === 'bn' ? 'ফ্রি ট্রায়াল বাকি:' : 'Free Trial Left:'}{' '}
                  <strong className="text-white font-mono text-sm">
                    {lang === 'bn' ? `${toBengaliDigits(trial.remainingDays)} দিন` : `${trial.remainingDays} days`}
                  </strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {lang === 'bn' ? 'মোট ৩০ দিন' : '30 Days Total'}
              </span>
            </div>
          )}

          {/* Feedback Toasts (Success / Error) */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-700/80 text-rose-200 text-xs flex items-center gap-2.5 shadow-md">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-center gap-2.5 shadow-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {!trial.isLifetime && (
            <>
              {/* LIFETIME GUARANTEE BANNER: ১০০ টাকা দিলে জীবনের জন্য আর দেওয়া লাগবে না */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 border-2 border-amber-500/50 p-4 shadow-xl shadow-amber-950/30">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 shrink-0 font-black">
                    <Crown className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-white tracking-tight">
                        {lang === 'bn' 
                          ? '১০০ টাকা দিলে জীবনের জন্য আর দেওয়া লাগবে না!' 
                          : 'Pay 100 Tk Once – Never Pay Again for Life!'}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                        {lang === 'bn' ? 'আজীবন ১০০০ জিবি' : 'Lifetime 1000 GB'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                      {lang === 'bn'
                        ? 'বিকাশ বা নগদ থেকে মাত্র ১০০ টাকা সেন্ড মানি করুন। একবার দিলে জীবনের জন্য আর কখনো ১ টাকাও দেওয়া লাগবে না। ১০০০ জিবি হাই-স্পিড ক্লাউড স্টোরেজ স্থায়ীভাবে আপনার থাকবে।'
                        : 'Send 100 Tk via bKash or Nagad. Once paid, you will never have to pay again for life. 1,000 GB High-Speed Cloud Storage will permanently be yours.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* TARGET RECIPIENT NUMBER BOX (ALWAYS 01734211584) */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/90 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md ${
                    selectedMethod === 'bkash' ? 'bg-gradient-to-tr from-pink-600 to-rose-600' : 'bg-gradient-to-tr from-orange-600 to-amber-600'
                  }`}>
                    {selectedMethod === 'bkash' ? 'bKash' : 'Nagad'}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {lang === 'bn' ? 'সেন্ড মানি করার প্রাপক নাম্বার:' : 'Send Money Recipient Number:'}
                    </span>
                    <span className="text-sm sm:text-base font-mono font-black text-cyan-300 tracking-wider">
                      {targetNumber}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20">
                    {fee} ৳
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(targetNumber, 'recipient')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shadow-sm"
                    title={lang === 'bn' ? 'নাম্বার কপি করুন' : 'Copy Number'}
                  >
                    {copiedType === 'recipient' ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-cyan-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Selector: Direct Send Money vs Promo Code */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'manual'
                      ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="truncate">{lang === 'bn' ? 'সেন্ড মানি ও TrxID' : 'Send Money & TrxID'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('promo')}
                  className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'promo'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span className="truncate">{lang === 'bn' ? 'প্রোমো কোড' : 'Promo Code'}</span>
                </button>
              </div>

              {/* TAB 1: DIRECT SEND MONEY & TRXID SUBMISSION */}
              {activeTab === 'manual' && (
                <div className="space-y-4 bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 animate-in fade-in">
                  
                  {/* Pending Review Notification Card */}
                  {(currentUser.subscriptionRequestStatus === 'pending' || isManualSubmitted) ? (
                    <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 space-y-3 animate-in fade-in">
                      <div className="flex items-center gap-2.5 text-amber-300 font-bold text-xs sm:text-sm">
                        <Clock className="w-5 h-5 animate-pulse text-amber-400 shrink-0" />
                        <span>{lang === 'bn' ? '⏳ আপনার পেমেন্ট রিকোয়েস্ট পেন্ডিং আছে' : 'Payment Under Review (Pending)'}</span>
                      </div>
                      
                      <div className="text-xs text-slate-300 space-y-2 bg-slate-950/90 p-3.5 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">{lang === 'bn' ? 'প্রেরক ফোন নম্বর:' : 'Sender Phone:'}</span>
                          <span className="font-mono text-white font-bold">{currentUser.pendingSenderPhone || manualPhone}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">{lang === 'bn' ? 'ট্রানজেকশন আইডি:' : 'TrxID:'}</span>
                          <span className="font-mono text-cyan-300 font-bold text-sm tracking-wider">{currentUser.pendingTrxId || manualTrxId}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">{lang === 'bn' ? 'পদ্ধতি ও পরিমাণ:' : 'Method & Amount:'}</span>
                          <span className="font-bold text-amber-300">
                            {(currentUser.pendingMethod || selectedMethod) === 'bkash' ? 'bKash (বিকাশ)' : 'Nagad (নগদ)'} • ১০০ টাকা
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                          <span className="text-slate-400">{lang === 'bn' ? 'স্ট্যাটাস:' : 'Status:'}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {lang === 'bn' ? 'অ্যাডমিন পর্যালোচনায় আছে' : 'Pending Admin Approval'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {lang === 'bn'
                          ? 'সে সময় জমা দিবে। সে সময় অ্যাডমিন প্যানেলে যুক্ত হবে। অ্যাপ্রুভ দিলে এটা হয়ে যাবে, রিজেক্ট দিলে এটা ক্যানসেল হয়ে যাবে।'
                          : 'Submitted to Admin Panel. Lifetime access will be activated upon approval, or canceled if rejected.'}
                      </p>

                      <button
                        type="button"
                        onClick={() => { setIsManualSubmitted(false); }}
                        className="text-[11px] text-cyan-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold pt-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{lang === 'bn' ? 'পুনরায় নতুন TrxID জমা দিতে চান?' : 'Re-submit with another TrxID'}</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Previous Rejection Alert */}
                      {currentUser.subscriptionRequestStatus === 'rejected' && (
                        <div className="bg-red-950/60 border border-red-700/60 rounded-xl p-3 text-xs text-red-200 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-red-300">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>{lang === 'bn' ? 'পূর্বের TrxID বাতিল (Rejected) হয়েছে' : 'Previous TrxID Rejected'}</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            {lang === 'bn'
                              ? 'আপনার পূর্বের সাবমিট করা ট্রানজেকশন আইডি সঠিক পাওয়া যায়নি বিধায় অ্যাডমিন বাতিল করেছে। অনুগ্রহ করে সঠিক TrxID দিয়ে আবার জমা দিন।'
                              : 'Your previous TrxID was rejected by admin. Please submit the correct TrxID.'}
                          </p>
                        </div>
                      )}

                      {/* Instructions Box (Word-for-Word per User Spec) */}
                      <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2">
                        <p className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{lang === 'bn' ? 'সরাসরি অ্যাপ থেকে সেন্ড মানি করার নিয়ম:' : 'Send Money Instructions:'}</span>
                        </p>
                        <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-300">
                          <li>{lang === 'bn' ? 'আপনার বিকাশ বা নগদ অ্যাপ ওপেন করুন' : 'Open your bKash or Nagad App'}</li>
                          <li>
                            {lang === 'bn' 
                              ? <>Send Money (সেন্ড মানি) অপশনে গিয়ে প্রাপক নাম্বারে <strong className="text-cyan-300 font-mono font-bold">{targetNumber}</strong> লিখুন</>
                              : <>In Send Money, enter recipient number <strong className="text-cyan-300 font-mono">{targetNumber}</strong></>}
                          </li>
                          <li>{lang === 'bn' ? 'পরিমাণ ১০০ টাকা সেন্ড মানি করুন (একবার দিলে জীবনের জন্য আর দিতে হবে না)' : 'Send 100 Tk (Once paid, never pay again for life)'}</li>
                          <li>{lang === 'bn' ? 'সেন্ড মানি শেষে প্রাপ্ত ট্রানজেকশন আইডি (TrxID) নিচের বক্সে দিন' : 'Enter received Transaction ID (TrxID) below'}</li>
                        </ol>
                      </div>

                      {/* Method Selection */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedMethod('bkash')}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                            selectedMethod === 'bkash'
                              ? 'bg-pink-600/20 border-pink-500 text-pink-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-pink-500" />
                          <span>bKash (বিকাশ)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMethod('nagad')}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                            selectedMethod === 'nagad'
                              ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          <span>Nagad (নগদ)</span>
                        </button>
                      </div>

                      {/* Manual Form */}
                      <form onSubmit={handleManualPaymentSubmit} className="space-y-3.5 pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-slate-200 block mb-1.5 flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{lang === 'bn' ? 'প্রেরক ফোন নাম্বার:' : 'Sender Phone:'}</span>
                          </label>
                          <input
                            type="tel"
                            value={manualPhone}
                            onChange={e => setManualPhone(e.target.value)}
                            placeholder="01XXXXXXXXX"
                            required
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 font-mono focus:border-cyan-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-200 block mb-1.5 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                            <span>{lang === 'bn' ? 'ট্রানজেকশন আইডি (TrxID):' : 'Transaction ID (TrxID):'}</span>
                          </label>
                          <input
                            type="text"
                            value={manualTrxId}
                            onChange={e => setManualTrxId(e.target.value.toUpperCase())}
                            placeholder={lang === 'bn' ? 'যেমন: BL89XQW2' : 'e.g. BL89XQW2'}
                            required
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-cyan-300 font-mono font-bold uppercase placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                          />
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          {lang === 'bn'
                            ? 'সে সময় জমা দিবে। সে সময় অ্যাডমিন প্যানেলে যুক্ত হবে। অ্যাপ্রুভ দিলে এটা হয়ে যাবে, রিজেক্ট দিলে এটা ক্যানসেল হয়ে যাবে।'
                            : 'Submitted to admin panel. Will unlock once approved, or cancel if rejected.'}
                        </p>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                              <span>{lang === 'bn' ? 'জমা দেওয়া হচ্ছে...' : 'Submitting...'}</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                              <span>{lang === 'bn' ? 'TrxID জমা দিন ও আনলক করুন' : 'Submit TrxID & Unlock'}</span>
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: SECRET PROMO CODE */}
              {activeTab === 'promo' && (
                <div className="space-y-3.5 bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'bn' ? 'গোপন প্রোমো কোড:' : 'Secret Promo Code:'}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {lang === 'bn' ? '১০০% ফ্রি আজীবন আনলক' : '100% Free Lifetime'}
                    </span>
                  </div>

                  <form onSubmit={handleApplyPromoCode} className="space-y-3">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={e => setPromoCodeInput(e.target.value)}
                      placeholder={lang === 'bn' ? 'প্রোমো কোড এখানে লিখুন...' : 'Enter secret promo code...'}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none font-mono"
                    />

                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      {lang === 'bn' 
                        ? 'আপনার কাছে প্রোমো কোড থাকলে এখানে বসিয়ে কোনো টাকা ছাড়াই সাথে সাথে আজীবন আনলক করতে পারবেন।' 
                        : 'Enter secret promo code to instantly unlock without payment.'}
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'প্রোমো কোড প্রয়োগ করুন' : 'Apply Promo Code'}</span>
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
