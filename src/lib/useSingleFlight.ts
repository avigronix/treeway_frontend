import { useCallback, useRef, useState } from 'react';

/**
 * Runs `fn` at most once at a time. Extra calls while it runs are ignored (not queued).
 * Use it for every money action: a double tap must send ONE request.
 * The lock is a ref, so even two taps in the same frame (before React re-renders) cannot both pass.
 */
export function useSingleFlight<A extends unknown[], R>(
  fn: (...args: A) => R | Promise<R>,
): [run: (...args: A) => Promise<R | undefined>, busy: boolean] {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      if (lock.current) return undefined;
      lock.current = true;
      setBusy(true);
      try {
        return await fn(...args);
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [fn],
  );

  return [run, busy];
}
