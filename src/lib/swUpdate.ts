import { useSyncExternalStore } from 'react';

// "A new version is ready": the service worker found a new build (vite-plugin-pwa, registerType 'prompt').
// The member taps Update when they are ready, so a reload never cuts a money action in half.

let apply: (() => Promise<void>) | null = null;
const listeners = new Set<() => void>();

export function setUpdateReady(fn: () => Promise<void>) {
  apply = fn;
  listeners.forEach((l) => l());
}

export const applyUpdate = () => apply?.();

/**
 * Update button: the new service worker takes over, then the page reloads, always.
 * The library alone reloads only when an old worker controls this page; after a hard reload (or with
 * another tab open) nothing happened and the toast stayed (Vinay 31 Oct). So we wait for the new worker
 * ourselves (at most `waitMs`) and reload in every case.
 */
export async function takeOverAndReload(waitMs = 4000): Promise<void> {
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  const next = reg?.waiting;
  if (next) {
    await new Promise<void>((done) => {
      const timer = setTimeout(done, waitMs);
      next.addEventListener('statechange', () => {
        if (next.state === 'activated' || next.state === 'redundant') {
          clearTimeout(timer);
          done();
        }
      });
      next.postMessage({ type: 'SKIP_WAITING' });
    });
  }
  window.location.reload();
}

export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => apply !== null,
    () => false,
  );
}

/** After a new release an old page may ask for a code file that is gone: reload once to get the new app. */
export function isStaleChunkError(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    m,
  );
}

const RELOADED = 'tw_chunk_reload';

/** Reloads the page for a stale chunk (once a minute at most); false if it just tried (then show the error). */
export function reloadOnceForNewVersion(): boolean {
  try {
    // At most once a minute: a page that keeps failing shows the error instead of reloading forever.
    if (Date.now() - Number(sessionStorage.getItem(RELOADED) ?? 0) < 60_000) return false;
    sessionStorage.setItem(RELOADED, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
