import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, adminKeys, type AdminVideos } from '@/api/admin';
import { Button, Chip, ErrorBox, Note, SelectField, SkeletonList, TextField } from '@/components/ui';
import { formatDay, formatTime, formatWhen, istDayKey, istDayKeyAfter } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useConfig } from '@/features/auth/usePublic';
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

// J3 "Daily videos": the links members must watch after login, 30 s each, ₹20 when all of the day's are done.
// Vinay 31 Oct: 1 to 4 videos a day (the "most a day" setting), full add / edit / remove until the day goes live;
// once live only a link or title can change (the count stays); past days open read only; a day without videos
// has none (no lock, no ₹20). The server checks all of it again, refuses a save made from an old screen
// (`version`) and audits every change (old and new).
// Start time (Vinay 22 Oct): each day's videos go live at one India time (empty = 12:00 AM). Before it the app is
// open; from it the lock comes. A live day's time can only move earlier, and a live day cannot be deleted.

type DayStatus = AdminVideos['status'];
const STATUS: Record<DayStatus, { tone: 'ok' | 'wait' | 'muted' | 'bad'; text: string }> = {
  live: { tone: 'ok', text: 'Live' },
  scheduled: { tone: 'wait', text: 'Scheduled' },
  empty: { tone: 'bad', text: 'No videos' },
  ended: { tone: 'muted', text: 'Ended' },
};
/** "09:30:00" from the server -> "9:30 AM"; none = 12:00 AM. */
const timeText = (t: string | null | undefined) =>
  formatTime(`2026-01-01T${(t ?? '00:00').slice(0, 5)}:00+05:30`);
const dayText = (d: string) => formatDay(d + 'T12:00:00+05:30');
const EMPTY: Row = { platform: '', url: '', title: '' };
const plural = (n: number) => `${n} video${n === 1 ? '' : 's'}`;

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
  const reward = useConfig().data?.video.reward;
  const seconds = useConfig().data?.video.seconds;
  const ended = data.status === 'ended';
  const live = data.status === 'live';
  const canChangeCount = !ended && !live; // add / remove / delete the day
  const most = data.per_day;
  const [rows, setRows] = useState<Row[]>(() =>
    data.videos.length
      ? data.videos.map((v) => ({ platform: v.platform as Platform, url: v.url, title: v.title }))
      : canChangeCount
        ? [EMPTY]
        : [],
  );
  const [errs, setErrs] = useState<RowErr[]>([]);
  const [error, setError] = useState<unknown>(null);
  const savedTime = data.start_time?.slice(0, 5) ?? '';
  const [startTime, setStartTime] = useState(savedTime);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const today = istDayKey();
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['admin', 'videos'] }),
      qc.invalidateQueries({ queryKey: adminKeys.dashboard }),
    ]);

  const set = (i: number, k: keyof Row, v: string) => {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    onSaved(null);
  };
  const add = () => {
    setRows((rs) => (rs.length < most ? [...rs, EMPTY] : rs));
    onSaved(null);
  };
  const removeAt = (i: number) => {
    setRows((rs) => rs.filter((_, j) => j !== i));
    setErrs((es) => es.filter((_, j) => j !== i));
    onSaved(null);
  };

  const [save, saving] = useSingleFlight(async () => {
    setError(null);
    onSaved(null);
    const timeChanged = startTime !== savedTime;
    // A new day with only an empty row and a start time: save the time alone.
    const untouched =
      data.videos.length === 0 && rows.every((r) => !r.platform && !r.url.trim() && !r.title.trim());
    const { items, errs: e } = untouched ? { items: [], errs: [] } : checkVideoRows(rows);
    setErrs(e);
    if (e.some((x) => Object.keys(x).length)) return;
    if (untouched && !timeChanged) {
      setError(new Error('Add at least one video.'));
      return;
    }
    try {
      await adminApi.saveVideos(day, {
        videos: untouched ? undefined : items,
        start_time: timeChanged ? startTime || '00:00' : undefined,
        version: data.version,
      });
      onSaved(
        untouched
          ? 'Start time saved. No videos on this day yet.'
          : items.length
            ? `Saved: ${plural(items.length)}. Members get ${reward !== undefined ? formatMoney(reward) : 'the reward'} after ${items.length === 1 ? 'it' : `all ${items.length}`}.`
            : 'Saved: no videos on this day. Members get no video reward that day.',
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
      onSaved('Videos removed for this day. Members get no videos and no reward that day.');
    } catch (err) {
      setError(err);
    } finally {
      setConfirmDelete(false);
      await refresh();
    }
  });
  const canDelete = canChangeCount && (data.videos.length > 0 || data.start_time !== null);

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ended) void save();
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          label="Start time (India time)"
          type="time"
          value={startTime}
          disabled={ended}
          onChange={(ev) => (setStartTime(ev.target.value), onSaved(null))}
          fieldClassName="w-[190px]"
          help={startTime ? undefined : 'Empty = 12:00 AM'}
        />
        <span className="flex items-center gap-2 pb-2.5 text-[13px]">
          <Chip tone={STATUS[data.status].tone}>{STATUS[data.status].text}</Chip>
          {data.status === 'scheduled' && `Goes live at ${timeText(data.start_time)}`}
        </span>
      </div>
      {ended && <Note>This day is over. It is shown for your records and cannot be changed.</Note>}
      {live && (
        <Note>
          Members are watching these now: you can fix a link or a title, and move the start time earlier.
          Adding or removing videos is not possible on a live day.
        </Note>
      )}
      {!ended && startTime >= '20:00' && (
        <Note tone="warn">
          Members get only until 11:59 PM to watch all of them and earn the reward. A day ends at midnight.
        </Note>
      )}
      {day === today && !ended && (
        <Note tone="warn">
          These are today's videos. Members who already watched keep their progress. Change today only to fix
          a broken link.
        </Note>
      )}
      {rows.map((r, i) => {
        const v = data.videos[i];
        const e = errs[i] ?? {};
        return (
          <fieldset
            key={i}
            disabled={ended}
            className="m-0 flex min-w-0 flex-col gap-2 rounded-xl border border-line p-3"
          >
            <legend className="px-1 text-[13px] font-bold">
              Video {i + 1}
              {v && v.url === r.url && v.title === r.title && v.platform === r.platform ? (
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
            {canChangeCount && (
              <Button
                size="sm"
                variant="ghost"
                className="self-start"
                disabled={saving || removing}
                onClick={() => removeAt(i)}
                aria-label={`Remove video ${i + 1}`}
              >
                Remove
              </Button>
            )}
          </fieldset>
        );
      })}
      {canChangeCount && rows.length < most && (
        <Button variant="dash" size="md" disabled={saving || removing} onClick={add}>
          + Add video ({rows.length} of {most})
        </Button>
      )}
      {!ended && rows.length === 0 && (
        <Note tone="warn">
          No videos on {dayText(day)}: members get no lock and no video reward that day.
        </Note>
      )}
      {!ended && rows.length > 0 && (
        <Note>
          Members watch {rows.length === 1 ? 'this video' : `these ${rows.length} in order`} ({seconds ?? 30}{' '}
          seconds each) and get {reward !== undefined ? formatMoney(reward) : 'the reward'} when{' '}
          {rows.length === 1 ? 'it is' : 'all are'} done.
        </Note>
      )}
      {error ? <ErrorBox error={error} /> : null}
      {!ended && (
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
      )}
      {confirmDelete && (
        <div className="flex flex-col gap-2">
          <Note tone="warn">
            Remove all videos and the start time of {dayText(day)}? Members then get no videos and no reward
            that day.
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
          <span className="text-mut">No videos yet:</span>
          {missingDays.map((m) => (
            <button
              key={m.date}
              type="button"
              onClick={() => setDay(m.date)}
              className="cursor-pointer border-0 bg-transparent p-0"
            >
              <Chip tone="wait">
                {m.date === today ? 'Today' : m.date === tomorrow ? 'Tomorrow' : dayText(m.date)}
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
          key={`${day}:${v.data.version}:${v.data.status}`}
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

/** The last 3 days (read only) and the next 14: videos set, start time, status. Tap a day to open it. */
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
                  · {plural(r.links)} · {timeText(r.start_time)}
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
