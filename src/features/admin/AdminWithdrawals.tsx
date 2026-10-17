import { useState } from 'react';
import { adminApi, type AdminWithdrawal } from '@/api/admin';
import {
  Button,
  Chip,
  CopyButton,
  ErrorBox,
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
import { usePageClamp } from '@/lib/usePageClamp';
import { useDebounced } from '@/lib/useDebounced';
import { useSingleFlight } from '@/lib/useSingleFlight';
import * as v from '@/lib/validators';
import { useAdminRefresh, useWithdrawals } from './adminData';
import { AdminTitle, FilterBar, CsvButton, Kpi, Kpis, Pager, Panel } from './AdminParts';

// G3 "Pay withdrawals" (+ L3 phone): first send the money by bank / UPI, then enter that UTR and press Paid.
// Reject needs a reason; the money goes back to the member's Income Wallet at once.

type Status = 'pending' | 'paid' | 'rejected';
type Bank = { holder?: string; account?: string; ifsc?: string; branch?: string; pan?: string };

function Card({ w, onDone }: { w: AdminWithdrawal; onDone: (msg: string) => void }) {
  const refresh = useAdminRefresh();
  const bank = (w.bank ?? {}) as Bank;
  const [utr, setUtr] = useState('');
  const [utrErr, setUtrErr] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<unknown>(null);

  const [send, busy] = useSingleFlight(async (action: 'paid' | 'reject') => {
    setError(null);
    if (action === 'paid') {
      const u = v.utr.safeParse(utr);
      setUtrErr(u.success ? null : (u.error.issues[0]?.message ?? 'Enter the UTR.'));
      if (!u.success) return;
      try {
        await adminApi.reviewWithdrawal(w.id, { action: 'paid', utr: u.data });
        await refresh();
        onDone(`${w.full_name}: marked paid. The member sees UTR ${u.data}.`);
      } catch (e) {
        await refresh(); // a lost answer may have worked: refresh, never send again by itself
        setError(e);
      }
      return;
    }
    if (remark.trim().length < 3) {
      setError(new Error('reason'));
      return;
    }
    try {
      await adminApi.reviewWithdrawal(w.id, { action: 'reject', remark: remark.trim() });
      await refresh();
      setRejectOpen(false);
      onDone(`${w.full_name}: rejected. The money is back in their Income Wallet.`);
    } catch (e) {
      await refresh();
      setError(e);
    }
  });

  return (
    <article className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-3.5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-col">
          <b className="text-[15px]">{w.full_name}</b>
          <span className="text-[12.5px] text-mut">
            {w.user_code} · {w.mobile} · {formatWhen(w.created_at)}
          </span>
        </div>
        <b className="num text-[22px]">
          <Money value={w.amount} />
        </b>
      </div>
      <div className="flex flex-col gap-1.5 rounded-xl bg-bg p-2.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="text-mut">Account </span>
            <b className="num break-all">{bank.account ?? '–'}</b>
          </span>
          {bank.account && <CopyButton text={bank.account} label="Copy" />}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="text-mut">IFSC · Name </span>
            <b>
              {bank.ifsc ?? '–'} · {bank.holder ?? '–'}
            </b>
          </span>
          {bank.ifsc && <CopyButton text={bank.ifsc} label="Copy" />}
        </div>
        <span>
          <span className="text-mut">Branch </span>
          {bank.branch || '–'} · <span className="text-mut">PAN </span>
          <b>{bank.pan ?? '–'}</b>
        </span>
      </div>

      {w.status === 'pending' ? (
        <>
          <span className="text-[13px] text-mut">Pay from your bank, then enter the UTR</span>
          <TextField
            label="UTR of your payment"
            autoCapitalize="characters"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            error={utrErr}
          />
          {error && !rejectOpen ? <ErrorBox error={error} /> : null}
          <div className="grid grid-cols-2 gap-2.5">
            <Button busy={busy} onClick={() => send('paid')}>
              Paid
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => setRejectOpen(true)}>
              Reject
            </Button>
          </div>
          <Sheet
            open={rejectOpen}
            onClose={() => setRejectOpen(false)}
            title={`Reject ${w.full_name}'s withdrawal`}
            locked={busy}
          >
            <Note>
              The money (<Money value={w.amount} />) goes back to the member's Income Wallet right away.
            </Note>
            <TextAreaField
              label="Reason (the member will see it)"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              error={
                error instanceof Error && error.message === 'reason'
                  ? 'A reason is required to reject.'
                  : null
              }
            />
            {error && !(error instanceof Error && error.message === 'reason') ? (
              <ErrorBox error={error} />
            ) : null}
            <Button variant="danger" busy={busy} onClick={() => send('reject')}>
              Reject and return the money
            </Button>
          </Sheet>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
          {w.status === 'paid' ? <Chip tone="ok">Paid · UTR {w.utr}</Chip> : <Chip tone="bad">Rejected</Chip>}
          <span className="text-mut">
            {w.reviewed_by_name ? `By ${w.reviewed_by_name}` : ''}
            {w.reviewed_at ? `${w.reviewed_by_name ? ' · ' : ''}${formatWhen(w.reviewed_at)}` : ''}
            {w.admin_remark ? ` · ${w.admin_remark}` : ''}
          </span>
        </div>
      )}
    </article>
  );
}

export default function AdminWithdrawals() {
  const [status, setStatus] = useState<Status>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const q = useDebounced(search.trim(), 400);
  const list = useWithdrawals({ status, search: q || undefined, page });
  const c = list.data?.counts;
  usePageClamp(page, list.data?.total, 20, setPage);

  return (
    <>
      <AdminTitle
        title="Withdrawals"
        sub='First send the money by bank or UPI, then enter that UTR and press "Paid"'
        actions={
          <CsvButton
            name="withdrawals"
            query={{ status }}
            label={status === 'pending' ? 'Excel for bank' : 'Download Excel'}
          />
        }
      />
      {c && (
        <Kpis>
          <Kpi
            alert={c.pending > 0}
            label="Still to pay"
            value={<Money value={c.pending_amount} />}
            small={`${formatCount(c.pending)} requests`}
          />
          <Kpi
            label="Paid today"
            value={<Money value={c.paid_today_amount} />}
            small={`${formatCount(c.paid_today)} requests`}
          />
          <Kpi
            label="Paid this month"
            value={<Money value={c.paid_this_month_amount} />}
            small={`${formatCount(c.paid_this_month)} requests`}
          />
          <Kpi
            label="Rejected this month"
            value={formatCount(c.rejected_this_month)}
            small="Money back in wallet"
          />
        </Kpis>
      )}
      {doneMsg && <Note role="status">{doneMsg}</Note>}
      <FilterBar boxed>
        <TextField
          label="ID or name"
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
          }}
          className="w-full desk:w-[420px]"
          items={[
            { value: 'pending', label: 'Waiting', count: c?.pending },
            { value: 'paid', label: 'Paid' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
      </FilterBar>
      {list.isError ? (
        <ErrorBox error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <SkeletonList rows={3} />
      ) : list.data.rows.length === 0 ? (
        <Panel>
          <Empty title={status === 'pending' ? 'No withdrawal is waiting.' : 'Nothing here.'} />
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 desk:grid-cols-2">
            {list.data.rows.map((w) => (
              <Card key={w.id} w={w} onDone={setDoneMsg} />
            ))}
          </div>
          <Pager page={page} size={20} total={list.data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}
