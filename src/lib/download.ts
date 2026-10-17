import { ApiError, buildUrl } from '@/api/client';
import { getToken } from '@/auth/token';

/** The file name from `Content-Disposition` (attachment; filename="x.csv"), else the fallback. */
export function fileNameFrom(header: string | null, fallback: string): string {
  const m = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return m?.[1] ? decodeURIComponent(m[1]) : fallback;
}

/**
 * Downloads a private file (CSV export) with the token and saves it. Private files need the token,
 * so a plain <a href> cannot be used. Throws ApiError with the server's message on failure.
 */
export async function downloadFile(
  path: string,
  query: Record<string, string | undefined>,
  fallbackName: string,
): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    throw new ApiError(0, 'Network', 'No internet. Check your connection and try again.');
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
      credentials: 'omit',
    });
  } catch {
    throw new ApiError(0, 'Network', 'No internet. Check your connection and try again.');
  }
  if (!res.ok) {
    let msg = 'The file could not be made. Try again.';
    try {
      const body = (await res.json()) as { msg?: string };
      if (body?.msg) msg = body.msg;
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, 'Error', msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileNameFrom(res.headers.get('content-disposition'), fallbackName);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
