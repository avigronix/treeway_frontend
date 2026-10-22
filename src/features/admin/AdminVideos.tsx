import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, adminKeys, type AdminVideos } from '@/api/admin';
import { Button, Chip, ErrorBox, Note, SelectField, SkeletonList, TextField } from '@/components/ui';
import { formatDay, formatTime, formatWhen, istDayKey, istDayKeyAfter } from '@/lib/dates';
import { cx } from '@/lib/cx';
import { useSingleFlight } from '@/lib/useSingleFlight';
import {
  checkVideoRows,
  PLATFORMS,
  type Platform,
  type VideoRow as Row,
  type VideoRowErr as RowErr,
} from './adminForms';
import { Panel } from './AdminParts';

// J3 "Daily videos": the links members must watch after login (4 a day, 30 s each, ₹20 when all are done).
// The server checks the links again, refuses past days, and audits every change (old and new).
// Start time (Vinay 22 Oct): each day's 4 go live at one India time (empty = 12:00 AM). Before it the app is
// open; from it the lock comes. A live day's time can only move earlier, and a live day cannot be deleted.

type DayStatus = AdminVideos['status'];
const STATUS: Record<DayStatus, { tone: 'ok' | 'wait' | 'muted' | 'bad'; text: string }> = {
  live: { tone: 'ok', text: 'Live' },
  scheduled: { tone: 'wait', text: 'Scheduled' },
  incomplete: { tone: 'bad', text: 'Links missing' },
  ended: { tone: 'muted', text: 'Ended' },
};
/** "09:30:00" from the server -> "9:30 AM"; none = 12:00 AM. */
const timeText = (t: string | null | undefined) =>
  formatTime(`2026-01-01T${(t ?? '00:00').slice(0, 5)}:00+05:30`);

function DayForm({
  data,
  day,
  onSaved,
}: {
  data: AdminVideos;
  day: string;
  onSaved: (msg: string | null) => void;
}) {
  const qc = useQueryClient();
  const bySlot = new Map(data.videos.map((v) => [v.slot, v]));
  const saved = new Set(data.videos.map((v) => v.slot));
  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: data.per_day }, (_, i) => {
      const v = bySlot.get(i + 1);
      return { platform: (v?.platform as Platform) ?? '', url: v?.url ?? '', title: v?.title ?? '' };
    }),
  );
  const [errs, setErrs] = useState<RowErr[]>([]);
  const [error, setError] = useState<unknown>(null);
  const savedTime = data.start_time?.slice(0, 5) ?? '';
  const [startTime, setStartTime] = useState(savedTime);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const today = istDayKey();
  const missing = rows.filter((r) => !r.url.trim()).length;
  const live = data.status === 'live';
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['admin', 'videos'] }),
      qc.invalidateQueries({ queryKey: adminKeys.dashboard }),
    ]);

  const set = (i: number, k: keyof Row, v: string) => {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    onSaved(null);
  };

  const [save, saving] = useSingleFlight(async () => {
    setError(null);
    onSaved(null);
    const { items, errs: e } = checkVideoRows(rows, saved);
    setErrs(e);
    if (e.some((x) => Object.keys(x).length)) return;
    const timeChanged = startTime !== savedTime;
    if (!items.length && !timeChanged) {
      setError(new Error('Add at least one video.'));
      return;
    }
    try {
      const r = await adminApi.saveVideos(day, items, timeChanged ? startTime || '00:00' : undefined);
      const left = r.missing_days.find((m) => m.date === day)?.missing ?? 0;
      onSaved(
        left ? `Saved. ${left} video${left === 1 ? '' : 's'} still missing for this day.` : 'Videos saved.',
      );
    } catch (err) {
      setError(err);
    } finally {
      await refresh();
    }
  });

  const [remove, removing] = useSingleFlight(async () => {
    setError(null);
    try {
      await adminApi.deleteVideos(day);
      onSaved('Videos removed for this day.');
    } catch (err) {
      setError(err);
    } finally {
      setConfirmDelete(false);
      await refresh();
    }
  });
  const canDelete = !live && data.status !== 'ended' && (data.videos.length > 0 || data.start_time !== null);

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          label="Start time (India time)"
          type="time"
          value={startTime}
          onChange={(ev) => (setStartTime(ev.target.value), onSaved(null))}
          fieldClassName="w-[190px]"
          help={startTime ? undefined : 'Empty = 12:00 AM'}
        />
        <span className="flex items-center gap-2 pb-2.5 text-[13px]">
          <Chip tone={STATUS[data.status].tone}>{STATUS[data.status].text}</Chip>
          {data.status === 'scheduled' && `Goes live at ${timeText(data.start_time)}`}
          {data.status === 'incomplete' && "Members get the last full day's videos"}
        </span>
      </div>
      {live && <Note>Members are watching these now: the start time can only move earlier.</Note>}
      {startTime >= '20:00' && (
        <Note tone="warn">
          Members get only until 11:59 PM to watch all 4 and earn ₹20. A day ends at midnight.
        </Note>
      )}
      {day === today && (
        <Note tone="warn">
          These are today's videos. Members who already watched keep their progress. Change today only to fix
          a broken link.
        </Note>
      )}
      {rows.map((r, i) => {
        const v = bySlot.get(i + 1);
        const e = errs[i] ?? {};
        return (
          <fieldset key={i} className="m-0 flex flex-col gap-2 rounded-xl border border-line p-3">
            <legend className="px-1 text-[13px] font-bold">
              Video {i + 1}
              {v ? (
                <span className="font-normal text-mut">
                  {' '}
                  · saved by {v.updated_by_name ?? 'an admin'}, {formatWhen(v.updated_at)}
                </span>
              ) : null}
            </legend>
            <div className="grid grid-cols-1 gap-2 desk:grid-cols-[160px_minmax(0,2fr)_minmax(0,1fr)]">
              <SelectField
                label="Platform"
                placeholder="Choose"
                options={PLATFORMS}
                value={r.platform}
                onChange={(ev) => set(i, 'platform', ev.target.value)}
                error={e.platform}
              />
              <TextField
                label="Video link"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                placeholder="https://..."
                value={r.url}
                onChange={(ev) => set(i, 'url', ev.target.value)}
                error={e.url}
              />
              <TextField
                label="Title"
                value={r.title}
                onChange={(ev) => set(i, 'title', ev.target.value)}
                error={e.title}
              />
            </div>
          </fieldset>
        );
      })}
      {missing > 0 && (
        <Note tone="warn">
          {missing} video{missing === 1 ? '' : 's'} for {formatDay(day + 'T12:00:00+05:30')}{' '}
          {missing === 1 ? 'is' : 'are'} missing. Add them before 12 midnight, or members cannot finish the
          login videos (the app then uses the last full day's videos).
        </Note>
      )}
      {error ? <ErrorBox error={error} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" busy={saving} disabled={removing}>
          Save videos
        </Button>
        {canDelete && !confirmDelete && (
          <Button variant="ghost" disabled={saving} onClick={() => setConfirmDelete(true)}>
            Delete this day
          </Button>
        )}
      </div>
      {confirmDelete && (
        <div className="flex flex-col gap-2">
          <Note tone="warn">
            Remove all videos and the start time of {formatDay(day + 'T12:00:00+05:30')}? Members then get the
            last full day's videos that day.
          </Note>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="ghost" disabled={removing} onClick={() => setConfirmDelete(false)}>
              Back
            </Button>
            <Button variant="danger" busy={removing} onClick={remove}>
              Delete videos
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

export function VideosPanel() {
  const today = istDayKey();
  const tomorrow = istDayKeyAfter(1);
  const [day, setDayRaw] = useState(tomorrow);
  const [done, setDone] = useState<string | null>(null);
  const setDay = (d: string) => {
    setDayRaw(d);
    setDone(null);
  };
  const v = useQuery({
    queryKey: adminKeys.videos(day),
    queryFn: ({ signal }) => adminApi.videos(day, signal),
    refetchOnWindowFocus: false,
  });
  const missingDays = v.data?.missing_days ?? [];
  const label = day === today ? 'Today' : day === tomorrow ? 'Tomorrow' : '';

  return (
    <Panel
      title="Daily videos"
      right={
        <span className="text-[13px] text-mut">
          {label ? `${label} · ` : ''}
          {formatDay(day + 'T12:00:00+05:30')}
        </span>
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <Button size="sm" variant={day === today ? 'primary' : 'ghost'} onClick={() => setDay(today)}>
          Today
        </Button>
        <Button size="sm" variant={day === tomorrow ? 'primary' : 'ghost'} onClick={() => setDay(tomorrow)}>
          Tomorrow
        </Button>
        <TextField
          label="Other day"
          type="date"
          min={today}
          value={day}
          onChange={(e) => e.target.value && e.target.value >= today && setDay(e.target.value)}
          fieldClassName="w-[170px]"
        />
      </div>
      {missingDays.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
          <span className="text-mut">Missing videos:</span>
          {missingDays.map((m) => (
            <button
              key={m.date}
              type="button"
              onClick={() => setDay(m.date)}
              className="cursor-pointer border-0 bg-transparent p-0"
            >
              <Chip tone="wait">
                {m.date === today
                  ? 'Today'
                  : m.date === tomorrow
                    ? 'Tomorrow'
                    : formatDay(m.date + 'T12:00:00+05:30')}{' '}
                · {m.missing}
              </Chip>
            </button>
          ))}
        </div>
      )}
      {v.isError ? (
        <ErrorBox error={v.error} onRetry={() => v.refetch()} />
      ) : !v.data ? (
        <SkeletonList rows={4} />
      ) : (
        // A fresh form only when the day or the SAVED videos change (after a save: who saved, and when). Coming
        // back from the YouTube tab with a copied link must never wipe what the admin typed.
        <DayForm
          key={`${day}:${v.data.start_time}:${v.data.videos.map((x) => `${x.slot}@${x.updated_at}`).join(',')}`}
          data={v.data}
          day={day}
          onSaved={setDone}
        />
      )}
      {done && (
        <Note role="status" tone="info">
          {done}
        </Note>
      )}
      <Schedule day={day} onPick={setDay} />
    </Panel>
  );
}

/** The last 3 days and the next 14: links set, start time, status. Tap a day to open it. */
function Schedule({ day, onPick }: { day: string; onPick: (d: string) => void }) {
  const today = istDayKey();
  const s = useQuery({
    queryKey: adminKeys.videoSchedule,
    queryFn: ({ signal }) => adminApi.videoSchedule(14, signal),
  });
  if (s.isError) return <ErrorBox error={s.error} onRetry={() => s.refetch()} />;
  if (!s.data) return <SkeletonList rows={3} />;
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="m-0 text-[14px] font-bold">Schedule</h3>
      <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Video schedule">
        {s.data.map((r) => (
          <li key={r.date}>
            <button
              type="button"
              disabled={r.date < today}
              onClick={() => onPick(r.date)}
              aria-current={r.date === day || undefined}
              className={cx(
                'flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-[13px] disabled:cursor-default',
                r.date === day ? 'border-g bg-tint' : 'border-line bg-white',
              )}
            >
              <span className="min-w-0">
                <b>{r.date === today ? 'Today' : formatDay(r.date + 'T12:00:00+05:30')}</b>
                <span className="text-mut">
                  {' '}
                  · {r.links}/{r.per_day} links · {timeText(r.start_time)}
                </span>
              </span>
              <Chip tone={STATUS[r.status].tone}>{STATUS[r.status].text}</Chip>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
