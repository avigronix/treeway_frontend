import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { errorText } from '@/lib/errorText';
import { Button } from './Button';
import { Note } from './Note';

// ---------------------------------------------------------------- loading

/** A grey shimmering block. Use these, not spinners, while lists and cards load. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cx('skeleton block rounded-lg', className ?? 'h-4 w-full')} />;
}

/** A card-like list of skeleton rows, with a hidden "Loading" for screen readers. */
export function SkeletonList({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div aria-busy="true" className={cx('flex flex-col rounded-2xl border border-line bg-card', className)}>
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex min-h-[58px] items-center justify-between gap-2.5 border-b border-line2 px-3.5 py-3 last:border-b-0"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- empty

/** The one empty state: icon + one line (+ an optional line and action). */
export function Empty({ title, text, action }: { title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-field bg-card px-4 py-7 text-center">
      <span
        aria-hidden="true"
        className="mb-1 flex size-11 items-center justify-center rounded-full bg-soft text-g"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
          <path d="M3 13h5l1 3h6l1-3h5" />
        </svg>
      </span>
      <b className="text-[14.5px]">{title}</b>
      {text && <span className="text-[13px] text-mut">{text}</span>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- error

/**
 * Shows an error in place. `onRetry` is offered only when trying again is safe
 * (loading data, or a 409 "Busy"). Never pass it for a money action that got no answer: refresh instead.
 */
export function ErrorBox({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => unknown;
  className?: string;
}) {
  return (
    <Note tone="bad" role="alert" className={cx('flex flex-col gap-2', className)}>
      <span>{errorText(error)}</span>
      {onRetry && (
        <Button variant="danger" size="sm" className="self-start" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Note>
  );
}
