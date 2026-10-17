import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, adminKeys } from '@/api/admin';
import { refreshMoney } from '@/api/queryClient';

type Q = Record<string, string | number | undefined>;

export const useAdminDashboard = () =>
  useQuery({
    queryKey: adminKeys.dashboard,
    queryFn: ({ signal }) => adminApi.dashboard(signal),
    refetchInterval: 60_000,
  });

export const usePayments = (q: Q) =>
  useQuery({
    queryKey: adminKeys.payments(q),
    queryFn: ({ signal }) => adminApi.paymentRequests(q, signal),
    placeholderData: (p) => p,
  });

export const useWithdrawals = (q: Q) =>
  useQuery({
    queryKey: adminKeys.withdrawals(q),
    queryFn: ({ signal }) => adminApi.withdrawals(q, signal),
    placeholderData: (p) => p,
  });

export const useMembers = (q: Q) =>
  useQuery({
    queryKey: adminKeys.members(q),
    queryFn: ({ signal }) => adminApi.members(q, signal),
    placeholderData: (p) => p,
  });

export const useAdminPins = (q: Q) =>
  useQuery({
    queryKey: adminKeys.pins(q),
    queryFn: ({ signal }) => adminApi.pins(q, signal),
    placeholderData: (p) => p,
  });

export const useMember = (code: string) =>
  useQuery({ queryKey: adminKeys.member(code), queryFn: ({ signal }) => adminApi.member(code, signal) });

/** After any admin money action: every 'admin' list, the dashboard and all member money views. */
export function useAdminRefresh() {
  const qc = useQueryClient();
  return () => refreshMoney(qc);
}
