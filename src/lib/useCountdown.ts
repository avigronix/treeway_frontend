import { useEffect, useState } from 'react';

/** The server allows one OTP a minute (per purpose). */
export const RESEND_GAP = 60;

/** Seconds left before "Send again" works. start() begins a new wait. */
export function useCountdown(gap = RESEND_GAP): [number, () => void] {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= now) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [until, now]);
  return [
    Math.max(0, Math.ceil((until - now) / 1000)),
    () => {
      const t = Date.now();
      setNow(t);
      setUntil(t + gap * 1000);
    },
  ];
}

/** 42 -> "0:42" */
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
