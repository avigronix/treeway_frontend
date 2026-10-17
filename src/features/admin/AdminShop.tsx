import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shopAdminApi, type AdminOrder } from '@/api/shop';
import {
  Button,
  Chip,
  ErrorBox,
  KeyValue,
  Money,
  Note,
  Sheet,
  SkeletonList,
  Tabs,
  TextAreaField,
  TextField,
  Empty,
} from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { useDebounced } from '@/lib/useDebounced';
import { usePageClamp } from '@/lib/usePageClamp';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { UTR_RE } from '@/lib/validators';
import { cx } from '@/lib/cx';
import { useAdminRefresh } from './adminData';
import { AdminTitle, CsvButton, Kpi, Kpis, Pager, Panel, Table, td } from './AdminParts';
import { ProductsPanel } from './AdminProducts';
import { RatesPanel } from './AdminRates';
import { Receipt } from './Receipt';
import { ORDER_TABS, orderStep, type OrderTab } from './adminText';

// J1 "Products and orders": check the delivery payment, pack, ship with tracking, deliver, cancel (money back),
// record delivery refunds; products and stock; delivery charges by PIN code.

function OrderSheet({ o, onClose }: { o: AdminOrder; onClose: (msg?: string) => void }) {
  const refresh = useAdminRefresh();
  const step = orderStep(o);
  const [remark, setRemark] = useState('');
  const [courier, setCourier] = useState(o.courier_name ?? '');
  const [tracking, setTracking] = useState(o.tracking_no ?? '');
  const [refundUtr, setRefundUtr] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const [act, busy] = useSingleFlight(
    async (what: 'approve' | 'reject' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded') => {
      setError(null);
      setErr(null);
      if ((what === 'reject' || what === 'cancelled') && remark.trim().length < 3) {
        setErr(
          what === 'reject'
            ? 'Write why the payment is rejected. The member sees it.'
            : 'Write the reason for cancelling.',
        );
        return;
      }
      if (what === 'shipped' && (courier.trim().length < 2 || tracking.trim().length < 3)) {
        setErr('Enter the courier name and tracking number.');
        return;
      }
      if (what === 'refunded' && !UTR_RE.test(refundUtr.trim().toUpperCase())) {
        setErr('Enter the UTR of the money you sent back.');
        return;
      }
      try {
        if (what === 'approve' || what === 'reject')
          await shopAdminApi.courierReview(o.id, what, remark.trim());
        else if (what === 'refunded')
          await shopAdminApi.courierRefunded(o.id, refundUtr.trim().toUpperCase());
        else
          await shopAdminApi.setStatus(o.id, {
            status: what,
            remark: remark.trim() || undefined,
            courier_name: what === 'shipped' ? courier.trim() : undefined,
            tracking_no: what === 'shipped' ? tracking.trim() : undefined,
          });
        onClose(
          {
            approve: `Delivery payment of ${o.order_no} approved. You can pack it now.`,
            reject: `Delivery payment of ${o.order_no} rejected. The member has 7 days to pay again.`,
            packed: `${o.order_no} packed.`,
            shipped: `${o.order_no} shipped.`,
            delivered: `${o.order_no} delivered.`,
            cancelled: `${o.order_no} cancelled. The product money is back in the member's wallets.`,
            refunded: `Delivery refund of ${o.order_no} saved.`,
          }[what],
        );
      } catch (e) {
        setError(e);
      } finally {
        await refresh();
      }
    },
  );

  const a = o.address as { name?: string; mobile?: string; address?: string; pincode?: string };
  return (
    <Sheet open onClose={() => onClose()} title={`Order ${o.order_no}`} locked={busy}>
      <div className="flex flex-col gap-1.5">
        <KeyValue k="Member">
          {o.full_name} ({o.user_code})
        </KeyValue>
        <KeyValue k="Products">
          {o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')} · <Money value={o.items_total} />
          {o.prescription_id ? " · doctor's medicine" : ''}
        </KeyValue>
        <KeyValue k="Paid from">
          <Money value={o.paid.product} /> Product · <Money value={o.paid.fund} /> Fund ·{' '}
          <Money value={o.paid.income} /> Income
        </KeyValue>
        <KeyValue k="Deliver to">
          {a.name} · {a.mobile} · {a.address} · {a.pincode}
        </KeyValue>
        <KeyValue k="Delivery">
          <Money value={o.courier_charge} />
          {o.courier_state ? ` (${o.courier_state})` : ''} · UTR {o.courier_utr} · {o.courier_status}
        </KeyValue>
        {o.tracking_no && (
          <KeyValue k="Courier">
            {o.courier_name} · {o.tracking_no}
          </KeyValue>
        )}
        {o.cancel_reason && <KeyValue k="Cancelled">{o.cancel_reason}</KeyValue>}
      </div>
      {step === 'payment' && <Receipt path={o.courier_receipt} label="Delivery payment" />}
      {step === 'member' && (
        <Note>
          Payment rejected: waiting for the member to pay the delivery again (7 days, then it is cancelled).
        </Note>
      )}
      {step === 'ship' && (
        <>
          <TextField label="Courier name" value={courier} onChange={(e) => setCourier(e.target.value)} />
          <TextField label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
        </>
      )}
      {step === 'refund' && (
        <>
          <Note tone="warn">
            Send <Money value={o.courier_charge} /> back to the member from the bank, then enter that UTR.
          </Note>
          <TextField
            label="Refund UTR"
            autoCapitalize="characters"
            value={refundUtr}
            onChange={(e) => setRefundUtr(e.target.value)}
          />
        </>
      )}
      {(step === 'payment' || step === 'pack' || step === 'ship') && (
        <TextAreaField
          label="Note (needed to reject or cancel)"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
      )}
      {err && <Note tone="bad">{err}</Note>}
      {error ? <ErrorBox error={error} /> : null}
      <div className="flex flex-wrap gap-2">
        {step === 'payment' && (
          <>
            <Button size="sm" busy={busy} onClick={() => act('approve')}>
              Payment found · approve
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => act('reject')}>
              Reject payment
            </Button>
          </>
        )}
        {step === 'pack' && (
          <Button size="sm" busy={busy} onClick={() => act('packed')}>
            Mark packed
          </Button>
        )}
        {step === 'ship' && (
          <Button size="sm" busy={busy} onClick={() => act('shipped')}>
            Mark shipped
          </Button>
        )}
        {step === 'deliver' && (
          <Button size="sm" busy={busy} onClick={() => act('delivered')}>
            Mark delivered
          </Button>
        )}
        {step === 'refund' && (
          <Button size="sm" busy={busy} onClick={() => act('refunded')}>
            Save refund
          </Button>
        )}
        {(o.status === 'placed' || o.status === 'packed') && (
          <Button size="sm" variant="danger" disabled={busy} onClick={() => act('cancelled')}>
            Cancel order
          </Button>
        )}
      </div>
    </Sheet>
  );
}

export default function AdminShop() {
  const [tab, setTab] = useState<OrderTab>('payment');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AdminOrder | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const q = useDebounced(search.trim(), 400);
  const filter = ORDER_TABS.find((t) => t.value === tab)!.q;
  const list = useQuery({
    queryKey: ['admin', 'shop', 'orders', tab, q, page],
    queryFn: ({ signal }) => shopAdminApi.orders({ ...filter, search: q || undefined, page }, signal),
    placeholderData: (p) => p,
  });
  usePageClamp(page, list.data?.total, 20, setPage);
  const c = list.data?.counts;

  return (
    <>
      <AdminTitle
        title="Products and orders"
        sub="Check the delivery payment, pack, add courier tracking, manage stock"
        actions={
          <CsvButton name="orders" query={{ status: 'status' in filter ? filter.status : undefined }} />
        }
      />
      {c && (
        <Kpis>
          <Kpi
            label="Payment to check"
            value={formatCount(c.payment_to_check)}
            alert={c.payment_to_check > 0}
          />
          <Kpi label="To pack" value={formatCount(c.to_pack)} alert={c.to_pack > 0} />
          <Kpi label="On the way" value={formatCount(c.on_the_way)} />
          <Kpi label="Delivered this month" value={formatCount(c.delivered_this_month)} />
          <Kpi
            label="Delivery refunds due"
            value={formatCount(c.courier_refunds_due)}
            alert={c.courier_refunds_due > 0}
          />
          <Kpi label="Low stock" value={`${formatCount(c.low_stock)} products`} alert={c.low_stock > 0} />
        </Kpis>
      )}
      {msg && (
        <Note role="status" tone="info">
          {msg}
        </Note>
      )}
      <TextField
        label="Order no., member ID or UTR"
        type="search"
        value={search}
        onChange={(e) => (setSearch(e.target.value), setPage(1))}
        fieldClassName="max-w-[320px]"
      />
      <Tabs
        label="Orders"
        value={tab}
        onChange={(v) => (setTab(v), setPage(1))}
        items={ORDER_TABS.map((t) => ({
          value: t.value,
          label: t.label,
          count:
            t.value === 'payment'
              ? c?.payment_to_check
              : t.value === 'pack'
                ? c?.to_pack
                : t.value === 'refund'
                  ? c?.courier_refunds_due
                  : undefined,
        }))}
      />
      <Panel>
        {list.isError ? (
          <ErrorBox error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data ? (
          <SkeletonList rows={4} />
        ) : list.data.rows.length === 0 ? (
          <Empty
            title="Nothing here."
            text={
              q
                ? `No "${q}" in ${ORDER_TABS.find((t) => t.value === tab)!.label}. Look in the other tabs.`
                : undefined
            }
          />
        ) : (
          <>
            {/* Another tab's rows while the new list loads: not tappable (they would open an old state). */}
            <div
              aria-busy={list.isPlaceholderData || undefined}
              className={cx(list.isPlaceholderData && 'pointer-events-none opacity-50')}
            >
              <Table head={['Order', 'Member', 'Products', 'Address', 'Delivery', '']} min={820}>
                {list.data.rows.map((o) => {
                  const a = o.address as { address?: string; pincode?: string };
                  return (
                    <tr key={o.id}>
                      <td className={td}>
                        <b className="num">{o.order_no}</b>
                        <small className="block text-[12.5px] text-mut">{formatWhen(o.created_at)}</small>
                      </td>
                      <td className={td}>
                        {o.full_name}
                        <small className="block text-[12.5px] text-mut">{o.user_code}</small>
                      </td>
                      <td className={td}>
                        {o.prescription_id
                          ? "Doctor's medicine"
                          : o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}
                        <small className="block text-[12.5px] text-mut">
                          <Money value={o.items_total} />
                        </small>
                      </td>
                      <td className={td}>
                        {(a.address ?? '').slice(0, 30)} · {a.pincode}
                      </td>
                      <td className={td}>
                        <Money value={o.courier_charge} />{' '}
                        {o.courier_status === 'approved' ? (
                          <Chip tone="ok">paid</Chip>
                        ) : o.courier_status === 'rejected' ? (
                          <Chip tone="bad">rejected</Chip>
                        ) : (
                          <Chip tone="wait">check</Chip>
                        )}
                        {o.tracking_no && (
                          <small className="block text-[12.5px] text-mut">{o.tracking_no}</small>
                        )}
                      </td>
                      <td className={td}>
                        <Button size="sm" variant="ghost" onClick={() => (setOpen(o), setMsg(null))}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            </div>
            <Pager page={page} size={20} total={list.data.total} onPage={setPage} />
          </>
        )}
      </Panel>
      {open && (
        <OrderSheet
          o={open}
          onClose={(m) => {
            setOpen(null);
            if (m) setMsg(m);
          }}
        />
      )}
      <ProductsPanel />
      <RatesPanel />
    </>
  );
}
