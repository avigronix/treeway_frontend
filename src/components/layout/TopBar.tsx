import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '@/lib/cx';

// From theme.css: .top, .top .t, .ib, .ib.back
export function TopBar({
  title,
  subtitle,
  back,
  logo = false,
  right,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Path of the back button ("‹"). */
  back?: string;
  logo?: boolean;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cx(
        'flex min-h-[62px] flex-none items-center gap-2 border-b border-line bg-white px-3 py-2',
        className,
      )}
    >
      {back && (
        <Link
          to={back}
          aria-label="Back"
          className="inline-flex size-11 flex-none items-center justify-center rounded-xl text-[30px] leading-none text-g no-underline"
        >
          ‹
        </Link>
      )}
      {logo && (
        <img
          src="/icons/logo-header.webp"
          alt="Treeway"
          width={60}
          height={40}
          className="h-10 w-[60px] object-contain"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="m-0 truncate text-lg leading-[1.25] font-bold">{title}</h1>
        {subtitle && <small className="truncate text-[12.5px] text-mut">{subtitle}</small>}
      </div>
      {right}
    </header>
  );
}

/** Square icon button in the top bar (theme .ib). `dot` shows the red "new" dot. */
export function IconLink({
  to,
  label,
  dot,
  children,
}: {
  to: string;
  label: string;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-label={dot ? `${label} (new)` : label}
      className="relative inline-flex size-11 flex-none items-center justify-center rounded-xl border border-line bg-white text-xl text-ink no-underline"
    >
      {children}
      {dot && (
        <span
          aria-hidden="true"
          className="absolute top-[9px] right-2.5 size-[9px] rounded-full border-2 border-white bg-red"
        />
      )}
    </Link>
  );
}
