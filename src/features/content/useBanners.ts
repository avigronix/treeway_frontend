import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contentApi } from '@/api/content';
import { istDayKey } from '@/lib/dates';

/** Live banners for Home ("everyone") or the login page ("login"); one cache for the strip and the modal.
 * Asked again every minute while the app is open, so a scheduled banner starts / stops within a minute of its
 * time (the server's clock decides). */
export const BANNER_REFRESH_MS = 60_000;
export function useLiveBanners(audience: 'everyone' | 'login') {
  return useQuery({
    queryKey: ['banners', audience],
    queryFn: ({ signal }) => contentApi.banners(audience, signal),
    staleTime: BANNER_REFRESH_MS,
    refetchInterval: BANNER_REFRESH_MS,
  });
}

const SEEN_KEY = 'tw_banner_popup_closed';
/** Closed once in this tab today = not shown again; a new banner (new id) shows again. */
const seenValue = (ids: number[]) => `${istDayKey()}:${[...ids].sort((a, b) => a - b).join(',')}`;

function readSeen(): string | null {
  try {
    return sessionStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function useBannerPopup(enabled: boolean) {
  const q = useLiveBanners('everyone');
  const list = q.data ?? [];
  const value = seenValue(list.map((b) => b.id));
  const [closed, setClosed] = useState(() => readSeen());
  const open = enabled && list.length > 0 && closed !== value;
  const close = () => {
    try {
      sessionStorage.setItem(SEEN_KEY, value);
    } catch {
      /* private mode: closed for this screen only */
    }
    setClosed(value);
  };
  return { open, list, close };
}
