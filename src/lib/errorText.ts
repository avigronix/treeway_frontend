import { ApiError, MSG } from '@/api/client';

/** The message to show for any error. ApiError messages come from the server and are already simple English. */
export function errorText(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return MSG.server;
}
