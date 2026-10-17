import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { qk } from '@/api/keys';
import { walletApi, type PaymentRequestForm } from '@/api/wallet';
import { useSingleFlight } from '@/lib/useSingleFlight';
import * as v from '@/lib/validators';
import type { useMyRequests } from './data';

/**
 * UTR + receipt form state and the one-at-a-time send (Add funds, Buy PINs). A lost answer looks at the server's
 * list: if the same UTR is there, it went through; it is never sent again by itself.
 */
export function useUtrSend(requests: ReturnType<typeof useMyRequests>) {
  const qc = useQueryClient();
  const [utr, setUtr] = useState('');
  const [utrErr, setUtrErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);

  const [send, sending] = useSingleFlight(
    async (form: Omit<PaymentRequestForm, 'utr' | 'receipt'>, ok: string, extraValid = true) => {
      setError(null);
      setDone(null);
      const u = v.utr.safeParse(utr);
      setUtrErr(u.success ? null : (u.error.issues[0]?.message ?? 'Enter the UTR.'));
      if (!file) setFileErr('Add the payment receipt or screenshot.');
      if (!u.success || !file || !extraValid) return false;
      try {
        await walletApi.paymentRequest({ ...form, utr: u.data, receipt: file });
        setUtr('');
        setFile(null);
        setDone(ok);
        return true;
      } catch (e) {
        const rows = (await requests.refetch()).data?.rows ?? [];
        if (
          e instanceof ApiError &&
          e.isNoAnswer &&
          rows.some((r) => r.utr === u.data && r.status === 'pending')
        ) {
          setUtr('');
          setFile(null);
          setDone(ok);
          return true;
        }
        setError(e);
        return false;
      } finally {
        await qc.invalidateQueries({ queryKey: qk.paymentRequests(form.purpose) });
      }
    },
  );

  return {
    utr,
    setUtr: (x: string) => (setUtr(x), setUtrErr(null), setDone(null)),
    utrErr,
    file,
    setFile: (f: File | null, problem: string | null) => (setFile(f), setFileErr(problem), setDone(null)),
    fileErr,
    error,
    done,
    send,
    sending,
  };
}
