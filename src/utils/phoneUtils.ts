/**
 * Phone Number Normalization, Country Code Support & Formatting Utilities
 * Designed in accordance with:
 * - .ai/IDENTITY_01_REQUIREMENTS_AND_UX.md
 * - .ai/IDENTITY_02_DATA_MODEL_AND_UNIQUENESS.md
 */

export interface CountryCodeOption {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
  samplePlaceholder: string;
}

export const SUPPORTED_COUNTRIES: CountryCodeOption[] = [
  { code: 'ET', dialCode: '+251', name: 'Ethiopia', flag: '🇪🇹', samplePlaceholder: '91 123 4567' },
  { code: 'US', dialCode: '+1', name: 'United States', flag: '🇺🇸', samplePlaceholder: '555-019-5572' },
  { code: 'KE', dialCode: '+254', name: 'Kenya', flag: '🇰🇪', samplePlaceholder: '712 345678' },
  { code: 'DJ', dialCode: '+253', name: 'Djibouti', flag: '🇩🇯', samplePlaceholder: '77 12 34 56' },
  { code: 'SO', dialCode: '+252', name: 'Somalia', flag: '🇸🇴', samplePlaceholder: '61 234 5678' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧', samplePlaceholder: '7911 123456' },
  { code: 'AE', dialCode: '+971', name: 'United Arab Emirates', flag: '🇦🇪', samplePlaceholder: '50 123 4567' },
  { code: 'UG', dialCode: '+256', name: 'Uganda', flag: '🇺🇬', samplePlaceholder: '712 345678' },
  { code: 'RW', dialCode: '+250', name: 'Rwanda', flag: '🇷🇼', samplePlaceholder: '788 123 456' },
];

/**
 * Normalizes phone input to E.164 standard (+[country][national_number])
 */
export function normalizeToE164(rawPhone: string, selectedDialOrCountryCode: string = '+251'): string {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();

  // If already starts with '+', strip formatting characters except the leading '+'
  if (trimmed.startsWith('+')) {
    const cleaned = '+' + trimmed.slice(1).replace(/\D/g, '');
    return cleaned;
  }

  // Lookup country if an ISO code like 'ET' is passed
  let dialCode = selectedDialOrCountryCode;
  const matchedCountry = SUPPORTED_COUNTRIES.find(
    (c) => c.code.toUpperCase() === selectedDialOrCountryCode.toUpperCase()
  );
  if (matchedCountry) {
    dialCode = matchedCountry.dialCode;
  }
  if (!dialCode.startsWith('+')) {
    dialCode = `+${dialCode}`;
  }

  // Handle local Ethiopian prefix '09' or '07'
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (dialCode === '+251' && digitsOnly.startsWith('0')) {
    return '+251' + digitsOnly.slice(1);
  }

  return dialCode + digitsOnly;
}

/**
 * Validates whether string is a valid E.164 phone number
 */
export function isValidE164(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  // Standard E.164: '+' followed by 7 to 15 digits
  return /^\+[1-9]\d{6,14}$/.test(phone.trim());
}

/**
 * Masks phone number for safe display without revealing full number
 * e.g. +251911223344 -> +251 91 ••• ••44
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.startsWith('+251') && clean.length >= 12) {
    const prefix = clean.slice(0, 6); // +25191
    const last2 = clean.slice(-2);
    return `${prefix.slice(0, 4)} ${prefix.slice(4)} ••• ••${last2}`;
  }
  if (clean.length > 7) {
    const prefix = clean.slice(0, 5);
    const suffix = clean.slice(-2);
    return `${prefix} •••• ${suffix}`;
  }
  return clean;
}
