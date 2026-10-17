import { useEffect, useState } from 'react';
import { buildUrl } from '@/api/client';
import { getToken } from '@/auth/token';

/**
 * A private file (receipt, evidence, chat file) as an object URL. Private files need the token, so they
 * are fetched with it and shown from a blob, never as a plain <img src="/api/...">.
 * `path` is the backend's relative path, e.g. "receipts/abc.jpg".
 */
export function useFileBlob(path: string | null | undefined) {
  const [state, setState] = useState<{ url: string | null; type: string | null; error: boolean }>({
    url: null,
    type: null,
    error: false,
  });

  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    let url: string | null = null;
    const token = getToken();
    fetch(buildUrl(`/files/${path.replace(/^\/+/, '')}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: ctrl.signal,
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        setState({ url, type: blob.type, error: false });
      })
      .catch((e: unknown) => {
        if ((e as Error)?.name !== 'AbortError') setState({ url: null, type: null, error: true });
      });
    return () => {
      ctrl.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);

  return state;
}
