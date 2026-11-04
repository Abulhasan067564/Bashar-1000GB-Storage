import { toBengaliDigits } from './bengaliNaming';

/**
 * Formats a timestamp into a friendly relative time string (e.g. "৫ মিনিট আগে" or "5 minutes ago")
 */
export function formatTimeAgo(timestamp?: string | number | Date | null, lang: 'bn' | 'en' = 'bn'): string {
  if (!timestamp) {
    return lang === 'bn' ? 'তারিখ নেই' : 'No date';
  }

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0 || isNaN(diffMs)) {
    return lang === 'bn' ? 'এইমাত্র' : 'Just now';
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (lang === 'bn') {
    if (seconds < 45) return 'এইমাত্র';
    if (minutes < 60) return `${toBengaliDigits(Math.max(1, minutes))} মিনিট আগে`;
    if (hours < 24) return `${toBengaliDigits(hours)} ঘণ্টা আগে`;
    if (days < 30) return `${toBengaliDigits(days)} দিন আগে`;
    if (months < 12) return `${toBengaliDigits(months)} মাস আগে`;
    return `${toBengaliDigits(years)} বছর আগে`;
  } else {
    if (seconds < 45) return 'Just now';
    if (minutes < 60) return `${Math.max(1, minutes)} min${minutes === 1 ? '' : 's'} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
    return `${years} year${years === 1 ? '' : 's'} ago`;
  }
}

/**
 * Returns formatted date string with time (e.g. "০২/১১/২০২৬, ০২:১৫ AM")
 */
export function formatFullDateTime(timestamp?: string | number | Date | null, lang: 'bn' | 'en' = 'bn'): string {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '—';

  const datePart = d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const timePart = d.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `${datePart}, ${timePart}`;
}
