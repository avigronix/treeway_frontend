import { useQuery } from '@tanstack/react-query';
import { qk } from '@/api/keys';
import { videosApi, type TodayVideo } from '@/api/videos';
import { MemberPage } from '@/features/member/MemberPage';
import { Card, ErrorBox, Money, Note, Skeleton, SkeletonList } from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { cx } from '@/lib/cx';

const PLATFORM: Record<TodayVideo['platform'], string> = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  instagram: 'Instagram',
};
const STATUS: Record<TodayVideo['status'], string> = {
  done: 'Watched',
  running: 'Watching',
  next: 'Next',
  waiting: 'Not yet',
};

/** B "Daily videos": today's 4, the last 14 days, and totals. All numbers come from the API. */
export default function Videos() {
  const today = useQuery({
    queryKey: qk.videosToday,
    queryFn: ({ signal }) => videosApi.today(signal),
    staleTime: 30_000,
  });
  const history = useQuery({
    queryKey: qk.videosHistory(14),
    queryFn: ({ signal }) => videosApi.history(14, signal),
    staleTime: 60_000,
  });
  const t = today.data;

  return (
    <MemberPage
      back="/"
      title="Daily videos"
      subtitle={t ? `Watch ${t.per_day} videos a day, get ${formatMoney(t.reward)}` : ' '}
      className="gap-2.5"
    >
      {today.isError ? (
        <ErrorBox error={today.error} onRetry={() => today.refetch()} />
      ) : !t ? (
        <>
          <Skeleton className="h-[110px] w-full rounded-[18px]" />
          <SkeletonList rows={4} />
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-[18px] bg-g p-4 text-white">
            <div className="flex items-center justify-between gap-2.5">
              <b className="text-xl">
                {t.all_done
                  ? 'Today: done ✓'
                  : t.eligible
                    ? `Today: ${t.done_count} of ${t.per_day}`
                    : 'Daily videos'}
              </b>
              {t.day_no !== null && (
                <span className="text-[13px] text-[#E4EFE0]">
                  Day {Math.min(t.day_no, t.days_total)} of {t.days_total}
                </span>
              )}
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-[#3C7A47]"
              role="progressbar"
              aria-label="Earned from videos"
              aria-valuemin={0}
              aria-valuemax={t.max_total}
              aria-valuenow={t.earned_total}
            >
              <i
                className="block h-full rounded-full bg-sun"
                style={{
                  width: `${t.max_total > 0 ? Math.min(100, (t.earned_total / t.max_total) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-2.5 text-[13px] text-[#E4EFE0]">
              <span>
                Earned from videos: <Money value={t.earned_total} />
              </span>
              <span>
                Can earn up to <Money value={t.max_total} />
              </span>
            </div>
          </div>

          {!t.eligible && t.day_no !== null && t.day_no > t.days_total ? (
            <Note>Your {t.days_total} days of daily videos are complete.</Note>
          ) : !t.ready ? (
            <Note tone="warn">Today's videos are not ready yet. The app is open for you today.</Note>
          ) : null}

          {t.videos.length > 0 && (
            <Card flat>
              {t.videos.map((v) => (
                <div
                  key={v.slot}
                  className="flex min-h-[58px] items-center justify-between gap-2.5 border-b border-line2 px-3.5 py-3 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={cx(
                        'flex size-[42px] flex-none items-center justify-center rounded-full text-sm font-bold',
                        v.status === 'done' ? 'bg-okbg text-ok' : 'bg-soft text-gt',
                      )}
                    >
                      {v.status === 'done' ? '✓' : v.slot}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <b className="text-[14.5px]">
                        Video {v.slot} · {PLATFORM[v.platform]}
                      </b>
                      <span className="truncate text-[12.5px] text-mut">{v.title}</span>
                    </div>
                  </div>
                  <span className={cx('text-[13px] font-bold', v.status === 'done' ? 'text-ok' : 'text-mut')}>
                    {STATUS[v.status]}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      <Card className="gap-2">
        <div className="flex items-center justify-between gap-2.5">
          <h2 className="m-0 text-[14.5px] font-bold">Last 14 days</h2>
          {history.data && (
            <span className="text-xs text-mut">
              {history.data.done} done · {history.data.missed} missed
            </span>
          )}
        </div>
        {history.isError ? (
          <ErrorBox error={history.error} onRetry={() => history.refetch()} />
        ) : !history.data ? (
          <Skeleton className="h-6 w-full" />
        ) : history.data.days.length === 0 ? (
          <span className="text-[13px] text-mut">Starts on the day your ID is active.</span>
        ) : (
          <ul
            className="m-0 grid list-none gap-1 p-0"
            style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}
          >
            {history.data.days.map((d, i) => {
              const isToday = i === history.data.days.length - 1;
              const label = `${formatDay(d.date)}: ${d.done ? 'watched' : isToday ? 'today' : 'missed'}`;
              return (
                <li
                  key={d.date}
                  title={label}
                  aria-label={label}
                  className={cx(
                    'h-6 rounded-[5px]',
                    d.done
                      ? 'bg-leaf'
                      : isToday
                        ? 'border-[1.5px] border-dashed border-field'
                        : 'bg-[#F28B82]',
                  )}
                />
              );
            })}
          </ul>
        )}
        <span className="text-xs text-mut">
          Green = watched{t ? ` (${formatMoney(t.reward, 'always')})` : ''} · Red = missed (no money for that
          day)
        </span>
      </Card>
      <Note>
        Videos open by themselves after you log in. The app opens when all {t?.per_day ?? ''} are watched.
      </Note>
    </MemberPage>
  );
}
