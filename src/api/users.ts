import { api } from './client';
import type { Schema } from './schema';

export type Me = Schema<'Me'>;
export type PublicUser = Schema<'PublicUser'>;
export type LoginToken = Schema<'LoginToken'>;
export type LoginOtpNeeded = Schema<'LoginOtpNeeded'>;
export type SponsorCheck = Schema<'SponsorCheck'>;
export type SignupOtp = Schema<'SignupOtp'>;
export type SignupDone = Schema<'SignupDone'>;
export type RegisterBody = Schema<'RegisterModel'>;

export function isOtpNeeded(x: LoginToken | LoginOtpNeeded): x is LoginOtpNeeded {
  return 'otp_required' in x && x.otp_required;
}

const enc = encodeURIComponent;

export const usersApi = {
  me: (signal?: AbortSignal) => api<Me>('/users/me', { signal }),

  /** Members get a token. Admins get {otp_required, login_ticket, email} first. */
  login: (login_id: string, password: string) =>
    api<LoginToken | LoginOtpNeeded>('/users/login', { json: { login_id, password } }),
  loginOtp: (login_ticket: string, otp: string) =>
    api<LoginToken>('/users/login/otp', { json: { login_ticket, otp } }),
  logoutAll: () => api<unknown>('/users/logout-all', { method: 'POST' }),

  /** Sign-up step 1: everything is checked and an OTP goes to the email. No ID yet (Q3, 16 Oct). */
  register: (body: RegisterBody) => api<SignupOtp>('/users/register', { json: body }),
  /** Step 2: the right OTP makes the ID and logs in. The same ticket again gives the same ID. */
  registerVerify: (signup_ticket: string, otp: string) =>
    api<SignupDone>('/users/register/verify', { json: { signup_ticket, otp } }),
  /** A new OTP to the same email (60 s gap). */
  registerResend: (signup_ticket: string) =>
    api<SignupOtp>('/users/register/resend', { json: { signup_ticket } }),
  /** Bot protection: a proof-of-work challenge for the sign-up form (see lib/usePow). */
  registerChallenge: () => api<Schema<'PowChallenge'>>('/users/register/challenge'),
  /** 400 when the sponsor is not valid or not active. */
  validateSponsor: (code: string, signal?: AbortSignal) =>
    api<SponsorCheck>(`/users/${enc(code)}/validate-sponsor`, { signal }),
  /** Limited to 20 a minute per IP: call it debounced. */
  mobileCheck: (mobile: string, signal?: AbortSignal) =>
    api<Schema<'MobileCheck'>>(`/users/mobile-check/${enc(mobile)}`, { signal }),

  /** Only changed fields. A new email needs the OTP sent to the CURRENT email (emailChangeOtp). */
  updateProfile: (body: Schema<'ProfileModel'>) => api<unknown>('/users/me', { method: 'PATCH', json: body }),
  emailChangeOtp: () => api<Schema<'MaskedEmail'>>('/users/email-change/otp', { method: 'POST' }),
  /** OTP to the current email, then saveBank with it. Withdrawals pause for 24 h after a change. */
  bankOtp: () => api<Schema<'MaskedEmail'>>('/users/bank-detail/otp', { method: 'POST' }),
  saveBank: (body: Schema<'BankModel'>) => api<unknown>('/users/bank-detail', { method: 'PUT', json: body }),
  /** Returns a new token: every other device is logged out (token_version). */
  changePassword: (old_password: string, new_password: string) =>
    api<Schema<'TokenOnly'>>('/users/change-password', { json: { old_password, new_password } }),

  /** Member ID only (no mobile). Returns the masked email. */
  forgotOtp: (user_code: string) =>
    api<Schema<'MaskedEmail'>>('/users/forgot-password/otp', { json: { user_code } }),
  forgotReset: (user_code: string, otp: string, new_password: string) =>
    api<unknown>('/users/forgot-password/reset', { json: { user_code, otp, new_password } }),
  /** The link from the admin's "Send password reset" (once, 24 h). 400 {error: 'LinkExpired'} when used / old. */
  resetByLink: (token: string, new_password: string) =>
    api<unknown>('/users/password-reset/link', { json: { token, new_password } }),
};
