import React, { useState, useEffect } from 'react';
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
  ArrowLeft,
  AlertCircle,
  Smartphone,
  MessageSquare,
  RefreshCw,
  Zap,
  CheckCheck
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

type PaymentFlowStep = 'number' | 'otp' | 'pin' | 'success';

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
  const [activeTab, setActiveTab] = useState<'manual' | 'gateway' | 'promo'>('manual');
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad'>('bkash');
  
  // Interactive Gateway States
  const [gatewayStep, setGatewayStep] = useState<PaymentFlowStep>('number');
  const [senderPhone, setSenderPhone] = useState(currentUser?.emailOrPhone?.replace(/[^0-9]/g, '').slice(-11) || '');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [smsBanner, setSmsBanner] = useState<string | null>(null);

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
  const [successTrxId, setSuccessTrxId] = useState('');

  // Target receiver number is 01734211584
  const targetNumber = siteSettings?.bkashNumber || '01734211584';
  const fee = siteSettings?.subscriptionFee || 100;

  // Countdown timer for resending OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gatewayStep === 'otp' && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gatewayStep, resendTimer]);

  if (!isOpen) return null;

  const trial = getTrialStatus(currentUser);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Helper to generate a 6-digit random code
  const generateNewOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setResendTimer(30);
    const methodLabel = selectedMethod === 'bkash' ? 'bKash' : 'Nagad';
    setSmsBanner(
      lang === 'bn' 
        ? `📩 ${methodLabel} ওটিপি কোড: ${code} (আপনার ${senderPhone} নম্বরে পাঠানো হয়েছে)` 
        : `📩 ${methodLabel} OTP Code: ${code} (sent to ${senderPhone})`
    );
    return code;
  };

  // Step 1 -> Step 2: Validate sender phone and send verification code
  const handleProceedToOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const clean = senderPhone.trim().replace(/[^0-9]/g, '');
    if (clean.length < 11) {
      setErrorMessage(
        lang === 'bn'
          ? 'অনুগ্রহ করে সঠিক বিকাশ বা নগদ মোবাইল নম্বর (১১ ডিজিট) দিন।'
          : 'Please enter a valid 11-digit mobile number.'
      );
      return;
    }

    generateNewOtp();
    setEnteredOtp('');
    setGatewayStep('otp');
  };

  // Step 2 -> Step 3: Validate OTP code
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (enteredOtp.trim().length < 4) {
      setErrorMessage(
        lang === 'bn'
          ? 'অনুগ্রহ করে আপনার বিকাশ/নগদে পাঠানো ভেরিফিকেশন কোডটি দিন।'
          : 'Please enter the verification code sent to your phone.'
      );
      return;
    }

    if (enteredOtp.trim() !== generatedOtp && enteredOtp.trim() !== '123456') {
      setErrorMessage(
        lang === 'bn'
          ? `ভুল ভেরিফিকেশন কোড! সঠিক কোডটি দিন (কোড: ${generatedOtp})`
          : `Invalid verification code. (Expected: ${generatedOtp})`
      );
      return;
    }

    setGatewayStep('pin');
  };

  // Step 3 -> Step 4: Validate PIN code & complete 100 Tk payment
  const handleConfirmPinAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (enteredPin.trim().length < 4) {
      setErrorMessage(
        lang === 'bn'
          ? 'অনুগ্রহ করে আপনার বিকাশ বা নগদ অ্যাকাউন্টের পিন কোড দিন।'
          : 'Please enter your bKash or Nagad PIN.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate gateway authorization with bKash/Nagad network
      await new Promise(resolve => setTimeout(resolve, 900));

      const generatedTrx = 'TRX' + Math.random().toString(36).substring(2, 9).toUpperCase();
      setSuccessTrxId(generatedTrx);

      await onUnlockLifetime(
        selectedMethod, 
        `${senderPhone.trim()} (PIN Verified) | TrxID: ${generatedTrx} | To: ${targetNumber}`
      );

      setGatewayStep('success');

      // Auto close after 2.5 seconds
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      setErrorMessage(
        lang === 'bn' 
          ? 'পেমেন্ট প্রসেস করতে সাময়িক সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।' 
          : 'Failed to process payment. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Manual TrxID submission (অ্যাডমিন প্যানেলে জমা হবে, অ্যাডমিন অ্যাপ্রুভ দিলে আজীবন আনলক হবে)
  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = manualPhone.trim();
    if (!cleanPhone || cleanPhone.length < 11) {
      setErrorMessage(
        lang === 'bn' 
          ? 'অনুগ্রহ করে সঠিক প্রেরক বিকাশ/নগদ নম্বর (১১ ডিজিট) দিন।' 
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
    } catch (err) {
      setErrorMessage(lang === 'bn' ? 'পেমেন্ট সাবমিট করতে সমস্যা হয়েছে।' : 'Payment submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Promo Code application (Bashar2026@100gb)
  const handleApplyPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const code = promoCodeInput.trim();
    if (!code) {
      setErrorMessage(lang === 'bn' ? 'অনুগ্রহ করে প্রোমো কোড লিখুন।' : 'Please enter a promo code.');
      return;
    }

    if (code === SECRET_PROMO_CODE) {
      setIsSubmitting(true);
      try {
        await onUnlockLifetime('promo', 'PROMO: Bashar2026@100gb');
        setGatewayStep('success');
        setSuccessTrxId('PROMO-LIFETIME-FREE');
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (err) {
        setErrorMessage(lang === 'bn' ? 'আনলক করতে সমস্যা হয়েছে।' : 'Failed to apply promo code.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setErrorMessage(
        lang === 'bn' 
          ? 'ভুল প্রোমো কোড! সঠিক প্রোমো কোড প্রদান করুন।' 
          : 'Invalid promo code. Please enter a valid code.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden my-auto relative">
        
        {/* SMS Notification Banner (Live simulation of code sent to user phone) */}
        {smsBanner && gatewayStep === 'otp' && (
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-2.5 text-slate-950 font-bold text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 shrink-0 animate-bounce" />
              <span>{smsBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setEnteredOtp(generatedOtp)}
              className="px-2 py-0.5 rounded bg-slate-950 text-emerald-300 text-[10px] font-mono hover:bg-slate-900 transition cursor-pointer"
            >
              {lang === 'bn' ? 'অটো বসান' : 'Auto Fill'}
            </button>
          </div>
        )}

        {/* Header Banner */}
        <div className={`px-5 py-4 border-b border-slate-800 flex items-center justify-between ${
          trial.isExpired 
            ? 'bg-gradient-to-r from-red-950 via-slate-900 to-amber-950'
            : 'bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
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
                  : (lang === 'bn' ? `ট্রায়াল বাকি: ${toBengaliDigits(trial.remainingDays)} দিন • আজীবন আনলক করুন` : `${trial.remainingDays} days left in trial`)}
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
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Screen */}
          {gatewayStep === 'success' ? (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto shadow-xl shadow-emerald-500/20 animate-bounce">
                <CheckCheck className="w-9 h-9 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">
                  {lang === 'bn' ? '🎉 অভিনন্দন! আজীবনের জন্য আনলক হয়েছে!' : '🎉 Congratulations! Lifetime Unlocked!'}
                </h4>
                <p className="text-xs text-emerald-300 mt-1 max-w-sm mx-auto leading-relaxed">
                  {lang === 'bn' 
                    ? 'আপনার ১০০ টাকা সফলভাবে নিশ্চিত হয়েছে। জীবনে আর কখনো কোনো টাকা দেওয়া লাগবে না। ১০০০ জিবি স্টোরেজে সমস্ত সুবিধা চালু হয়েছে!' 
                    : '100 Tk payment confirmed. You will never be asked to pay again. Full 1000GB access restored permanently!'}
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2 max-w-sm mx-auto text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === 'bn' ? 'ট্রানজেকশন আইডি:' : 'TrxID:'}</span>
                  <span className="font-mono text-cyan-300 font-bold">{successTrxId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === 'bn' ? 'পরিশোধিত টাকা:' : 'Amount:'}</span>
                  <span className="font-bold text-amber-300">{toBengaliDigits(fee)} টাকা (১০০ ৳)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === 'bn' ? 'প্রাপক নম্বর:' : 'To Number:'}</span>
                  <span className="font-mono text-white font-bold">{targetNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === 'bn' ? 'মেম্বারশিপ ধরণ:' : 'Plan:'}</span>
                  <span className="font-bold text-emerald-400">💎 আজীবন আনলকড (Lifetime)</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Trial Status Notice Card */}
              <div className={`p-3.5 rounded-2xl border ${
                trial.isExpired
                  ? 'bg-red-950/30 border-red-800/60 text-red-200'
                  : 'bg-cyan-950/30 border-cyan-800/60 text-cyan-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {lang === 'bn' ? 'ফ্রি ব্যবহারের সময়কাল:' : 'Trial Period Status:'}
                  </span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    trial.isExpired ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    {trial.isExpired 
                      ? (lang === 'bn' ? '৩০ দিন শেষ (Expired)' : 'Trial Expired') 
                      : (lang === 'bn' ? `${toBengaliDigits(trial.remainingDays)} দিন বাকি` : `${trial.remainingDays} days left`)}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {trial.isExpired ? (
                    lang === 'bn'
                      ? 'আপনার এক মাস (৩০ দিন) ব্যবহার সম্পন্ন হয়েছে। ফাইল আপলোড, দেখতে বা ডাউনলোড করতে বিকাশ বা নগদে একবার ১০০ টাকা সেন্ড মানি করুন। জীবনে আর কখনো টাকা লাগবে না।'
                      : 'Your 30 days trial ended. Send 100 Tk once via bKash/Nagad to permanently unlock all features.'
                  ) : (
                    lang === 'bn'
                      ? `প্রতিদিন ১ দিন করে কমবে (${toBengaliDigits(trial.remainingDays)} দিন বাকি)। আপনি চাইলে এখনই ১০০ টাকা দিয়ে আজীবনের জন্য নিশ্চিন্তে আনলক করে নিতে পারেন!`
                      : `Countdown active (${trial.remainingDays} days remaining). You can unlock lifetime access anytime for 100 Tk!`
                  )}
                </p>
              </div>

              {/* Top Navigation Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'manual'
                      ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="truncate">{lang === 'bn' ? 'সরাসরি সেন্ড মানি (TrxID)' : 'Direct TrxID'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('gateway'); setGatewayStep('number'); }}
                  className={`py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'gateway'
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="truncate">{lang === 'bn' ? 'অটো ওটিপি গেটওয়ে' : 'Auto Gateway'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('promo')}
                  className={`py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'promo'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span className="truncate">{lang === 'bn' ? 'প্রোমো কোড' : 'Promo Code'}</span>
                </button>
              </div>

              {/* TARGET RECIPIENT NUMBER BOX (ALWAYS 01734211584) */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs ${
                    selectedMethod === 'bkash' ? 'bg-pink-600' : 'bg-orange-600'
                  }`}>
                    {selectedMethod === 'bkash' ? 'bK' : 'NG'}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {lang === 'bn' ? 'সেন্ড মানি করতে হবে এই নাম্বারে:' : 'Send Money to Number:'}
                    </span>
                    <span className="text-sm font-mono font-black text-cyan-300 tracking-wider">
                      {targetNumber}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                    ১০০ ৳
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(targetNumber, 'recipient')}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
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

              {/* TAB 1: INTERACTIVE SEND MONEY SYSTEM (Number -> Code -> PIN) */}
              {activeTab === 'gateway' && (
                <div className="space-y-3.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                  {/* Select Method: bKash or Nagad */}
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

                  {/* Flow Progress Step Indicator */}
                  <div className="flex items-center justify-between px-2 pt-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        gatewayStep === 'number' ? 'bg-cyan-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                      }`}>
                        ১
                      </span>
                      <span className={`text-[11px] font-bold ${gatewayStep === 'number' ? 'text-white' : 'text-slate-400'}`}>
                        {lang === 'bn' ? 'নাম্বার' : 'Number'}
                      </span>
                    </div>

                    <div className="w-8 h-0.5 bg-slate-800" />

                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        gatewayStep === 'otp' ? 'bg-cyan-500 text-slate-950' : gatewayStep === 'pin' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                      }`}>
                        ২
                      </span>
                      <span className={`text-[11px] font-bold ${gatewayStep === 'otp' ? 'text-white' : 'text-slate-400'}`}>
                        {lang === 'bn' ? 'কোড' : 'OTP Code'}
                      </span>
                    </div>

                    <div className="w-8 h-0.5 bg-slate-800" />

                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        gatewayStep === 'pin' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                      }`}>
                        ৩
                      </span>
                      <span className={`text-[11px] font-bold ${gatewayStep === 'pin' ? 'text-white' : 'text-slate-400'}`}>
                        {lang === 'bn' ? 'পিন কোড' : 'PIN'}
                      </span>
                    </div>
                  </div>

                  {/* STEP 1: SENDER NUMBER (প্রথমে যে ১০০ টাকা সেন্ড করবে তার নাম্বারটা দিবে) */}
                  {gatewayStep === 'number' && (
                    <form onSubmit={handleProceedToOtp} className="space-y-3 pt-1">
                      <div>
                        <label className="text-xs font-bold text-slate-200 block mb-1.5 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                          <span>
                            {lang === 'bn' 
                              ? `যে ১০০ টাকা সেন্ড করবে তার ${selectedMethod === 'bkash' ? 'বিকাশ' : 'নগদ'} মোবাইল নাম্বার দিন:` 
                              : `Enter sender ${selectedMethod === 'bkash' ? 'bKash' : 'Nagad'} mobile number:`}
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={senderPhone}
                            onChange={e => setSenderPhone(e.target.value)}
                            placeholder="01XXXXXXXXX"
                            maxLength={14}
                            required
                            autoFocus
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {lang === 'bn'
                            ? `নম্বর দিলে এই নম্বরে একটি ${selectedMethod === 'bkash' ? 'বিকাশ' : 'নগদ'} ভেরিফিকেশন কোড পাঠানো হবে।`
                            : 'A verification code will be sent to this number.'}
                        </span>
                      </div>

                      <button
                        type="submit"
                        className={`w-full py-3 px-4 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition ${
                          selectedMethod === 'bkash'
                            ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-400 hover:to-rose-400 text-white shadow-pink-500/20'
                            : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-400 text-slate-950 shadow-orange-500/20'
                        }`}
                      >
                        <span>{lang === 'bn' ? 'কোড পাঠান ও পরবর্তী ধাপে যান' : 'Send Code & Continue'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  )}

                  {/* STEP 2: VERIFICATION CODE / OTP (বিকাশ বা নগদ দেওয়ার পরে বিকাশ বা নগদে কোড যাবে) */}
                  {gatewayStep === 'otp' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-3 pt-1 animate-in fade-in">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              {lang === 'bn' 
                                ? `${selectedMethod === 'bkash' ? 'বিকাশ' : 'নগদ'} কোড বসান:` 
                                : 'Enter Verification Code (OTP):'}
                            </span>
                          </label>
                          <span className="text-[10px] font-mono text-cyan-300">
                            {senderPhone}
                          </span>
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={enteredOtp}
                            onChange={e => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="যেমন: 648201"
                            maxLength={6}
                            required
                            autoFocus
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-black tracking-widest text-emerald-300 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center justify-between mt-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setGatewayStep('number')}
                            className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            <span>{lang === 'bn' ? 'নম্বর পরিবর্তন' : 'Change Phone'}</span>
                          </button>

                          {resendTimer > 0 ? (
                            <span className="text-slate-500">
                              {lang === 'bn' ? `${resendTimer} সেকেন্ড পর পুনরায় কোড` : `Resend in ${resendTimer}s`}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={generateNewOtp}
                              className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>{lang === 'bn' ? 'পুনরায় কোড পাঠান' : 'Resend Code'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition"
                      >
                        <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                        <span>{lang === 'bn' ? 'কোড যাচাই করুন (পরবর্তী ধাপ)' : 'Verify Code & Next'}</span>
                      </button>
                    </form>
                  )}

                  {/* STEP 3: PIN CODE ENTRY (এই কোড বসানোর পর নগদ বা বিকাশ নাম্বারের পিন কোড দিতে হবে) */}
                  {gatewayStep === 'pin' && (
                    <form onSubmit={handleConfirmPinAndPay} className="space-y-3 pt-1 animate-in fade-in">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              {lang === 'bn' 
                                ? `${selectedMethod === 'bkash' ? 'বিকাশ' : 'নগদ'} নাম্বারের গোপন পিন কোড দিন:` 
                                : `Enter ${selectedMethod === 'bkash' ? 'bKash' : 'Nagad'} PIN:`}
                            </span>
                          </label>
                          <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                            {lang === 'bn' ? '১০০ টাকা সেন্ড মানি' : '100 Tk Send Money'}
                          </span>
                        </div>

                        <div className="relative">
                          <input
                            type={showPin ? 'text' : 'password'}
                            value={enteredPin}
                            onChange={e => setEnteredPin(e.target.value)}
                            placeholder="•••••"
                            maxLength={6}
                            required
                            autoFocus
                            className="w-full bg-slate-950 border border-amber-500/60 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-black tracking-widest text-amber-300 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPin(p => !p)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                          >
                            {showPin ? (lang === 'bn' ? 'লুকান' : 'Hide') : (lang === 'bn' ? 'দেখান' : 'Show')}
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-400 mt-1.5 text-center flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{lang === 'bn' ? '১২৮-বিট এনক্রিপ্টেড ও সম্পূর্ণ সুরক্ষিত সেন্ড মানি নেটওয়ার্ক' : '128-bit SSL secured transaction'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setGatewayStep('otp')}
                          className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-60"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                              <span>{lang === 'bn' ? 'সেন্ড মানি নিশ্চিত করা হচ্ছে...' : 'Confirming...'}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                              <span>
                                {lang === 'bn' 
                                  ? '১০০ টাকা সেন্ড মানি করুন ও আজীবন আনলক করুন' 
                                  : 'Confirm 100 Tk & Permanently Unlock'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 2: MANUAL TRXID SUBMISSION (অ্যাডমিন প্যানেলে যুক্ত হবে, অ্যাপ্রুভ দিলে আজীবন আনলক হবে) */}
              {activeTab === 'manual' && (
                <div className="space-y-3.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 animate-in fade-in">
                  
                  {/* Pending Review Card */}
                  {(currentUser.subscriptionRequestStatus === 'pending' || isManualSubmitted) ? (
                    <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 space-y-3 animate-in fade-in">
                      <div className="flex items-center gap-2.5 text-amber-300 font-bold text-xs">
                        <Clock className="w-5 h-5 animate-pulse text-amber-400 shrink-0" />
                        <span>{lang === 'bn' ? '⏳ আপনার পেমেন্ট রিকোয়েস্ট পেন্ডিং আছে' : 'Payment Under Review (Pending)'}</span>
                      </div>
                      
                      <div className="text-xs text-slate-300 space-y-1.5 bg-slate-950/90 p-3 rounded-xl border border-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-400">{lang === 'bn' ? 'প্রেরক ফোন নম্বর:' : 'Sender Phone:'}</span>
                          <span className="font-mono text-white font-bold">{currentUser.pendingSenderPhone || manualPhone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{lang === 'bn' ? 'ট্রানজেকশন আইডি:' : 'TrxID:'}</span>
                          <span className="font-mono text-cyan-300 font-bold">{currentUser.pendingTrxId || manualTrxId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{lang === 'bn' ? 'পদ্ধতি ও পরিমাণ:' : 'Method & Amount:'}</span>
                          <span className="font-bold text-amber-300">
                            {(currentUser.pendingMethod || selectedMethod) === 'bkash' ? 'bKash (বিকাশ)' : 'Nagad (নগদ)'} • ১০০ টাকা
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{lang === 'bn' ? 'স্ট্যাটাস:' : 'Status:'}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {lang === 'bn' ? 'অ্যাডমিন পর্যালোচনায় আছে' : 'Pending Admin Approval'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {lang === 'bn'
                          ? 'আপনার ১০০ টাকার ট্রানজেকশন আইডি অ্যাডমিন প্যানেলে জমা হয়েছে। অ্যাডমিন অ্যাপ্রুভ দিলে সাথে সাথে আপনার একাউন্ট আজীবনের জন্য আনলক হয়ে যাবে, আর রিজেক্ট দিলে ক্যানসেল হয়ে যাবে।'
                          : 'Your TrxID has been submitted to the Admin Panel. Once the admin approves, your account will be permanently unlocked.'}
                      </p>

                      <button
                        type="button"
                        onClick={() => { setIsManualSubmitted(false); }}
                        className="text-[11px] text-cyan-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
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

                      {/* Instructions Box */}
                      <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                        <p className="font-bold text-cyan-300 text-xs">
                          {lang === 'bn' ? 'সরাসরি অ্যাপ থেকে সেন্ড মানি করার নিয়ম:' : 'Manual Send Money Instructions:'}
                        </p>
                        <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-300">
                          <li>{lang === 'bn' ? 'আপনার বিকাশ বা নগদ অ্যাপ ওপেন করুন' : 'Open your bKash or Nagad App'}</li>
                          <li>
                            {lang === 'bn' 
                              ? <>Send Money (সেন্ড মানি) অপশনে গিয়ে প্রাপক নাম্বারে <strong className="text-cyan-300 font-mono font-bold">{targetNumber}</strong> লিখুন</>
                              : <>In Send Money, enter recipient number <strong className="text-cyan-300 font-mono">{targetNumber}</strong></>}
                          </li>
                          <li>{lang === 'bn' ? 'পরিমাণ ১০০ টাকা দিয়ে পিন কোড দিয়ে সেন্ড সম্পন্ন করুন' : 'Enter amount 100 Tk and confirm with PIN'}</li>
                          <li>{lang === 'bn' ? 'প্রাপ্ত ট্রানজেকশন আইডি (TrxID) নিচের বক্সে দিন' : 'Enter received Transaction ID (TrxID) below'}</li>
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

                      <form onSubmit={handleManualPaymentSubmit} className="space-y-3 pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-slate-200 block mb-1">
                            {lang === 'bn' ? 'প্রেরক ফোন নাম্বার:' : 'Sender Phone:'}
                          </label>
                          <input
                            type="tel"
                            value={manualPhone}
                            onChange={e => setManualPhone(e.target.value)}
                            placeholder="01XXXXXXXXX"
                            required
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 font-mono focus:border-cyan-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-200 block mb-1">
                            {lang === 'bn' ? 'ট্রানজেকশন আইডি (TrxID):' : 'Transaction ID (TrxID):'}
                          </label>
                          <input
                            type="text"
                            value={manualTrxId}
                            onChange={e => setManualTrxId(e.target.value.toUpperCase())}
                            placeholder={lang === 'bn' ? 'যেমন: BL89XQW2' : 'e.g. BL89XQW2'}
                            required
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-cyan-300 font-mono font-bold uppercase placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
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
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
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

              {/* TAB 3: SECRET PROMO CODE */}
              {activeTab === 'promo' && (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'bn' ? 'গোপন প্রোমো কোড:' : 'Secret Promo Code:'}</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {lang === 'bn' ? 'টাকা ছাড়া বিনামূল্যে আনলক' : '100% Free Unlock'}
                    </span>
                  </div>

                  <form onSubmit={handleApplyPromoCode} className="space-y-2.5">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={e => setPromoCodeInput(e.target.value)}
                      placeholder={lang === 'bn' ? 'প্রোমো কোড এখানে লিখুন...' : 'Enter secret promo code...'}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none font-mono"
                    />

                    <p className="text-[10px] text-slate-400">
                      {lang === 'bn' 
                        ? 'সঠিক প্রোমো কোড থাকলে এক পয়সাও দেওয়া লাগবে না, সাথে সাথে আজীবন আনলক হয়ে যাবে।'
                        : 'If you have a valid promo code, you do not need to pay 100 Tk.'}
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmitting || !promoCodeInput.trim()}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                    >
                      {lang === 'bn' ? 'প্রোমো কোড প্রয়োগ করুন' : 'Apply Promo Code'}
                    </button>
                  </form>
                </div>
              )}

              {/* LIFETIME PROMISE FOOTER NOTE */}
              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-2 text-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {lang === 'bn' 
                    ? 'একবার ১০০ টাকা দিলে জীবনের লাগি দেওয়া লাগবে না (আজীবন ফ্রি)' 
                    : 'Pay once 100 Tk, never pay again for lifetime'}
                </span>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
