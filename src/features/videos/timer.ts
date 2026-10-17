import type { TodayVideo, VideosToday } from '@/api/videos';

// Pure rules of the login video timer (no React, fully unit tested).
// Vinay, 15 Oct 2026 (rule updated the same day, because cheap phones drop the app's tab while YouTube plays):
// - The timer keeps running while the member is on YouTube / Facebook / Instagram (that is where they watch).
//   We never pause or restart on "app hidden". Time left comes from a wall-clock deadline, so coming back
//   to the app shows the right number at once, even after the browser slowed our timers in the background.
// - After a reload / reopen, a video the SERVER says is running is NOT started again: we take over the
//   server's seconds_left. 0 left -> complete at once; otherwise show what is left.
// - A new IST day is a new day: the server forgets yesterday's running video, so video 1 starts fresh.
// - The server is the judge: it counts the seconds between start and complete.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A video this app (this page load) started. Lost on reload, which is the "restart" rule. */
export interface LocalRun {
  slot: number;
  /** Date.now() value when the server's seconds are over. */
  deadline: number;
}

/** Whole seconds left, never below 0. */
export function secondsLeft(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function deadlineFrom(now: number, seconds: number): number {
  return now + seconds * 1000;
}

/** The video the member must watch now (the running or the next one). */
export function currentVideo(today: Pick<VideosToday, 'videos'>): TodayVideo | undefined {
  return today.videos.find((v) => v.status === 'running') ?? today.videos.find((v) => v.status === 'next');
}

/**
 * Does the member have to tap "Watch" (which calls /start)? Only when there is no run for this video,
 * neither started on this page nor taken over from the server (see serverRun).
 */
export function needsStart(video: Pick<TodayVideo, 'slot'>, run: LocalRun | null): boolean {
  return !run || run.slot !== video.slot;
}

/**
 * After a reload: the server's running video becomes our run, with the server's seconds left counted from
 * the moment that answer arrived (`answeredAt`, so an older cached answer never shows too much time).
 * `skipSlot`: a video this page already completed or dropped, while a fresh answer is on its way.
 */
export function serverRun(
  today: Pick<VideosToday, 'videos'>,
  answeredAt: number,
  skipSlot: number | null = null,
): LocalRun | null {
  const v = today.videos.find((x) => x.status === 'running');
  if (!v || v.slot === skipSlot) return null;
  return { slot: v.slot, deadline: deadlineFrom(answeredAt, v.seconds_left) };
}

/** ms from `now` to the next 00:00 in India. */
export function msToIstMidnight(now: number): number {
  const ist = now + IST_OFFSET_MS;
  const nextMidnightIst = Math.floor(ist / DAY_MS) * DAY_MS + DAY_MS;
  return nextMidnightIst - ist;
}

/** "Watch for 30 seconds. 12 seconds left." -> 12 (the server says how long to wait). */
export function serverSecondsLeft(msg: string): number | null {
  const m = /(\d+)\s+seconds?\s+left/i.exec(msg);
  return m ? Number(m[1]) : null;
}

/** Progress of the bar under the player, 0..1 (display only). */
export function progress(deadline: number, seconds: number, now: number): number {
  if (seconds <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - (deadline - now) / (seconds * 1000)));
}
