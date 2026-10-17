import { useSyncExternalStore } from 'react';

// JWT in localStorage (safe enough with the strict CSP: no inline scripts, no dangerouslySetInnerHTML).
const KEY = 'tw_token';
const tokenListeners = new Set<() => void>();

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // Private mode or storage blocked: the member stays logged in only for this page.
  }
  tokenListeners.forEach((fn) => fn());
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  tokenListeners.forEach((fn) => fn());
}

function subscribeToken(fn: () => void) {
  tokenListeners.add(fn);
  // Another tab logged in or out.
  const onStorage = (e: StorageEvent) => e.key === KEY && fn();
  window.addEventListener('storage', onStorage);
  return () => {
    tokenListeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

/** The current token; re-renders on login / logout (also from another tab). */
export function useToken(): string | null {
  return useSyncExternalStore(subscribeToken, getToken, () => null);
}

// ---------------------------------------------------------------- auth events
// The API client cannot navigate, so it tells the app; the router listens and moves the member.

export type AuthEvent = { type: 'logout'; msg: string } | { type: 'blocked'; msg: string };

const listeners = new Set<(e: AuthEvent) => void>();
// Why the session ended. Kept until the next login, so whichever guard notices the missing token first
// still sends the person to the right page (/login or /blocked) with the right message.
let lastReason: AuthEvent | null = null;

export function onAuthEvent(fn: (e: AuthEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitAuthEvent(e: AuthEvent): void {
  lastReason = e;
  listeners.forEach((fn) => fn(e));
}

export function authReason(): AuthEvent | null {
  return lastReason;
}

export function clearAuthReason(): void {
  lastReason = null;
}
