import { api } from './client';
import type { Schema } from './schema';

export type VideosToday = Schema<'VideosToday'>;
export type TodayVideo = Schema<'TodayVideo'>;
export type VideoStarted = Schema<'VideoStarted'>;
export type VideoDone = Schema<'VideoDone'>;
export type VideoHistory = Schema<'VideoHistory'>;

export const videosApi = {
  /** Login window: today's videos and whether the app stays locked. */
  today: (signal?: AbortSignal) => api<VideosToday>('/videos/today', { signal }),
  /** Starts (or restarts) the server timer of the next video. */
  start: (slot: number) => api<VideoStarted>(`/videos/${slot}/start`, { method: 'POST' }),
  /** Done if the server counted the seconds. The last video pays the reward in this same request. */
  complete: (slot: number) => api<VideoDone>(`/videos/${slot}/complete`, { method: 'POST' }),
  history: (days: number, signal?: AbortSignal) =>
    api<VideoHistory>('/videos/history', { query: { days }, signal }),
};
