import { UserAccount } from '../types/storage';

export const SECRET_PROMO_CODE = 'Bashar2026@100gb';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliDigits(num: number | string): string {
  return String(num).replace(/[0-9]/g, d => BENGALI_DIGITS[parseInt(d, 10)] || d);
}

const BENGALI_SCREEN_ORDINALS = [
  'প্রথম ভিডিও প্রথম স্ক্রিন রেকর্ড',
  'দ্বিতীয় ভিডিও দ্বিতীয় স্ক্রিন রেকর্ড',
  'তৃতীয় ভিডিও তৃতীয় স্ক্রিন রেকর্ড',
  'চতুর্থ ভিডিও চতুর্থ স্ক্রিন রেকর্ড',
  'পঞ্চম ভিডিও পঞ্চম স্ক্রিন রেকর্ড',
  'ষষ্ঠ ভিডিও ষষ্ঠ স্ক্রিন রেকর্ড',
  'সপ্তম ভিডিও সপ্তম স্ক্রিন রেকর্ড',
  'অষ্টম ভিডিও অষ্টম স্ক্রিন রেকর্ড',
  'নবম ভিডিও নবম স্ক্রিন রেকর্ড',
  'দশম ভিডিও দশম স্ক্রিন রেকর্ড'
];

export function getSequentialScreenRecordName(index: number): string {
  const safeIdx = Math.max(1, index);
  if (safeIdx >= 1 && safeIdx <= BENGALI_SCREEN_ORDINALS.length) {
    return BENGALI_SCREEN_ORDINALS[safeIdx - 1];
  }
  return `${toBengaliDigits(safeIdx)}তম ভিডিও ${toBengaliDigits(safeIdx)}তম স্ক্রিন রেকর্ড`;
}

const BENGALI_VOICE_NAMES = [
  'এক ভয়েস',
  'দুই ভয়েস',
  'তিন ভয়েস',
  'চার ভয়েস',
  'পাঁচ ভয়েস',
  'ছয় ভয়েস',
  'সাত ভয়েস',
  'আট ভয়েস',
  'নয় ভয়েস',
  'দশ ভয়েস'
];

export function getSequentialVoiceRecordName(index: number): string {
  const safeIdx = Math.max(1, index);
  if (safeIdx >= 1 && safeIdx <= BENGALI_VOICE_NAMES.length) {
    return BENGALI_VOICE_NAMES[safeIdx - 1];
  }
  return `${toBengaliDigits(safeIdx)} ভয়েস`;
}

// Compute the next sequential number based on files currently in drive
export function getNextScreenRecordNumber(files: Array<{ name: string; tags?: string[] }>): number {
  const screenFiles = files.filter(f => 
    f.name.includes('স্ক্রিন রেকর্ড') || 
    f.name.toLowerCase().includes('screen_recording') ||
    (f.tags && f.tags.includes('Screen Recording'))
  );
  return screenFiles.length + 1;
}

export function getNextVoiceRecordNumber(files: Array<{ name: string; tags?: string[] }>): number {
  const voiceFiles = files.filter(f => 
    f.name.includes('ভয়েস') || 
    f.name.toLowerCase().includes('voice') ||
    (f.tags && f.tags.includes('Voice Recording'))
  );
  return voiceFiles.length + 1;
}

export interface TrialStatus {
  isLifetime: boolean;
  isExpired: boolean;
  remainingDays: number;
  elapsedDays: number;
  totalTrialDays: number;
}

export function getTrialStatus(user: UserAccount | null | undefined): TrialStatus {
  if (!user) {
    return {
      isLifetime: false,
      isExpired: false,
      remainingDays: 30,
      elapsedDays: 0,
      totalTrialDays: 30
    };
  }

  // If user has unlocked lifetime access (via 100 Tk or promo code Bashar2026@100gb or admin approval)
  if (user.isLifetimeUnlocked || user.role === 'admin') {
    return {
      isLifetime: true,
      isExpired: false,
      remainingDays: 9999,
      elapsedDays: 0,
      totalTrialDays: 30
    };
  }

  const startTimestamp = new Date(user.trialStartDate || user.createdAt || Date.now()).getTime();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - startTimestamp);
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, 30 - elapsedDays);

  return {
    isLifetime: false,
    isExpired: remainingDays <= 0,
    remainingDays,
    elapsedDays,
    totalTrialDays: 30
  };
}
