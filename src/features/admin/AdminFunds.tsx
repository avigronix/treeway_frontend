import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ApiError } from '@/api/client';
import { adminApi, type AdminPaymentRequest } from '@/api/admin';
import {
  Button,
  Chip,
  ErrorBox,
  KeyValue,
  Money,
  Note,
  Pills,
  SkeletonList,
  Tabs,
  TextAreaField,
  TextField,
  Empty,
} from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { usePageClamp } from '@/lib/usePageClamp';
import { useDebounced } from '@/lib/useDebounced';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { cx } from '@/lib/cx';
import { useConfig } from '@/features/auth/usePublic';
import { useAdminRefresh, usePayments } from './adminData';
import { AdminTitle, FilterBar, CsvButton, Pager, Panel, Table, td } from './AdminParts';
import { Receipt } from './Receipt';

// G2 "Approve sign-up and funds": waiting payments (activation, add funds, buy PINs), receipt, approve or
// reject with a reason the member sees. Money rule: buttons lock while sending, data refreshes after every
// action, and a lost answer refreshes instead of sending again.

type Status = 'pending' | 'approved' | 'rejected';
type Purpose = 'all' | 'activation' | 'fund' | 'pins';
const FOR: Record<AdminPaymentRequest['purpose'], string> = {
  activation: 'Activation',
  fund: 'Add funds',
  pins: 'Buy PINs',
};
const REASONS = ['UTR not in bank', 'Wrong amount', 'Receipt not clear'];
const statusChip = (s: Status) =>
  s === 'pending' ? (
    <Chip tone="wait">Waiting</Chip>
  ) : s === 'approved' ? (
    <Chip tone="ok">Approved</Chip>
  ) : (
    <Chip tone="bad">Rejected</Chip>
  );

/** One payment: receipt, details, approve / reject. Also used by the phone dashboard's "Check payments". */
export function PaymentDetail({ r, onDone }: { r: AdminPaymentRequest; onDone: (msg: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  // On a phone the panel is below the list: bring it into view.
  useEffect(() => {
    box.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, []);
  const refresh = useAdminRefresh();
  const config = useConfig().data;
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<unknown>(null);

  const [review, busy] = useSingleFlight(async (action: 'approve' | 'reject') => {
    setError(null);
    if (action === 'reject' && remark.trim().length < 3) {
      setError(
        new ApiError(400, 'Validation Error', 'Write the reason for rejecting (the member will see it).'),
      );
      return;
    }
    try {
      const env = await adminApi.reviewPayment(r.id, action, action === 'reject' ? remark.trim() : undefined);
      await refresh();
      onDone(
        env.status === 202
          ? `${r.full_name}: sent for a second admin to approve (big amount). It is done when they approve.`
          : action === 'approve'
            ? `${r.full_name} (${r.user_code}): approved.`
            : `${r.full_name} (${r.user_code}): rejected. The member sees your reason.`,
      );
    } catch (e) {
      // A lost answer may still have worked: refresh first, never send it again by itself.
      await refresh();
      setError(e);
    }
  });

  const pending = r.status === 'pending';
  return (
    <div ref={box}>
      <Panel
        title={
          <div className="flex flex-col">
            <b className="text-[17px]">
              {r.full_name} · {r.user_code}
            </b>
            <span className="text-[13px] text-mut">
              {r.sponsor_name ? `Sponsor: ${r.sponsor_name} (${r.sponsor_code})` : ' '}
            </span>
          </div>
        }
        right={statusChip(r.status)}
      >
        <Receipt path={r.receipt_path} />
        <div className="flex flex-col gap-1.5">
          <KeyValue k="For">
            {FOR[r.purpose]}
            {r.purpose === 'pins' ? ` · ${r.pin_qty} PINs` : ''}
          </KeyValue>
          <KeyValue k="UTR">{r.utr}</KeyValue>
          <KeyValue k="Amount">
            <Money value={r.amount} />
          </KeyValue>
          <KeyValue k="Sent">{formatWhen(r.created_at)}</KeyValue>
          {r.note && <KeyValue k="Member's note">{r.note}</KeyValue>}
          {r.reviewed_by_name && (
            <KeyValue k={r.status === 'approved' ? 'Approved by' : 'Rejected by'}>
              {r.reviewed_by_name}
              {r.reviewed_at ? ` · ${formatWhen(r.reviewed_at)}` : ''}
            </KeyValue>
          )}
          {r.admin_remark && <KeyValue k="Reason">{r.admin_remark}</KeyValue>}
        </div>
        {pending && (
          <>
            <Note>
              {r.purpose === 'activation'
                ? `On approve, the ID turns on: level income is shared${config ? `, ₹${config.product_wallet_on_activation} goes to the Product Wallet` : ''}, a Single Leg spot is given and Super 3 counts update.`
                : r.purpose === 'pins'
                  ? 'On approve, the PINs are created and sent to the member.'
                  : 'On approve, the money goes to the Fund Wallet.'}
            </Note>
            <div className="flex flex-col gap-2">
              <TextAreaField
                label="Reason for reject (the member will see it)"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="h-[72px]"
              />
              <Pills
                label="Common reasons"
                value={REASONS.includes(remark) ? remark : ''}
                onChange={setRemark}
                items={REASONS.map((x) => ({ value: x, label: x }))}
              />
            </div>
            {error ? <ErrorBox error={error} /> : null}
            <div className="grid grid-cols-2 gap-2.5">
              <Button busy={busy} onClick={() => review('approve')}>
                Approve
              </Button>
              <Button variant="danger" busy={busy} onClick={() => review('reject')}>
                Reject
              </Button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

export default function AdminFunds() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('pending');
  const [purpose, setPurpose] = useState<Purpose>('all');
  const [search, setSearch] = useState(() => params.get('search') ?? ''); // from the dashboard search
  const [page, setPage] = useState(1);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const q = useDebounced(search.trim(), 400);
  const selected = Number(params.get('id')) || null;
  const list = usePayments({
    status,
    purpose: purpose === 'all' ? undefined : purpose,
    search: q || undefined,
    page,
  });
  const counts = list.data?.counts;
  usePageClamp(page, list.data?.total, 20, setPage);
  const row = list.data?.rows.find((r) => r.id === selected) ?? null;

  const pick = (id: number | null) => setParams(id ? { id: String(id) } : {}, { replace: true });

  return (
    <>
      <AdminTitle
        title="Activation and fund payments"
        sub="Match the UTR and amount with your bank statement before you approve"
        actions={<CsvButton name="payment-requests" query={{ status }} />}
      />
      {doneMsg && (
        <Note role="status" tone="info">
          {doneMsg}
        </Note>
      )}
      <FilterBar boxed>
        <TextField
          label="UTR or ID"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          fieldClassName="w-full desk:w-[300px]"
        />
        <Tabs
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
            pick(null);
          }}
          className="w-full desk:w-[420px]"
          items={[
            { value: 'pending', label: 'Waiting', count: counts?.pending },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
        <Pills
          label="Payment for"
          value={purpose}
          onChange={(v) => {
            setPurpose(v);
            setPage(1);
          }}
          items={[
            { value: 'all', label: 'All' },
            {
              value: 'activation',
              label: 'Activation',
              count: status === 'pending' ? counts?.pending_activation : undefined,
            },
            { value: 'fund', label: 'Add funds' },
            { value: 'pins', label: 'PINs' },
          ]}
        />
      </FilterBar>
      <div className="grid grid-cols-1 gap-[18px] desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel>
          {list.isError ? (
            <ErrorBox error={list.error} onRetry={() => list.refetch()} />
          ) : !list.data ? (
            <SkeletonList rows={4} />
          ) : list.data.rows.length === 0 ? (
            <Empty title="Nothing here." />
          ) : (
            <>
              <Table head={['Member', 'For', 'UTR', 'Amount', 'When', '']} min={640}>
                {list.data.rows.map((r) => (
                  <tr key={r.id} className={cx(r.id === selected && 'bg-tint')}>
                    <td className={td}>
                      <b>{r.full_name}</b>
                      <small className="block text-[12.5px] text-mut">
                        {r.user_code}
                        {r.sponsor_name ? ` · sponsor ${r.sponsor_name}` : ''}
                      </small>
                    </td>
                    <td className={td}>{FOR[r.purpose]}</td>
                    <td className={cx(td, 'num')}>{r.utr}</td>
                    <td className={td}>
                      <Money value={r.amount} />
                    </td>
                    <td className={td}>{formatWhen(r.created_at)}</td>
                    <td className={td}>
                      <Button
                        size="sm"
                        variant={r.id === selected ? 'primary' : 'ghost'}
                        onClick={() => pick(r.id)}
                      >
                        {status === 'pending' ? 'Check' : 'View'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </Table>
              <Pager page={page} size={20} total={list.data.total} onPage={setPage} />
            </>
          )}
        </Panel>
        <div className="min-w-0">
          {row ? (
            <PaymentDetail
              key={row.id}
              r={row}
              onDone={(msg) => {
                setDoneMsg(msg);
                pick(null);
              }}
            />
          ) : (
            <Panel>
              <span className="text-[13px] text-mut">
                Tap "Check" on a payment to see its receipt and approve or reject it.
              </span>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
