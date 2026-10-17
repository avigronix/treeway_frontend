import { useId } from 'react';
import type { TodayVideo, VideoDone, VideosToday } from '@/api/videos';
import { Button, Chip, ErrorBox, Modal, Money, Skeleton } from '@/components/ui';
import { cx } from '@/lib/cx';
import { currentVideo, needsStart, progress } from './timer';
import { useVideoRun } from './useVideoRun';

const PLATFORM: Record<TodayVideo['platform'], string> = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  instagram: 'Instagram',
};

/** theme .dots: one bar per video. */
function Dots({ total, done, now }: { total: number; done: number; now?: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i
          key={i}
          className={cx(
            'h-1.5 w-7 rounded-full',
            i < done ? 'bg-leaf' : i + 1 === now ? 'bg-sun' : 'bg-line',
          )}
        />
      ))}
    </div>
  );
}

/** ▶ before the video starts, ❚❚ while it plays (as in the design). */
function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
      {playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** A6 "Video after login (locked)". The app behind is inert until today's videos are done. */
export function VideoLockModal({
  today,
  answeredAt,
  onAllDone,
}: {
  today: VideosToday;
  /** when `today` came from the server (query dataUpdatedAt) */
  answeredAt: number;
  onAllDone: (r: VideoDone) => void;
}) {
  const titleId = useId();
  const r = useVideoRun(today, answeredAt, onAllDone);
  const video = currentVideo(today);
  const n = video?.slot ?? today.done_count + 1;
  const mustStart = video ? needsStart(video, r.run) : false;
  const running = !!r.run && !!video && r.run.slot === video.slot;
  const left = running ? (r.left ?? today.seconds) : today.seconds;
  const pct = running && r.run ? progress(r.run.deadline, today.seconds, r.now) : 0;
  const last = n >= today.per_day;

  return (
    <Modal labelledBy={titleId}>
      <div className="flex items-center justify-between gap-2.5">
        <h2 id={titleId} className="m-0 text-[19px] font-bold">
          Today's video
        </h2>
        <Chip tone="gold">
          Video {Math.min(n, today.per_day)} of {today.per_day}
        </Chip>
      </div>
      <Dots total={today.per_day} done={today.done_count} now={n} />

      {video ? (
        <>
          <button
            type="button"
            disabled={!mustStart || r.starting}
            onClick={() => r.watch(video.slot)}
            aria-label={mustStart ? `Watch video ${video.slot} on ${PLATFORM[video.platform]}` : undefined}
            className="relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-[14px] border-0 bg-[#0F1A12] text-white disabled:cursor-default"
          >
            <span className="absolute top-2.5 left-2.5 rounded-full bg-white/15 px-2.5 py-[3px] text-xs font-bold">
              {PLATFORM[video.platform]}
            </span>
            <span className="flex size-[58px] items-center justify-center rounded-full bg-white/20">
              <PlayIcon playing={running} />
            </span>
            {running && (
              <span
                className="num absolute right-2.5 bottom-3.5 rounded-lg bg-black/55 px-2 py-[3px] text-[12.5px] font-bold"
                aria-live="polite"
              >
                {left > 0 ? `${left} sec left` : 'Checking…'}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 h-[5px] bg-white/20" aria-hidden="true">
              <i className="block h-full bg-sun" style={{ width: `${Math.round(pct * 100)}%` }} />
            </span>
          </button>
          <div className="flex flex-col gap-0.5">
            <b className="text-[13px]">{video.title}</b>
            <span className="text-xs text-mut">Watch for {today.seconds} seconds. Do not close the app.</span>
          </div>
        </>
      ) : (
        <Skeleton className="aspect-video w-full rounded-[14px]" />
      )}

      <div className="flex items-center justify-between gap-2.5 rounded-xl bg-goldbg px-3 py-2.5 text-goldink">
        <span className="text-[13px]">
          Finish all {today.per_day} and get{' '}
          <b>
            <Money value={today.reward} />
          </b>{' '}
          in your Product Wallet
        </span>
        {today.day_no !== null && (
          <span className="text-xs whitespace-nowrap">
            Day {today.day_no} / {today.days_total}
          </span>
        )}
      </div>

      {r.error ? <ErrorBox error={r.error} /> : null}
      {r.openUrl && (
        <a
          href={r.openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-[46px] items-center justify-center rounded-xl border-[1.5px] border-g bg-white text-[15px] font-bold text-g no-underline"
        >
          Open the video
        </a>
      )}

      {r.stuck ? (
        <Button onClick={r.retry} busy={r.completing}>
          Try again
        </Button>
      ) : mustStart && video ? (
        <Button onClick={() => r.watch(video.slot)} busy={r.starting}>
          {today.done_count > 0 ? `Watch video ${video.slot}` : 'Watch the video'}
        </Button>
      ) : (
        <Button disabled busy={r.completing}>
          {r.completing ? 'Checking…' : last ? `Done in ${left} sec` : `Next video in ${left} sec`}
        </Button>
      )}

      <div className="flex items-center justify-center gap-1.5 text-mut">
        <LockIcon />
        <span className="text-xs">The app opens after today's {today.per_day} videos</span>
      </div>
    </Modal>
  );
}

/** A7 "Videos done". `result.credited` is the server's answer for the last video. */
export function VideosDoneModal({
  result,
  today,
  onClose,
}: {
  result: VideoDone;
  today: VideosToday | undefined;
  onClose: () => void;
}) {
  const titleId = useId();
  const fresh = today?.all_done ? today : undefined; // wait for the refreshed totals
  return (
    <Modal labelledBy={titleId} className="items-center gap-3.5 px-5 py-6 text-center">
      <div
        className="flex size-[76px] items-center justify-center rounded-full bg-okbg text-ok"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex flex-col items-center gap-1">
        <h2 id={titleId} className="m-0 text-[22px] font-bold">
          All done for today!
        </h2>
        <span className="text-[13px] text-mut">You watched all {result.done_count} videos</span>
      </div>
      <Dots total={result.done_count} done={result.done_count} />
      <div className="flex w-full flex-col gap-0.5 rounded-[14px] bg-goldbg p-3.5 text-goldink">
        <span className="text-[13px]">Added to your Product Wallet</span>
        <b className="text-[30px]">
          <Money value={result.credited} sign="always" />
        </b>
      </div>
      <div className="grid w-full grid-cols-2 gap-2.5">
        <div className="flex flex-col rounded-2xl border border-line p-2.5">
          {fresh ? (
            <b className="num">
              {fresh.days_earned} / {fresh.days_total}
            </b>
          ) : (
            <Skeleton className="mx-auto h-5 w-14" />
          )}
          <span className="text-xs text-mut">Days done</span>
        </div>
        <div className="flex flex-col rounded-2xl border border-line p-2.5">
          {fresh ? (
            <b className="num">
              <Money value={fresh.earned_total} />
            </b>
          ) : (
            <Skeleton className="mx-auto h-5 w-14" />
          )}
          <span className="text-xs text-mut">Earned from videos</span>
        </div>
      </div>
      <Button onClick={onClose}>Go to Home</Button>
      <span className="text-xs text-mut">{today?.per_day ?? 4} new videos will come tomorrow</span>
    </Modal>
  );
}
