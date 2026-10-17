import { useQuery } from '@tanstack/react-query';
import { qk } from '@/api/keys';
import { pinsApi, type PinTab } from '@/api/pins';
import { walletApi, type PaymentPurpose } from '@/api/wallet';

// Query hooks for the money action screens. Keys start with MONEY_KEYS roots (queryClient.ts), so every money
// action's refreshMoney() refreshes them too.

export const useWithdrawals = () =>
  useQuery({ queryKey: ['withdrawals', 'mine'], queryFn: ({ signal }) => walletApi.withdrawals(signal) });

export const useP2PLimits = () =>
  useQuery({ queryKey: ['p2p', 'limits'], queryFn: ({ signal }) => walletApi.p2pLimits(signal) });

export const useMyRequests = (purpose: PaymentPurpose) =>
  useQuery({
    queryKey: qk.paymentRequests(purpose),
    queryFn: ({ signal }) => walletApi.paymentRequests(purpose, signal),
  });

export const usePins = (tab: PinTab) =>
  useQuery({ queryKey: qk.pins(tab), queryFn: ({ signal }) => pinsApi.list(tab, signal) });
