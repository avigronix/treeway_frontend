import { useEffect } from 'react';

/**
 * Keeps a page number inside the list: when rows go (approved, paid, by another admin) and the page is
 * now past the end, it steps back to the last page. Runs even when the page shows "Nothing here".
 * `total` is undefined while loading: nothing changes then.
 */
export function usePageClamp(
  page: number,
  total: number | undefined,
  size: number,
  setPage: (p: number) => void,
) {
  useEffect(() => {
    if (total === undefined) return;
    const last = Math.max(1, Math.ceil(total / size));
    if (page > last) setPage(last);
  }, [page, total, size, setPage]);
}
