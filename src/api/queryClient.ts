import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: true,
        // Retry reads only when the server did not answer or failed (never on 4xx).
        retry: (count, err) =>
          count < 2 && err instanceof ApiError && (err.status === 0 || err.status >= 500),
      },
      // Money actions are NEVER retried by the library. On no answer, the screen refreshes data instead.
      mutations: { retry: false },
    },
  });
}

// Query keys that show money. Every money action must call refreshMoney() when it finishes (ok or not).
export const MONEY_KEYS = [
  ['wallet'],
  ['history'],
  ['income'],
  ['dashboard'],
  ['pins'],
  ['withdrawals'],
  ['payment-requests'],
  ['p2p'],
  ['super3'],
  ['shop'],
  ['doctor'],
  ['admin'],
] as const;

export function refreshMoney(qc: QueryClient): Promise<void> {
  return Promise.all(MONEY_KEYS.map((queryKey) => qc.invalidateQueries({ queryKey: [...queryKey] }))).then(
    () => undefined,
  );
}
