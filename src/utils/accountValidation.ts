// Helper functions to identify and normalize email or phone numbers

// Bengali to English digit mapping
const BN_TO_EN_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

export function convertBengaliDigitsToEnglish(input: string): string {
  return input.replace(/[০-৯]/g, match => BN_TO_EN_DIGITS[match] || match);
}

export function isEmail(input: string): boolean {
  const clean = input.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Normalizes phone numbers (handles Bengali numbers, +880, 880, spaces, dashes)
 * Example:
 * 01712345678 -> 01712345678
 * +8801712345678 -> 01712345678
 * 8801712345678 -> 01712345678
 * 01712-345678 -> 01712345678
 * ০১৭১২৩৪৫৬৭৮ -> 01712345678
 */
export function normalizePhone(input: string): string {
  // Convert any Bengali numerals to English numerals
  const converted = convertBengaliDigitsToEnglish(input);
  // Remove all non-digit characters
  let digits = converted.replace(/\D/g, '');

  // If starts with Bangladesh country code 880
  if (digits.startsWith('880') && digits.length >= 13) {
    digits = digits.substring(2); // Keep leading 0 (88017... -> 017...)
  } else if (digits.startsWith('88') && digits.length >= 12) {
    digits = digits.substring(2);
  }

  // Ensure leading zero if it's a standard 10-digit mobile number without leading 0
  if (digits.length === 10 && digits.startsWith('1')) {
    digits = '0' + digits;
  }

  return digits;
}

/**
 * Determines whether the input is a valid phone number (e.g., 11 digits in Bangladesh or 7-15 digits internationally)
 */
export function isPhoneNumber(input: string): boolean {
  const normalized = normalizePhone(input);
  // Phone numbers generally have 7 to 15 digits
  return /^\d{7,15}$/.test(normalized);
}

/**
 * Normalized identifier key for uniqueness checking
 * Returns a uniform string key so that:
 * "01712-345678", "+8801712345678", " ০১৭১২৩৪৫৬৭৮ " all resolve to "phone:01712345678"
 * "User@GMAIL.com" and "user@gmail.com" resolve to "email:user@gmail.com"
 */
export function getNormalizedAccountIdentifier(input: string): { type: 'email' | 'phone' | 'raw'; key: string } {
  const trimmed = input.trim();
  if (isEmail(trimmed)) {
    return {
      type: 'email',
      key: `email:${normalizeEmail(trimmed)}`
    };
  }

  const phone = normalizePhone(trimmed);
  if (phone.length >= 7) {
    return {
      type: 'phone',
      key: `phone:${phone}`
    };
  }

  return {
    type: 'raw',
    key: `raw:${trimmed.toLowerCase()}`
  };
}

/**
 * Checks if two identifiers represent the exact same email or mobile number
 */
export function isSameEmailOrPhone(inputA: string, inputB: string): boolean {
  const normA = getNormalizedAccountIdentifier(inputA);
  const normB = getNormalizedAccountIdentifier(inputB);
  return normA.key === normB.key;
}
