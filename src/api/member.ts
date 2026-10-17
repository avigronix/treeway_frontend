import { api } from './client';
import type { Page, Schema } from './schema';

// Member read APIs for F2 (home, income, team, wallet). Types are generated from the backend OpenAPI.
export type WalletSummary = Schema<'WalletSummary'>;
export type LedgerRow = Schema<'LedgerRow'>;
export type IncomeSummary = Schema<'IncomeSummary'>;
export type LevelIncomePage = Schema<'LevelIncomePage'>;
export type TeamSummary = Schema<'TeamSummary'>;
export type TeamMember = Schema<'TeamMember'>;
export type MemberDashboard = Schema<'MemberDashboard'>;
export type Super3Status = Schema<'Super3Status-Output'>;
export type Journey = Schema<'Journey'>;

export type IncomePeriod = 'today' | 'week' | 'month' | 'all';
export type HistoryGroup = 'income' | 'funds' | 'p2p' | 'withdrawal' | 'product' | 'shop' | 'gullak';
export interface HistoryFilter {
  group?: HistoryGroup;
  direction?: 'in' | 'out';
  type?: string;
}

export const memberApi = {
  walletSummary: (signal?: AbortSignal) => api<WalletSummary>('/wallet/summary', { signal }),
  history: (f: HistoryFilter, cursor: string | null, signal?: AbortSignal) =>
    api<Page<LedgerRow>>('/wallet/history', { query: { ...f, cursor, limit: 20 }, signal }),
  incomeSummary: (period: IncomePeriod, signal?: AbortSignal) =>
    api<IncomeSummary>('/wallet/income-summary', { query: { period }, signal }),
  levelIncome: (signal?: AbortSignal) =>
    api<LevelIncomePage>('/wallet/level-income', { query: { limit: 1 }, signal }),
  teamSummary: (signal?: AbortSignal) => api<TeamSummary>('/users/team-summary', { signal }),
  teamMembers: (
    q: { level?: number; search?: string; page: number; status?: 'active' | 'inactive'; limit?: number },
    signal?: AbortSignal,
  ) => api<Page<TeamMember>>('/users/team-members', { query: { limit: 5, ...q }, signal }),
  dashboard: (signal?: AbortSignal) => api<MemberDashboard>('/dashboard', { signal }),
  super3Status: (signal?: AbortSignal) => api<Super3Status>('/super3/status', { signal }),
  /** A spot and 2 rows below it. 403 when the spot is not under one of my own spots. */
  super3Tree: (board: number, position: number, signal?: AbortSignal) =>
    api<Schema<'Super3Tree-Output'>>('/super3/tree', { query: { board, position }, signal }),
  complaintsMatrix: (signal?: AbortSignal) => api<Record<string, number>>('/complaints/matrix', { signal }),
  rank: (signal?: AbortSignal) => api<MyRank>('/rank/me', { signal }),
  topSponsors: (signal?: AbortSignal) => api<TopSponsor[]>('/users/top-sponsors', { signal }),
  gullak: (signal?: AbortSignal) => api<Schema<'GullakView'>>('/gullak', { signal }),
};

export type MyRank = Schema<'MyRank-Output'>;
export type TopSponsor = Schema<'TopSponsor'>;
