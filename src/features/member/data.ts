import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/api/keys';
import {
  memberApi,
  type HistoryFilter,
  type IncomePeriod,
  type Journey,
  type Super3Status,
} from '@/api/member';
import { videosApi } from '@/api/videos';

// Query hooks for member screens. Keys start with the MONEY_KEYS roots (queryClient.ts), so every money
// action's refreshMoney() refreshes them: wallet, history, income, dashboard, super3.

export const useWalletSummary = () =>
  useQuery({ queryKey: ['wallet', 'summary'], queryFn: ({ signal }) => memberApi.walletSummary(signal) });

export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: ({ signal }) => memberApi.dashboard(signal) });

export const useIncomeSummary = (period: IncomePeriod) =>
  useQuery({
    queryKey: ['income', 'summary', period],
    queryFn: ({ signal }) => memberApi.incomeSummary(period, signal),
  });

export const useLevelIncome = () =>
  useQuery({ queryKey: ['income', 'level'], queryFn: ({ signal }) => memberApi.levelIncome(signal) });

export const useSuper3Status = () =>
  useQuery({ queryKey: ['super3', 'status'], queryFn: ({ signal }) => memberApi.super3Status(signal) });

export const useTeamSummary = () =>
  useQuery({
    queryKey: ['team', 'summary'],
    queryFn: ({ signal }) => memberApi.teamSummary(signal),
    staleTime: 60_000,
  });

export const useTeamMembers = (q: { level?: number; search?: string; page: number }) =>
  useQuery({
    queryKey: ['team', 'members', q],
    queryFn: ({ signal }) => memberApi.teamMembers(q, signal),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

export const useComplaintsMatrix = () =>
  useQuery({
    queryKey: ['complaints', 'matrix'],
    queryFn: ({ signal }) => memberApi.complaintsMatrix(signal),
    staleTime: 60_000,
  });

/** Wallet / income history, newest first, next pages by cursor ("Show more"). */
export const useHistory = (f: HistoryFilter) =>
  useInfiniteQuery({
    queryKey: ['history', f],
    queryFn: ({ pageParam, signal }) => memberApi.history(f, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });

/** The journey shown on Home: the main one still on the boards (not a recycle ID). */
export function mainJourney(s: Super3Status | undefined): Journey | undefined {
  return s?.journeys.find((j) => j.kind === 'main' && !j.finished) ?? s?.journeys.find((j) => !j.finished);
}

export function useVideosToday() {
  return useQuery({
    queryKey: qk.videosToday,
    queryFn: ({ signal }) => videosApi.today(signal),
    staleTime: 60_000,
  });
}

export const useTopSponsors = () =>
  useQuery({
    queryKey: ['team', 'top-sponsors'],
    queryFn: ({ signal }) => memberApi.topSponsors(signal),
    staleTime: 5 * 60_000,
  });
