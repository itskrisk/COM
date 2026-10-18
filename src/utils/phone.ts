/**
 * Kenyan Phone Number Normalization & Validation Utility
 *
 * Valid formats in Kenya:
 * - Safaricom: 07XX, 011X
 * - Airtel: 07XX, 010X
 * - Telkom: 077X
 *
 * Normalizes to standard E.164: +254XXXXXXXXX (e.g. +254712345678, +254112345678)
 */

export function normalizeKenyanPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  // Remove all non-digit characters except leading plus if present
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+254')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('254')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // Should now be a 9-digit local number starting with 7 or 1
  return `+254${cleaned}`;
}

export function isValidKenyanPhone(rawPhone: string): boolean {
  if (!rawPhone) return false;
  const normalized = normalizeKenyanPhone(rawPhone);
  // Must be +254 followed by 7 or 1, then 8 digits
  return /^\+254(7|1)\d{8}$/.test(normalized);
}

export function formatPhoneForDisplay(rawPhone: string): string {
  if (!rawPhone) return '';
  const normalized = normalizeKenyanPhone(rawPhone);
  if (!isValidKenyanPhone(normalized)) return rawPhone;
  // +254 7XX XXX XXX
  return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7, 10)} ${normalized.slice(10)}`;
}
