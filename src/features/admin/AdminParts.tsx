import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, Chip, Note } from '@/components/ui';
import { downloadFile } from '@/lib/download';
import { formatCount } from '@/lib/money';
import { cx } from '@/lib/cx';

// Small admin building blocks from theme.css: .mtop, .kpis/.kpi, .panel, table.t, .pager.

export function AdminTitle({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="m-0 text-[22px] leading-[1.2] font-bold desk:text-[26px]">{title}</h1>
        {sub && <p className="mt-0.5 mb-0 text-[14.5px] text-mut">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-1.5">{actions}</div>}
    </div>
  );
}

export function Kpis({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 desk:grid-cols-[repeat(auto-fit,minmax(190px,1fr))] desk:gap-3.5">
      {children}
    </div>
  );
}

export function Kpi({
  label,
  value,
  small,
  alert,
  to,
}: {
  label: string;
  value: ReactNode;
  small?: ReactNode;
  alert?: boolean;
  to?: string;
}) {
  const cls = cx(
    'flex min-w-0 flex-col gap-1 rounded-[14px] border p-3 text-ink no-underline desk:p-4',
    alert ? 'border-[#E9C46A] bg-[#FFFBEF]' : 'border-line bg-white',
  );
  const body = (
    <>
      <span className="text-[13.5px] text-mut">{label}</span>
      <b className={cx('num text-[22px] leading-[1.2] desk:text-[26px]', alert && 'text-w')}>{value}</b>
      {small && <small className="text-[12.5px] text-mut">{small}</small>}
    </>
  );
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Panel({
  title,
  right,
  children,
  className,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        'flex min-w-0 flex-col gap-3.5 rounded-[14px] border border-line bg-white p-4 desk:p-[18px]',
        className,
      )}
    >
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {typeof title === 'string' ? <h2 className="m-0 text-[17px] font-bold">{title}</h2> : title}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/** Filters of a list in one row above its table (they wrap on a phone). Put it first inside the list's Panel. */
export function FilterBar({ children, boxed = false }: { children: ReactNode; boxed?: boolean }) {
  return (
    <div
      role="group"
      aria-label="Filters"
      className={cx(
        'flex flex-wrap items-end gap-3',
        // boxed: on its own above a list + side panel (Payments, Withdrawals, Complaints)
        boxed ? 'rounded-[14px] border border-line bg-white p-3.5 desk:p-4' : 'border-b border-line2 pb-4',
      )}
    >
      {children}
    </div>
  );
}

/** Table that scrolls sideways on a phone (theme .tw + table.t). */
export function Table({
  head,
  children,
  min = 760,
}: {
  head: ReactNode[];
  children: ReactNode;
  min?: number;
}) {
  // On a laptop (>= 1280 px) a table that fits does not scroll by itself, so its header can stick under the top bar.
  const fits = min <= 900;
  return (
    <div
      className={cx('min-w-0 overflow-x-auto', fits && 'wide:overflow-visible')}
      // A sideways-scrolling area must be reachable with the keyboard (WCAG / axe: scrollable-region-focusable).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      role="region"
      aria-label="Table"
    >
      <table
        className="w-full border-collapse text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-tint"
        style={{ minWidth: min }}
      >
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className={cx(
                  'border-b border-line bg-[#FAFCF9] px-2.5 py-[9px] text-left text-[12.5px] font-semibold whitespace-nowrap text-mut',
                  fits && 'wide:sticky wide:top-16 wide:z-10',
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const td = 'border-b border-line2 px-2.5 py-[11px] align-middle';

export function AdminSoon({ title, text }: { title: string; text?: string }) {
  return (
    <>
      <AdminTitle title={title} />
      <div className="flex items-center gap-2.5">
        <Chip tone="muted">Coming soon</Chip>
      </div>
      <Note>
        {text ??
          'This admin screen is being built. Its backend is ready; the screen comes in the admin phase.'}
      </Note>
    </>
  );
}

/** "1–20 of 312 · Previous / Next" under an admin list. Pair it with usePageClamp in the screen. */
export function Pager({
  page,
  size,
  total,
  onPage,
}: {
  page: number;
  size: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const last = Math.max(1, Math.ceil(total / size));
  if (total <= 0 || page > last) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 text-[13.5px] text-mut">
      <span>
        {formatCount((page - 1) * size + 1)}–{formatCount(Math.min(page * size, total))} of{' '}
        {formatCount(total)}
      </span>
      {last > 1 && (
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Previous
          </Button>
          <Button size="sm" disabled={page >= last} onClick={() => onPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

/** "Download Excel": the backend's CSV export (opens in Excel), fetched with the admin token. */
export function CsvButton({
  name,
  query = {},
  label = 'Download Excel',
}: {
  name: string;
  query?: Record<string, string | undefined>;
  label?: string;
}) {
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          setErr(null);
          try {
            await downloadFile(`/admin/exports/${name}.csv`, query, `treeway-${name}.csv`);
          } catch (e) {
            setErr((e as Error).message);
          }
        }}
      >
        {label}
      </Button>
      {err && (
        <span role="alert" className="text-[12.5px] font-semibold text-b">
          {err}
        </span>
      )}
    </span>
  );
}
