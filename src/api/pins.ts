import { api } from './client';
import type { Schema } from './schema';

export type MyPinsPage = Schema<'MyPinsPage'>;
export type PinTab = 'ready' | 'received' | 'sent' | 'used';
export type PinReady = Schema<'PinReady'>;
export type PinReceived = Schema<'PinReceived'>;
export type PinSent = Schema<'PinSent'>;
export type PinUsed = Schema<'PinUsed'>;
export type MemberLookup = Schema<'MemberLookup'>;

export const pinsApi = {
  list: (tab: PinTab, signal?: AbortSignal) =>
    api<MyPinsPage>('/pins', { query: { tab, limit: 20 }, signal }),
  /** Uses one of MY ready PINs to activate my own ID or an inactive ID in my team. */
  activate: (user_code: string) => api<Schema<'PinActivated'>>('/pins/activate', { json: { user_code } }),
  /** Sends `qty` of my ready PINs to any member (not blocked). */
  transfer: (to_code: string, qty: number) => api<unknown>('/pins/transfer', { json: { to_code, qty } }),
  /** ₹987 each from the Fund Wallet; the PINs are mine at once. */
  buyFromFund: (qty: number) => api<Schema<'PinsBought'>>('/pins/buy-from-fund', { json: { qty } }),
  /** Name check before P2P / sending PINs / activating: name, status, my_level, is_my_sponsor. 404 = no such ID. */
  lookup: (code: string, signal?: AbortSignal) =>
    api<MemberLookup>(`/users/member/${encodeURIComponent(code)}`, { signal }),
};
