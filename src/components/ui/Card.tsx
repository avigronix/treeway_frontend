import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';

// From theme.css: .card, .card.flat, .card.sel, .hero, .sec-t, .kv, .hr

export function Card({
  flat = false,
  selected = false,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { flat?: boolean; selected?: boolean }) {
  return (
    <div
      {...rest}
      className={cx(
        'flex min-w-0 flex-col rounded-2xl bg-card',
        selected ? 'border-2 border-g' : 'border border-line',
        flat ? 'gap-0 p-0' : 'gap-2.5 p-3.5',
        className,
      )}
    />
  );
}

/** The big green card (Income Wallet on Home). */
export function Hero({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cx('flex flex-col gap-1.5 rounded-[18px] bg-g p-[18px] text-white', className)}
    />
  );
}

/** Small uppercase section title. */
export function SectionTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 {...rest} className={cx('m-0 text-xs font-bold tracking-[.07em] text-mut uppercase', className)}>
      {children}
    </h2>
  );
}

/** Key / value row: "Amount ........ ₹1,000" */
export function KeyValue({
  k,
  children,
  className,
}: {
  k: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex justify-between gap-2.5 text-sm', className)}>
      <span className="text-mut">{k}</span>
      <b className="num text-right">{children}</b>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cx('m-0 h-px flex-none border-0 bg-line', className)} />;
}
