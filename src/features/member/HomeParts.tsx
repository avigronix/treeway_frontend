import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Super3Status } from '@/api/member';
import { Button, Money, Skeleton } from '@/components/ui';
import { formatTime } from '@/lib/dates';
import { formatCount, formatMoney } from '@/lib/money';
import { cx } from '@/lib/cx';
import { mainJourney, useVideosToday } from './data';

/** "My Super 3 board": where the main ID stands and how many of its 3 spots below are filled. Opens the board
 * tree. No estimate here: "when will my 3 come" is admin only (Vinay 21 Oct). */
export function Super3Card({ status, big = false }: { status: Super3Status | undefined; big?: boolean }) {
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
    const below = j.children ?? 0;
    main = (
      <>
        <div className="flex items-end justify-between gap-2.5">
          <span className={cx('font-bold', big ? 'text-[26px]' : 'text-[22px]')}>
            Board {j.board}
            {j.position !== null ? ` · spot #${formatCount(j.position)}` : ''}
          </span>
          <span className="font-bold text-sun">See tree ›</span>
        </div>
        <span className="text-[13px] text-[#C9DCC5]">{below} of 3 spots below you filled</span>
        <div
          className="relative h-2 rounded-full bg-white/15"
          role="progressbar"
          aria-label="Spots filled under you"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={below}
        >
          <i
            className="absolute inset-y-0 left-0 rounded-full bg-[#5DD27A]"
            style={{ width: `${Math.min(100, (below / 3) * 100)}%` }}
          />
        </div>
      </>
    );
  }
  return (
    <Link
      to="/super3"
      className="flex flex-col gap-2 rounded-[20px] border-l-4 border-sun bg-gt px-4 py-3.5 text-white no-underline hover:text-white"
    >
      <b className="text-[15px]">My Super 3 board</b>
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
    } else if (v.eligible && v.starts_at) {
      // A start time is set for today (Vinay 22 Oct): no lock before it.
      head = <b className="text-lg">{formatTime(v.starts_at)}</b>;
      foot = 'Starts today';
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
        'flex flex-col gap-0.5 rounded-2xl border border-okbg bg-linear-135 from-card to-okbg p-3 text-ink no-underline',
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
