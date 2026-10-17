import { useQuery } from '@tanstack/react-query';
import { qk } from '@/api/keys';
import { walletApi, type MyPaymentRequest } from '@/api/wallet';

/** The member's activation requests, newest first (GET /wallet/payment-requests?purpose=activation). */
export function useActivationRequests() {
  return useQuery({
    queryKey: qk.paymentRequests('activation'),
    queryFn: ({ signal }) => walletApi.paymentRequests('activation', signal),
    staleTime: 0,
  });
}

export function latestRequest(rows: MyPaymentRequest[] | undefined): MyPaymentRequest | undefined {
  return rows?.[0];
}
