import { formatMoney, type MoneySign } from '@/lib/money';
import { cx } from '@/lib/cx';

/**
 * Shows a rupee amount exactly as the API sent it. Display only.
 * `colored`: green for money in, red for money out (theme .plus / .minus). The +/− sign is always
 * shown with it, so colour is never the only signal.
 */
export function Money({
  value,
  sign = 'auto',
  colored = false,
  className,
}: {
  value: number | null | undefined;
  sign?: MoneySign;
  colored?: boolean;
  className?: string;
}) {
  const v = value ?? 0;
  const tone = colored && v > 0 ? 'font-bold text-ok' : colored && v < 0 ? 'font-bold text-b' : undefined;
  return (
    <span className={cx('num', tone, className)}>
      {formatMoney(value, colored && sign === 'auto' ? 'always' : sign)}
    </span>
  );
}
