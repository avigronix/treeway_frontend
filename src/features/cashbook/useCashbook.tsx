import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/api/keys';
import { cx } from '@/lib/cx';
import { errorText } from '@/lib/errorText';

// Cash Book hooks and helpers: the action runner (+ toast) and the mobile number check.

export type Notify = (text: string, bad?: boolean) => void;

/** A short message at the bottom of the screen (success or error), gone after 3 s. */
export function useToast(): [ReactNode, Notify] {
  const [toast, setToast] = useState<{ text: string; bad: boolean; n: number } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const notify = useCallback<Notify>(
    (text, bad = false) => setToast((t) => ({ text, bad, n: (t?.n ?? 0) + 1 })),
    [],
  );
  const node = (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4"
    >
      {toast && (
        <span
          key={toast.n}
          role={toast.bad ? 'alert' : 'status'}
          className={cx(
            'rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg',
            toast.bad ? 'bg-red' : 'bg-gt',
          )}
        >
          {toast.text}
        </span>
      )}
    </div>
  );
  return [node, notify];
}

/**
 * Runs one change on the server, then refreshes every Cash Book list and total (ok or not).
 * Returns true when it worked. The Button that calls it also ignores extra taps while it runs.
 */
export function useCbAction(notify: Notify) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.cashbook }),
  });
  return useCallback(
    async (fn: () => Promise<unknown>, ok: string): Promise<boolean> => {
      try {
        await m.mutateAsync(fn);
        notify(ok);
        return true;
      } catch (e) {
        notify(errorText(e), true);
        return false;
      }
    },
    [m, notify],
  );
}

/** Any way a mobile is typed -> its 10 digits, or null. The same rule as the server (models.model.cb_mobile);
 * here only to show the error early, the server decides. */
export function cbMobile(v: string): string | null {
  let d = v.replace(/[^0-9]/g, '');
  if (
    (d.length === 11 && d.startsWith('0')) ||
    (d.length === 12 && d.startsWith('91')) ||
    (d.length === 13 && d.startsWith('091'))
  )
    d = d.slice(-10);
  return /^[6-9][0-9]{9}$/.test(d) ? d : null;
}
