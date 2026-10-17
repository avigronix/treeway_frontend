import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

// From theme.css: .note, .note.warn, .note.bad
const tones = {
  info: 'bg-soft text-[#2F3F33]',
  warn: 'bg-wbg text-[#5C3800]',
  bad: 'bg-bbg text-[#5C1A12]',
} as const;

export function Note({
  tone = 'info',
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: keyof typeof tones }) {
  return (
    <div
      {...rest}
      className={cx('rounded-xl px-3 py-2.5 text-[13px] leading-[1.45]', tones[tone], className)}
    />
  );
}
