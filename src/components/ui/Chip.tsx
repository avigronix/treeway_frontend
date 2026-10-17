import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export type ChipTone = 'ok' | 'wait' | 'bad' | 'muted' | 'gold' | 'blue';

// From theme.css: .chip .c-ok .c-w .c-b .c-m .c-gold .c-blue
const tones: Record<ChipTone, string> = {
  ok: 'bg-okbg text-ok',
  wait: 'bg-wbg text-w',
  bad: 'bg-bbg text-b',
  muted: 'bg-mbg text-lab',
  gold: 'bg-goldbg text-goldink',
  blue: 'bg-bluebg text-blue',
};

/** Status label. Always has text, so the colour is never the only signal. */
export function Chip({
  tone = 'muted',
  className,
  children,
}: {
  tone?: ChipTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex flex-none items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
