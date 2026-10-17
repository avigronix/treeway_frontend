import { api } from './client';
import type { Page, Schema } from './schema';

// Money actions. The server is the only judge: every limit, fee and balance below is checked again there.

export type MyPaymentRequest = Schema<'MyPaymentRequest'>;
export type PaymentPurpose = MyPaymentRequest['purpose'];

export interface PaymentRequestForm {
  purpose: PaymentPurpose;
  utr: string;
  receipt: File;
  note?: string;
  /** rupees, only for purpose 'fund' */
  amount?: string;
  /** only for purpose 'pins' */
  pin_qty?: number;
}

export const walletApi = {
  /** One multipart form for: activate my ID, add funds, buy PINs. The admin checks the UTR. */
  paymentRequest: (f: PaymentRequestForm) => {
    const form = new FormData();
    form.set('purpose', f.purpose);
    form.set('utr', f.utr);
    if (f.note) form.set('note', f.note);
    if (f.amount) form.set('amount', f.amount);
    if (f.pin_qty) form.set('pin_qty', String(f.pin_qty));
    form.set('receipt', f.receipt);
    return api<Schema<'Created'>>('/wallet/payment-request', { form, timeoutMs: 60_000 });
  },
  paymentRequests: (purpose: PaymentPurpose, signal?: AbortSignal) =>
    api<Page<MyPaymentRequest>>('/wallet/payment-requests', { query: { purpose, limit: 10 }, signal }),

  // ---- withdraw (email OTP, money held at once; the admin pays from the bank and enters the UTR)
  withdrawals: (signal?: AbortSignal) =>
    api<Page<MyWithdrawal>>('/wallet/withdrawals', { query: { limit: 10 }, signal }),
  /** Checks PAN / bank / 24 h hold / one waiting first; then emails the OTP. */
  withdrawOtp: () => api<Schema<'MaskedEmail'>>('/wallet/withdrawal/otp', { method: 'POST' }),
  withdraw: (amount: number, otp: string) =>
    api<Schema<'Created'>>('/wallet/withdrawal', { json: { amount, otp } }),

  // ---- P2P (Income -> Income, team or own sponsor only)
  p2pLimits: (signal?: AbortSignal) => api<P2PLimits>('/wallet/p2p/limits', { signal }),
  p2pOtp: () => api<Schema<'MaskedEmail'>>('/wallet/p2p/otp', { method: 'POST' }),
  p2pSend: (to_code: string, amount: number, otp: string) =>
    api<Schema<'P2PSent'>>('/wallet/p2p', { json: { to_code, amount, otp } }),
};

export type MyWithdrawal = Schema<'MyWithdrawal'>;
export type P2PLimits = Schema<'P2PLimits'>;
