import { z } from 'zod';

// Same rules and messages as the backend (treeway_backend/models/model.py).
// The server checks again; these only give the member a fast, clear message.

export const MOBILE_RE = /^[6-9]\d{9}$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const UTR_RE = /^[A-Za-z0-9]{6,30}$/;
export const CODE_RE = /^TW\d{7}$/;
export const ACCOUNT_RE = /^\d{9,18}$/;
export const OTP_RE = /^\d{6}$/;
// Company details (routes/companyApis.py _check_company).
export const UPI_RE = /^[A-Za-z0-9.\-_]{2,64}@[A-Za-z][A-Za-z0-9]{1,30}$/;
export const WHATSAPP_RE =
  /^https:\/\/(chat\.whatsapp\.com|wa\.me|whatsapp\.com\/channel)\/[A-Za-z0-9/_\-?=&.]+$/;

export const mobile = z.string().trim().regex(MOBILE_RE, 'Enter a valid 10 digit mobile number.');

export const memberCode = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(CODE_RE, 'Enter a valid member ID like TW1234567.'));

export const password = z
  .string()
  .max(64, 'Password is too long.')
  .refine((v) => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v), {
    message: 'Use at least 8 characters with letters and numbers.',
  });

export const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email.'));

export const fullName = z.string().trim().min(2, 'Enter your full name.').max(80, 'Name is too long.');

export const ifsc = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(IFSC_RE, 'Enter a valid IFSC code.'));

export const pan = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(PAN_RE, 'Enter a valid PAN like ABCDE1234F.'));

export const bankAccount = z.string().trim().regex(ACCOUNT_RE, 'Enter a valid account number.');

export const utr = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(UTR_RE, 'Enter a valid UTR / transaction ID.'));

export const otp = z.string().trim().regex(OTP_RE, 'Enter the 6-digit OTP.');

// File checks live in ./upload (no zod), so screens that only pick a file do not load zod.
export { UPLOAD_TYPES, UPLOAD_MAX_BYTES, checkUploadFile } from './upload';
