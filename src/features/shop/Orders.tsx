import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { refreshMoney } from '@/api/queryClient';
import { shopApi, shopKeys, type Order } from '@/api/shop';
import {
  Button,
  Card,
  Chip,
  CopyButton,
  ErrorBox,
  FilePicker,
  Money,
  Note,
  Sheet,
  SkeletonList,
  TextField,
} from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { UTR_RE } from '@/lib/validators';
import { cx } from '@/lib/cx';
import { MemberPage } from '@/features/member/MemberPage';
import { ORDER_LABEL, orderSteps } from './shopText';

// D4 "My orders": where each order is, cancel before packing, send the delivery payment again if it was
// rejected, and what happens to the delivery money of a cancelled order.

/** Which wallets paid the products, as the server split it. */
const paidFrom = (o: Order) =>
  (
    [
      ['Product', o.paid.product],
      ['Fund', o.paid.fund],
      ['Income', o.paid.income],
    ] as const
  ).filter(([, v]) => v > 0);

const tone = (s: Order['status']) =>
  s === 'delivered' ? 'ok' : s === 'cancelled' ? 'muted' : s === 'shipped' ? 'gold' : 'wait';

function Cancel({ o }: { o: Order }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [go, busy] = useSingleFlight(async () => {
    setError(null);
    try {
      await shopApi.cancel(o.id, 'Cancelled by member');
      setOpen(false);
    } catch (e) {
      setError(e);
    } finally {
      await refreshMoney(qc);
    }
  });
  return (
    <>
      <Button size="sm" variant="danger" onClick={() => setOpen(true)}>
        Cancel order
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Cancel this order?" locked={busy}>
        <Note>
          The product money (<Money value={o.items_total} />) goes back to the same wallets.
          {o.courier_charge > 0 && o.courier_status !== 'rejected'
            ? ' The delivery money is sent back to you by the team from the bank.'
            : ''}
        </Note>
        {error ? <ErrorBox error={error} /> : null}
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
            Keep it
          </Button>
          <Button variant="danger" busy={busy} onClick={go}>
            Cancel order
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function ResendUtr({ o }: { o: Order }) {
  const qc = useQueryClient();
  const [utr, setUtr] = useState('');
  const [utrErr, setUtrErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [send, busy] = useSingleFlight(async () => {
    setError(null);
    const u = utr.trim().toUpperCase();
    setUtrErr(UTR_RE.test(u) ? null : 'Enter the UTR of the new payment.');
    if (!file) setFileErr('Add the payment screenshot.');
    if (!UTR_RE.test(u) || !file) return;
    try {
      await shopApi.resendUtr(o.id, u, file);
    } catch (e) {
      setError(e);
    } finally {
      await refreshMoney(qc);
    }
  });
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#E9C46A] bg-[#FFFBEF] p-3">
      <span className="text-sm font-bold text-w">The delivery payment was not found</span>
      {o.courier_remark && <span className="text-xs">Team: "{o.courier_remark}"</span>}
      <span className="text-xs text-mut">
        Pay <Money value={o.courier_charge} /> again by UPI and send the new UTR. Not paid in 7 days → the
        order is cancelled and the product money comes back.
      </span>
      <TextField
        label="New UTR"
        autoCapitalize="characters"
        value={utr}
        onChange={(e) => setUtr(e.target.value)}
        error={utrErr}
      />
      <FilePicker
        label="Payment screenshot"
        file={file}
        error={fileErr}
        disabled={busy}
        onChange={(x, p) => (setFile(x), setFileErr(p))}
      />
      {error ? <ErrorBox error={error} /> : null}
      <Button size="md" busy={busy} onClick={send}>
        Send payment again
      </Button>
    </div>
  );
}

function OrderCard({ o }: { o: Order }) {
  const [open, setOpen] = useState(o.status !== 'delivered' && o.status !== 'cancelled');
  const names = o.items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join(', ');
  return (
    <Card className="gap-2">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex min-w-0 flex-col">
          <b className="num text-sm">#{o.order_no}</b>
          <span className="truncate text-[13px] text-mut">
            {o.prescription_id ? "Doctor's medicine · " : ''}
            {names} · <Money value={o.items_total} /> · {formatDay(o.created_at)}
          </span>
        </span>
        <Chip tone={tone(o.status)}>{ORDER_LABEL[o.status]}</Chip>
      </button>
      {open && (
        <div className="flex flex-col gap-2 text-[13px]">
          {o.status === 'cancelled' ? (
            <>
              <span>{o.cancel_reason ?? 'Cancelled'} · money returned to your wallets</span>
              {o.courier_refund_due && !o.courier_refunded_at && (
                <span className="text-mut">
                  Delivery money <Money value={o.courier_charge} />: the team sends it back from the bank.
                </span>
              )}
              {o.courier_refunded_at && (
                <span className="text-mut">
                  Delivery money sent back on {formatDay(o.courier_refunded_at)}.
                </span>
              )}
            </>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
              {orderSteps(o).map((s, i) => (
                <li key={s.key} className={cx('flex gap-2', s.done ? 'text-ink' : 'text-mut')}>
                  <b className={s.done ? 'text-g' : ''}>{s.done ? '✓' : i + 1}</b>
                  <span>
                    {s.label}
                    {s.at && s.done ? ` · ${formatDay(s.at)}` : ''}
                    {s.key === 'placed' &&
                      paidFrom(o).map(([w, v], k) => (
                        <span key={w}>
                          {k === 0 ? ' · ' : ' + '}
                          <Money value={v} /> from {w} Wallet
                        </span>
                      ))}
                    {s.key === 'shipped' && o.courier_name ? ` · ${o.courier_name}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {o.tracking_no && o.status !== 'cancelled' && (
            <span className="flex items-center gap-2">
              Tracking no. <b className="num">{o.tracking_no}</b>{' '}
              <CopyButton text={o.tracking_no} label="Copy tracking number" />
            </span>
          )}
          {o.status === 'placed' && o.courier_status === 'pending' && (
            <span className="text-mut">Checking your delivery payment (UTR {o.courier_utr}).</span>
          )}
          {o.status === 'placed' && o.courier_status === 'rejected' && <ResendUtr o={o} />}
          {o.status === 'placed' && <Cancel o={o} />}
        </div>
      )}
    </Card>
  );
}

export default function Orders() {
  const msg = (useLocation().state as { msg?: string } | null)?.msg;
  const q = useInfiniteQuery({
    queryKey: shopKeys.orders,
    queryFn: ({ pageParam, signal }) => shopApi.orders(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];
  return (
    <MemberPage title="My orders" subtitle="Where is my order?" back="/shop" className="gap-3">
      {msg && (
        <Note role="status" tone="info">
          {msg}
        </Note>
      )}
      {q.isError ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <SkeletonList rows={3} />
      ) : rows.length === 0 ? (
        <Note>No orders yet.</Note>
      ) : (
        rows.map((o) => <OrderCard key={o.id} o={o} />)
      )}
      {q.hasNextPage && (
        <Button variant="ghost" size="md" busy={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
          Show more
        </Button>
      )}
      <span className="text-center text-[13px] text-mut">
        Problem with an order? <Link to="/complaints/new">Raise a complaint</Link>
      </span>
    </MemberPage>
  );
}
