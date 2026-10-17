import { cx } from '@/lib/cx';

/**
 * Progress bar (theme .bar). `value` and `max` come from the API (for example 1 of 3 spots).
 * The width is display only.
 */
export function Bar({
  value,
  max,
  label,
  gold = false,
  thick = false,
  className,
}: {
  value: number;
  max: number;
  label: string;
  gold?: boolean;
  thick?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cx('flex-none overflow-hidden rounded-full bg-track', thick ? 'h-2.5' : 'h-2', className)}
    >
      <i
        className={cx('block h-full rounded-full', gold ? 'bg-gold' : 'bg-leaf')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
