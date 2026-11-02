// All TanStack Query keys in one place. Money screens use keys listed in MONEY_KEYS (queryClient.ts).
export const qk = {
  me: ['me'] as const,
  config: ['config'] as const,
  company: ['company'] as const,
  videosToday: ['videos', 'today'] as const,
  videosHistory: (days: number) => ['videos', 'history', days] as const,
  paymentRequests: (purpose: string) => ['payment-requests', purpose] as const,
  pins: (tab: string) => ['pins', tab] as const,
  wallet: ['wallet'] as const,
  // Cash Book: every key starts with 'cashbook', so one invalidate refreshes all its lists and totals.
  cashbook: ['cashbook'] as const,
  cbHome: ['cashbook', 'home'] as const,
  cbBooks: (businessId: number) => ['cashbook', 'books', businessId] as const,
  cbBook: (id: number) => ['cashbook', 'book', id] as const,
  cbEntries: (id: number, search: string) => ['cashbook', 'entries', id, search] as const,
};
