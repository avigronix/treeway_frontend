import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { qk } from '@/api/keys';
import { videosApi, type VideoDone, type VideosToday } from '@/api/videos';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { deadlineFrom, secondsLeft, serverRun, serverSecondsLeft, type LocalRun } from './timer';

const TICK_MS = 250;
const MAX_WAITS = 3;

/**
 * One login video at a time: open it, start the server timer, count down, complete.
 * See timer.ts for the rules. `onAllDone` gets the server's answer for the last video (with `credited`).
 */
export function useVideoRun(
  today: VideosToday | undefined,
  /** when `today` came from the server (Date.now() value) */
  answeredAt: number,
  onAllDone: (r: VideoDone) => void,
) {
  const qc = useQueryClient();
  const [runState, setRun] = useState<LocalRun | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [completing, setCompleting] = useState(false);
  const [stuck, setStuck] = useState(false); // complete got no answer: wait for the member to tap "Try again"
  const [error, setError] = useState<unknown>(null);
  const [openUrl, setOpenUrl] = useState<string | null>(null); // the browser did not open a tab
  // A slot this page completed or dropped: not taken over again from an older answer while a fresh one loads.
  const [settledSlot, setSettledSlot] = useState<number | null>(null);
  const waits = useRef(0);

  // A run started on this page counts while the server still has that video open (a new day or another
  // phone ends it).
  const serverVideo = runState && today?.videos.find((x) => x.slot === runState.slot);
  const localRun = serverVideo && serverVideo.status !== 'done' ? runState : null;
  // After a reload / reopen: take over the video the server says is running (no new start).
  const adopted = useMemo(
    () => (today ? serverRun(today, answeredAt, settledSlot) : null),
    [today, answeredAt, settledSlot],
  );
  const run = localRun ?? adopted;
  const adoptedUrl =
    !localRun && adopted ? today?.videos.find((v) => v.slot === adopted.slot)?.url : undefined;

  const refreshToday = useCallback(() => qc.invalidateQueries({ queryKey: qk.videosToday }), [qc]);

  const complete = useCallback(
    async (slot: number) => {
      setCompleting(true);
      setError(null);
      try {
        const r = await videosApi.complete(slot);
        setSettledSlot(slot);
        setRun(null);
        setOpenUrl(null);
        waits.current = 0;
        if (r.all_done) onAllDone(r);
        else await refreshToday();
      } catch (e) {
        const wait = e instanceof ApiError && e.status === 400 ? serverSecondsLeft(e.message) : null;
        if (wait !== null && wait > 0 && waits.current < MAX_WAITS) {
          // The server counts a little differently from this phone: wait what it says, then try again.
          waits.current += 1;
          setRun({ slot, deadline: deadlineFrom(Date.now(), wait) + 500 });
        } else if (e instanceof ApiError && e.isNoAnswer) {
          // No answer: never repeat blindly. Refresh first; the member can then tap "Try again".
          setStuck(true);
          setError(e);
          await refreshToday();
        } else {
          // Already done (409), a new day started ("Start the video first."), or another problem.
          setSettledSlot(slot);
          setRun(null);
          setOpenUrl(null);
          waits.current = 0;
          setError(e instanceof ApiError && e.status === 409 ? null : e);
          await refreshToday();
        }
      } finally {
        setCompleting(false);
      }
    },
    [onAllDone, refreshToday],
  );

  // Screen tick (display only) while a video runs; recount at once when the app is back in front.
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [run]);

  // Complete when the time is up. A timeout that was due while the app was in the background
  // runs as soon as the app is back, so coming back after 30 s completes at once.
  useEffect(() => {
    if (!run || stuck) return;
    const t = setTimeout(() => void complete(run.slot), Math.max(0, run.deadline - Date.now()));
    return () => clearTimeout(t);
  }, [run, stuck, complete]);

  const [watch, starting] = useSingleFlight(async (slot: number) => {
    setError(null);
    setStuck(false);
    setOpenUrl(null);
    setSettledSlot(null);
    waits.current = 0;
    // Open the tab inside the tap, or the browser blocks it. It goes to the video after the server timer starts.
    const tab = window.open('', '_blank');
    try {
      const s = await videosApi.start(slot);
      // Count from now (after the server started), so our 30 s never ends before the server's.
      const t = Date.now();
      setRun({ slot, deadline: deadlineFrom(t, s.seconds) });
      setNow(t);
      if (tab && !tab.closed) {
        tab.opener = null;
        tab.location.href = s.url;
      } else {
        setOpenUrl(s.url);
      }
    } catch (e) {
      tab?.close();
      setError(e);
      await refreshToday();
    }
  });

  // "Try again" only clears the stop; the timer effect above then completes once (never twice).
  const retry = useCallback(() => setStuck(false), []);

  return {
    run,
    now,
    left: run ? secondsLeft(run.deadline, now) : null,
    starting,
    completing,
    stuck,
    error,
    // The tab may be gone after a reload: offer the link again for a taken-over video.
    openUrl: run ? (openUrl ?? adoptedUrl ?? null) : null,
    watch,
    retry,
  };
}
