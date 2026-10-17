import { useCallback, useEffect, useRef } from 'react';
import { usersApi } from '@/api/users';
import { parseChallenge, powSearch } from './pow';

export type PowAnswer = { pow_challenge: string; pow_nonce: string };

/** Solves in a Web Worker; without workers (tests, very old browsers) in small steps on the main thread. */
export function solveChallenge(challenge: string): Promise<string> {
  if (typeof Worker !== 'undefined') {
    return new Promise((resolve, reject) => {
      const w = new Worker(new URL('./pow.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<{ nonce: string }>) => {
        resolve(e.data.nonce);
        w.terminate();
      };
      w.onerror = (e) => {
        w.terminate();
        reject(e);
      };
      w.postMessage({ challenge });
    });
  }
  const { salt, bits } = parseChallenge(challenge);
  return new Promise((resolve) => {
    let start = 0;
    const step = () => {
      const n = powSearch(salt, bits, start, 5_000);
      if (n !== null) resolve(String(n));
      else {
        start += 5_000;
        setTimeout(step, 0);
      }
    };
    step();
  });
}

/**
 * Sign-up bot protection: as soon as the form opens, get a challenge and solve it in the background (1–2 s on a
 * cheap phone). answer() waits for it and starts the next one (a challenge works once, for 10 minutes).
 */
export function usePow() {
  const job = useRef<Promise<PowAnswer> | null>(null);

  const start = useCallback(() => {
    const p = usersApi
      .registerChallenge()
      .then(async (c) => ({ pow_challenge: c.challenge, pow_nonce: await solveChallenge(c.challenge) }));
    p.catch(() => {
      if (job.current === p) job.current = null; // no answer yet: a new try on submit
    });
    job.current = p;
    return p;
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  /** The answer for this sign-up (waits if the phone is still working on it). Used once. */
  const answer = useCallback(async (): Promise<PowAnswer> => {
    const p = job.current ?? start();
    job.current = null;
    const a = await p;
    start(); // ready for a second try
    return a;
  }, [start]);

  return { answer };
}
