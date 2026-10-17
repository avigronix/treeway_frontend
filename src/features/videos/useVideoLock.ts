import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/api/keys';
import { refreshMoney } from '@/api/queryClient';
import { videosApi, type VideoDone, type VideosToday } from '@/api/videos';
import { istDayKey } from '@/lib/dates';
import { msToIstMidnight } from './timer';

const RETRY_WHEN_FAILED_MS = 30_000;

/**
 * When to show the locked login videos (Vinay, 15 Oct 2026). Only the server's `locked` decides.
 * - The first answer after login locks at once.
 * - If /videos/today fails, the app stays open and we try again quietly; the lock comes with the first answer.
 * - At IST midnight the new day's answer is fetched in the background, but the lock only shows at the next
 *   screen change or when the app comes back to the front, never in the middle of a screen.
 * - No videos for the day, after day 150, or an inactive ID: the server says locked = false, so no lock.
 */
export function useVideoLock() {
  const qc = useQueryClient();
  const location = useLocation();

  const today = useQuery({
    queryKey: qk.videosToday,
    queryFn: ({ signal }) => videosApi.today(signal),
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false, // the checkpoint below does it, with the "not in the middle of a screen" rule
    refetchInterval: (query) => (query.state.status === 'error' ? RETRY_WHEN_FAILED_MS : false),
  });

  const [show, setShow] = useState(false);
  const [done, setDone] = useState<VideoDone | null>(null);
  const [answered, setAnswered] = useState(false);
  const d = today.data;

  // First answer: lock at once. (State adjusted during render, React's pattern for "react to new data".)
  if (d && !answered) {
    setAnswered(true);
    if (d.locked) setShow(true);
  }

  // Unlocked by the server while the lock is open. If today is all done (the last "complete" reached the server
  // but its answer was lost, or done on another phone), show "All done" with the server's reward; else close.
  if (show && !done && d && !d.locked) {
    if (d.all_done)
      setDone({ done_count: d.done_count, all_done: true, credited: d.reward, day_no: d.day_no });
    else setShow(false);
  }

  // The reward is in the Product Wallet now: refresh every money screen and the video totals.
  useEffect(() => {
    if (!done) return;
    void refreshMoney(qc);
    void qc.invalidateQueries({ queryKey: ['videos'] });
  }, [done, qc]);

  /** Screen change or app back in front: get a fresh answer if needed, lock if it says so. */
  const checkpoint = useCallback(async () => {
    const cached = qc.getQueryData<VideosToday>(qk.videosToday);
    const sameDay = !!cached && cached.date === istDayKey();
    try {
      const data = await qc.fetchQuery({
        queryKey: qk.videosToday,
        queryFn: ({ signal }) => videosApi.today(signal),
        staleTime: sameDay ? 60_000 : 0,
      });
      setAnswered(true);
      if (data.locked) setShow(true);
    } catch {
      // fail open: the app stays usable, the background retry keeps trying
    }
  }, [qc]);

  const lastKey = useRef(location.key);
  useEffect(() => {
    if (location.key === lastKey.current) return;
    lastKey.current = location.key;
    void checkpoint();
  }, [location.key, checkpoint]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkpoint();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [checkpoint]);

  // Midnight in India: fetch the new day's answer in the background.
  const day = d?.date;
  useEffect(() => {
    const t = setTimeout(
      () => void qc.invalidateQueries({ queryKey: qk.videosToday }),
      msToIstMidnight(Date.now()) + 2_000,
    );
    return () => clearTimeout(t);
  }, [day, qc]);

  const finish = useCallback((result: VideoDone) => setDone(result), []);
  const close = useCallback(() => {
    setDone(null);
    setShow(false);
  }, []);

  return { today, show, done, finish, close };
}
