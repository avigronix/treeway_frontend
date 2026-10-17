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
};
