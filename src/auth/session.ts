import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { qk } from '@/api/keys';
import { usersApi } from '@/api/users';
import { clearAuthReason, clearToken, setToken, useToken } from './token';

/** The logged-in person (GET /users/me). Disabled when there is no token. */
export function useMe(opts: { refetchInterval?: number } = {}) {
  const token = useToken();
  return useQuery({
    queryKey: qk.me,
    queryFn: ({ signal }) => usersApi.me(signal),
    enabled: !!token,
    staleTime: 30_000,
    refetchInterval: opts.refetchInterval,
  });
}

/** After a successful login: keep the token and drop anything cached from a previous person. */
export function startSession(qc: QueryClient, token: string): void {
  qc.clear();
  clearAuthReason();
  setToken(token);
}

export function endSession(qc: QueryClient): void {
  clearToken();
  qc.clear();
}

export function useEndSession() {
  const qc = useQueryClient();
  return () => endSession(qc);
}
