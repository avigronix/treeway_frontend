import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Super3Status } from '@/api/member';
import { Button, Money, Skeleton } from '@/components/ui';
import { etaDate } from '@/lib/dates';
import { formatCount, formatMoney } from '@/lib/money';
import { cx } from '@/lib/cx';
import { mainJourney, useVideosToday } from './data';

/** "When will my 3 come?" (theme .eta). ETA date = today + eta_days. An estimate, the server's numbers. */
export function EtaCard({ status, big = false }: { status: Super3Status | undefined; big?: boolean }) {
  const j = mainJourney(status);
  let main: ReactNode;
  if (!status) {
    main = <Skeleton className="h-12 w-full bg-white/10" />;
  } else if (!status.in_super3) {
    main = (
      <span className="text-[13px] text-[#C9DCC5]">
        You have {status.direct_count} direct{status.direct_count === 1 ? '' : 's'}. Super 3 starts with your
        2nd direct.
      </span>
    );
  } else if (!j) {
    main = <span className="text-[13px] text-[#C9DCC5]">All boards done.</span>;
  } else {
    main = (
      <>
        <div className="flex items-end justify-between gap-2.5">
          <div className="flex flex-col">
            <span className="text-[13px] text-[#A9C7A3]">
              Board {j.board}
              {j.position !== null ? ` · spot #${formatCount(j.position)}` : ''}
            </span>
            <span className={cx('font-bold', big ? 'text-[32px]' : 'text-[26px]')}>
              {j.eta_days != null ? `~${j.eta_days} day${j.eta_days === 1 ? '' : 's'}` : 'Waiting for joins'}
            </span>
          </div>
          {j.eta_days != null && <span className="font-bold text-sun">around {etaDate(j.eta_days)} ›</span>}
        </div>
        <div
          className="relative h-2 rounded-full bg-white/15"
          role="progressbar"
          aria-label="Spots filled under you"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={j.children ?? 0}
        >
          <i
            className="absolute inset-y-0 left-0 rounded-full bg-[#5DD27A]"
            style={{ width: `${Math.min(100, ((j.children ?? 0) / 3) * 100)}%` }}
          />
        </div>
      </>
    );
  }
  return (
    <Link
      to="/super3"
      className="flex flex-col gap-2 rounded-[20px] bg-gt px-4 py-3.5 text-white no-underline hover:text-white"
    >
      <div className="flex items-center justify-between gap-2.5">
        <b className="text-[15px]">When will my 3 come?</b>
        <span className="inline-flex items-center gap-1.5 text-xs text-[#A9C7A3]">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-[#5DD27A] shadow-[0_0_0_3px_rgba(93,210,122,.25)]"
          />
          Live
        </span>
      </div>
      {main}
    </Link>
  );
}

/** "Today's videos: Done ✓ · +₹20 · day 37 of 150" from GET /videos/today. */
export function VideosCard({ className }: { className?: string }) {
  const v = useVideosToday().data;
  let head: ReactNode = <Skeleton className="h-5 w-16" />;
  let foot: ReactNode = null;
  if (v) {
    if (v.all_done) {
      head = <b className="text-lg text-ok">Done ✓</b>;
      foot = `${formatMoney(v.reward, 'always')} · day ${v.day_no} of ${v.days_total}`;
    } else if (v.eligible && v.ready) {
      head = (
        <b className="text-lg">
          {v.done_count} of {v.per_day}
        </b>
      );
      foot = `Finish all for ${formatMoney(v.reward)}`;
    } else if (v.day_no !== null && v.day_no > v.days_total) {
      head = <b className="text-lg">Complete</b>;
      foot = `All ${v.days_total} days are over`;
    } else {
      head = <b className="text-lg text-mut">No videos</b>;
      foot = 'Not ready today';
    }
  }
  return (
    <Link
      to="/videos"
      className={cx(
        'flex flex-col gap-0.5 rounded-2xl border border-line bg-card p-3 text-ink no-underline',
        className,
      )}
    >
      <span className="text-xs text-mut">Today's videos</span>
      {head}
      {foot && <span className="text-xs text-mut">{foot}</span>}
    </Link>
  );
}

/** Referral link with Share (phone share sheet) or Copy. Only active IDs have a link (backend rule). */
export function InviteBox({ link, mode }: { link: string | null | undefined; mode: 'share' | 'copy' }) {
  const [state, setState] = useState<'idle' | 'done' | 'fail'>('idle');
  if (!link) return <Skeleton className="h-11 w-full" />;
  const short = link.replace(/^https?:\/\//, '');

  async function act() {
    try {
      if (mode === 'share' && typeof navigator.share === 'function') {
        await navigator.share({
          title: 'Join Treeway',
          text: 'Join me on Treeway with my link:',
          url: link!,
        });
        return;
      }
      await navigator.clipboard.writeText(link!);
      setState('done');
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return; // the member closed the share sheet
      setState('fail');
    }
    setTimeout(() => setState('idle'), 2000);
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-[10px] bg-bg py-1 pr-1 pl-3">
      <span className="min-w-0 truncate text-[13px] font-semibold text-gt">{short}</span>
      <Button size="sm" className="h-9" onClick={act} aria-live="polite">
        {state === 'done'
          ? 'Copied ✓'
          : state === 'fail'
            ? 'Copy failed'
            : mode === 'share'
              ? 'Share'
              : 'Copy'}
      </Button>
    </div>
  );
}

export function WalletAmount({ value, className }: { value: number | undefined; className?: string }) {
  return value === undefined ? (
    <Skeleton className="h-8 w-28" />
  ) : (
    <Money value={value} className={className} />
  );
}
