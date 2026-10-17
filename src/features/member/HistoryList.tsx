import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import type { HistoryFilter } from '@/api/member';
import { Button, Card, Chip, Empty, ErrorBox, Money, SkeletonList } from '@/components/ui';
import { useHistory } from './data';
import { describeRow } from './ledger';

/** Wallet / income history rows (theme .li), newest first, "Show more" by cursor. */
export function HistoryList({
  filter,
  emptyTitle,
  emptyText,
}: {
  filter: HistoryFilter;
  emptyTitle: string;
  emptyText?: string;
}) {
  const qc = useQueryClient();
  const h = useHistory(filter);

  if (h.isPending) return <SkeletonList rows={4} />;
  if (h.isError) {
    // An old or broken cursor (400 "Cursor"): load the list again from the top.
    const reset = h.error instanceof ApiError && h.error.error === 'Cursor';
    return (
      <ErrorBox
        error={h.error}
        onRetry={() => (reset ? qc.resetQueries({ queryKey: ['history', filter] }) : h.refetch())}
      />
    );
  }
  const rows = h.data.pages.flatMap((p) => p.rows);
  if (rows.length === 0) return <Empty title={emptyTitle} text={emptyText} />;

  return (
    <>
      <Card flat>
        <ul className="m-0 list-none p-0">
          {rows.map((r) => {
            const v = describeRow(r);
            return (
              <li
                key={r.id}
                className="flex min-h-[58px] items-center justify-between gap-2.5 border-b border-line2 px-3.5 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <b className="text-[14.5px]">{v.title}</b>
                  <span className="text-[12.5px] text-mut">{v.detail}</span>
                </div>
                <div className="flex flex-none flex-col items-end gap-0.5">
                  <Money value={r.amount} colored />
                  {v.chip ? (
                    <Chip tone={v.chip.tone}>{v.chip.text}</Chip>
                  ) : v.note ? (
                    <span className="text-xs text-mut">{v.note}</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      {h.hasNextPage && (
        <Button variant="ghost" size="md" busy={h.isFetchingNextPage} onClick={() => h.fetchNextPage()}>
          Show more
        </Button>
      )}
    </>
  );
}
