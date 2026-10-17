import { api, apiEnvelope } from './client';
import type { Schema } from './schema';

// Admin APIs (role ADMIN). Types are generated from the backend OpenAPI.
export type AdminDashboard = Schema<'AdminDashboard-Output'>;
export type AdminPaymentPage = Schema<'AdminPaymentPage'>;
export type AdminPaymentRequest = Schema<'AdminPaymentRequest'>;
export type AdminWithdrawalsPage = Schema<'AdminWithdrawalsPage'>;
export type AdminWithdrawal = Schema<'AdminWithdrawal'>;
export type AdminMembersPage = Schema<'AdminMembersPage'>;
export type AdminMemberRow = Schema<'AdminMemberRow'>;
export type AdminMemberDetail = Schema<'AdminMemberDetail-Output'>;
export type AdminLedgerRow = Schema<'AdminLedgerRow'>;
export type ApprovalWaiting = Schema<'ApprovalWaiting'>;
export type AdminSettings = Schema<'AdminSettings'>;
export type AdminVideos = Schema<'AdminVideos'>;
export type VideoItem = Schema<'VideoItemModel'>;
export type CompanyDetail = Schema<'CompanyDetail'>;
/** Text fields of the company details form (the QR is a file). */
export type CompanyFields = Omit<CompanyDetail, 'qr_path'>;

type Q = Record<string, string | number | undefined>;

export const adminApi = {
  dashboard: (signal?: AbortSignal) => api<AdminDashboard>('/admin/dashboard', { signal }),

  paymentRequests: (q: Q, signal?: AbortSignal) =>
    api<AdminPaymentPage>('/admin/payment-requests', { query: { limit: 20, ...q }, signal }),
  /** 200 = done; 202 = a second admin must approve (big amounts). The status tells which. */
  reviewPayment: (id: number, action: 'approve' | 'reject', remark?: string) =>
    apiEnvelope<ApprovalWaiting | unknown[]>(`/admin/payment-requests/${id}/review`, {
      json: { action, remark: remark || null },
    }),

  withdrawals: (q: Q, signal?: AbortSignal) =>
    api<AdminWithdrawalsPage>('/admin/withdrawals', { query: { limit: 20, ...q }, signal }),
  /** "paid" needs the UTR of the bank payment; "reject" needs a reason (money goes back to the member). */
  reviewWithdrawal: (
    id: number,
    body: { action: 'paid'; utr: string } | { action: 'reject'; remark: string },
  ) => api<unknown>(`/admin/withdrawals/${id}/review`, { json: body }),

  members: (q: Q, signal?: AbortSignal) =>
    api<AdminMembersPage>('/admin/members', { query: { limit: 20, ...q }, signal }),
  member: (code: string, signal?: AbortSignal) =>
    api<AdminMemberDetail>(`/admin/members/${encodeURIComponent(code)}`, { signal }),
  /** group: 'income' = only income rows (Income tab). Hidden admin rows are included. */
  memberHistory: (code: string, cursor: string | null, signal?: AbortSignal, group?: string) =>
    api<Schema<'Page_AdminLedgerRow_'>>(`/admin/members/${encodeURIComponent(code)}/history`, {
      query: { cursor, limit: 20, group },
      signal,
    }),
  memberSuper3: (code: string, signal?: AbortSignal) =>
    api<Schema<'Super3Status-Output'>>(`/admin/members/${encodeURIComponent(code)}/super3`, { signal }),
  /** Adds the opposite entry (never deletes). Income also takes back its TDS / service rows. */
  reverse: (ledgerId: number, reason: string) =>
    apiEnvelope<Schema<'Reversed'> | ApprovalWaiting>('/admin/reverse', {
      json: { ledger_id: ledgerId, reason },
    }),
  memberTeam: (code: string, q: Q, signal?: AbortSignal) =>
    api<Schema<'Page_TeamMember_'>>(`/admin/members/${encodeURIComponent(code)}/team`, {
      query: { limit: 20, ...q },
      signal,
    }),
  setMemberStatus: (code: string, action: 'block' | 'unblock', remark: string) =>
    api<unknown>(`/admin/members/${encodeURIComponent(code)}/status`, { json: { action, remark } }),
  /** Ends the member's sessions; the old email gets a notice. 409 if the number has another ID. */
  changeMemberMobile: (code: string, mobile: string, remark: string) =>
    api<unknown>(`/admin/members/${encodeURIComponent(code)}/mobile`, { json: { mobile, remark } }),
  /** Step 1: an OTP to the NEW email (the member reads it out). */
  memberEmailOtp: (code: string, email: string) =>
    api<Schema<'MaskedEmail'>>(`/admin/members/${encodeURIComponent(code)}/email/otp`, { json: { email } }),
  /** Step 2: that OTP confirms the new email; the old email gets a notice. */
  changeMemberEmail: (code: string, email: string, otp: string, remark: string) =>
    api<unknown>(`/admin/members/${encodeURIComponent(code)}/email`, { json: { email, otp, remark } }),
  /** Mails the member a link (24 h, once). The answer never has the link. */
  sendPasswordReset: (code: string, remark: string) =>
    api<Schema<'ResetLinkSent'>>(`/admin/members/${encodeURIComponent(code)}/password-reset`, {
      json: { remark },
    }),

  /** All settings (money in PAISE here), what is locked and why, and who changed each one last. */
  settings: (signal?: AbortSignal) => api<AdminSettings>('/admin/settings', { signal }),
  /** Only the fields sent change. qr = a new picture; removeQr clears it. The server checks every format. */
  saveCompany: (fields: Partial<CompanyFields>, qr: File | null, removeQr: boolean) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.set(k, v ?? '');
    if (qr) form.set('qr', qr);
    else if (removeQr) form.set('qr_remove', '1');
    return api<CompanyDetail>('/admin/company/detail', { method: 'PATCH', form, timeoutMs: 60_000 });
  },

  /** One setting key. Groups (dicts) send all their fields; money in PAISE (whole numbers). */
  saveSetting: (key: string, value: unknown) =>
    api<Record<string, unknown>>('/admin/settings', { method: 'PUT', json: { key, value } }),

  /** Hidden debit: the member never sees it. 202 only if 2-admin approval is switched on. */
  debit: (body: Schema<'AdminDebitModel'>) =>
    apiEnvelope<Schema<'BalanceAfter'> | ApprovalWaiting>('/admin/wallet/debit', { json: body }),

  admins: (signal?: AbortSignal) => api<Schema<'AdminAccount'>[]>('/admin/admins', { signal }),
  createAdmin: (body: Schema<'AdminCreateModel'>) =>
    api<Schema<'UserCodeOnly'>>('/admin/admins', { json: body }),
  /** Main admin only (the server answers 403 to others). */
  setAdminStatus: (code: string, action: 'block' | 'unblock', remark: string) =>
    api<unknown>(`/admin/admins/${encodeURIComponent(code)}/status`, { json: { action, remark } }),

  pins: (q: Q, signal?: AbortSignal) =>
    api<Schema<'AdminPinsPage'>>('/admin/pins', { query: { limit: 20, ...q }, signal }),
  /** PINs for a cash payment taken in person. The reason is saved in the audit log. */
  issuePins: (body: Schema<'AdminPinIssueModel'>) =>
    apiEnvelope<Schema<'PinCodes'> | ApprovalWaiting>('/admin/pins/issue', { json: body }),

  super3Stats: (signal?: AbortSignal) => api<Schema<'Super3Stats'>>('/admin/super3/stats', { signal }),
  /** Any spot on any board (members see only their own trees; the admin sees all). */
  super3Tree: (board: number, position: number, signal?: AbortSignal) =>
    api<Schema<'Super3Tree-Output'>>('/super3/tree', { query: { board, position }, signal }),

  /** Profit and loss of one month (YYYY-MM, IST). TDS, holds and pools are never profit. */
  pnl: (month: string, signal?: AbortSignal) =>
    api<Schema<'Pnl'>>('/admin/pnl', { query: { month }, signal }),
  payoutPreview: (month: string, signal?: AbortSignal) =>
    api<Schema<'PayoutPreview-Output'>>(`/admin/monthly-payouts/${month}/preview`, { signal }),
  /** Pays royalty + S3 Level of the month. Safe to press again: a paid month is never paid twice. */
  payMonth: (month: string) =>
    api<Record<string, Schema<'MonthlyRun'>>>(`/admin/monthly-payouts/${month}/pay`, { method: 'POST' }),
  payoutRuns: (signal?: AbortSignal) =>
    api<Schema<'Page_MonthlyRunRow_'>>('/admin/monthly-payouts', { query: { limit: 12 }, signal }),
  singleLegRuns: (signal?: AbortSignal) =>
    api<Schema<'Page_SingleLegRun_'>>('/admin/single-leg/runs', { query: { limit: 14 }, signal }),
  tdsReport: (fy: string, quarter: string | undefined, page: number, signal?: AbortSignal) =>
    api<Schema<'TdsReport'>>('/admin/reports/tds', { query: { fy, quarter, page, limit: 20 }, signal }),
  tdsNoPan: (fy: string, quarter: string | undefined, signal?: AbortSignal) =>
    api<Schema<'Page_TdsNoPan_'>>('/admin/reports/tds-no-pan', { query: { fy, quarter, limit: 20 }, signal }),
  incomeReport: (from: string, to: string, signal?: AbortSignal) =>
    api<Schema<'IncomeReport'>>('/admin/reports/income', { query: { from, to }, signal }),
  joiningsReport: (from: string, to: string, group: 'day' | 'month', signal?: AbortSignal) =>
    api<Schema<'JoiningsReport'>>('/admin/reports/joinings', { query: { from, to, group }, signal }),
  withdrawalsReport: (from: string, to: string, signal?: AbortSignal) =>
    api<Schema<'WithdrawalsReport'>>('/admin/reports/withdrawals', { query: { from, to }, signal }),
  turnoverReport: (fy: string, signal?: AbortSignal) =>
    api<Schema<'TurnoverReport'>>('/admin/reports/turnover', { query: { fy }, signal }),

  audit: (cursor: string | null, signal?: AbortSignal) =>
    api<Schema<'Page_AuditRow_'>>('/admin/audit', { query: { cursor, limit: 50 }, signal }),

  /** One day's videos (default: tomorrow, IST) and the days still missing links. */
  videos: (day: string | undefined, signal?: AbortSignal) =>
    api<AdminVideos>('/admin/videos', { query: { day }, signal }),
  saveVideos: (day: string, videos: VideoItem[]) =>
    api<Schema<'MissingDays'>>(`/admin/videos/${day}`, { method: 'PUT', json: { videos } }),
};

/** Admin query keys all start with 'admin' (a MONEY_KEYS root): refreshMoney() refreshes them too. */
export const adminKeys = {
  dashboard: ['admin', 'dashboard'] as const,
  payments: (q: Q) => ['admin', 'payments', q] as const,
  withdrawals: (q: Q) => ['admin', 'withdrawals', q] as const,
  members: (q: Q) => ['admin', 'members', q] as const,
  member: (code: string) => ['admin', 'member', code] as const,
  pins: (q: Q) => ['admin', 'pins', q] as const,
  super3: ['admin', 'super3'] as const,
  super3Tree: (board: number, position: number) => ['admin', 'super3', 'tree', board, position] as const,
  settings: ['admin', 'settings'] as const,
  admins: ['admin', 'admins'] as const,
  audit: ['admin', 'audit'] as const,
  videos: (day: string | undefined) => ['admin', 'videos', day ?? 'tomorrow'] as const,
};
