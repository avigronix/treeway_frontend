import { useSyncExternalStore } from 'react';

// Which frame to draw: the phone parts (top bar + bottom menu) or the app shell (sidebar + top bar). Drawing only
// one keeps the page free of hidden duplicates. Without matchMedia (tests, very old browsers) it is a phone.

function subscribe(query: string) {
  return (onChange: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const m = window.matchMedia(query);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  };
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** >= 768 px: the app shell (same as the `tab:` breakpoint in index.css). */
export const useIsTablet = () => useMediaQuery('(min-width: 768px)');
/** >= 1280 px (the `wide:` breakpoint). */
export const useIsWide = () => useMediaQuery('(min-width: 1280px)');
