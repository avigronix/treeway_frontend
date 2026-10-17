import type { MyPaymentRequest } from '@/api/wallet';
import { Card, Chip, Empty, ErrorBox, Money, SkeletonList } from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import type { useMyRequests } from './data';

/** "Past requests": amount, UTR, when, status, and the reason if it was rejected. */
export function RequestList({ q, emptyTitle }: { q: ReturnType<typeof useMyRequests>; emptyTitle: string }) {
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <SkeletonList rows={2} />;
  if (q.data.rows.length === 0) return <Empty title={emptyTitle} />;
  return (
    <Card flat>
      <ul className="m-0 list-none p-0">
        {q.data.rows.map((r: MyPaymentRequest) => (
          <li
            key={r.id}
            className="flex min-h-[58px] items-center justify-between gap-2.5 border-b border-line2 px-3.5 py-3 last:border-b-0"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <b className="num">
                <Money value={r.amount} />
                {r.purpose === 'pins' ? ` · ${r.pin_qty} PIN${r.pin_qty === 1 ? '' : 's'}` : ''} · UTR …
                {r.utr.slice(-4)}
              </b>
              <span className="text-[12.5px] text-mut">
                {r.status === 'rejected' && r.admin_remark
                  ? `Reason: ${r.admin_remark}`
                  : formatWhen(r.created_at)}
              </span>
            </div>
            {r.status === 'approved' ? (
              <Chip tone="ok">Approved</Chip>
            ) : r.status === 'rejected' ? (
              <Chip tone="bad">Rejected</Chip>
            ) : (
              <Chip tone="wait">Waiting</Chip>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
