import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import type { Schema } from '@/api/schema';
import {
  Button,
  Chip,
  ErrorBox,
  Money,
  Note,
  SelectField,
  Sheet,
  SkeletonList,
  Tabs,
  Empty,
} from '@/components/ui';
import { formatFullDate, formatWhen, istDayKey } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { cx } from '@/lib/cx';
import { useAdminRefresh } from './adminData';
import { AdminTitle, Kpi, Kpis, Panel, Table, td } from './AdminParts';
import { IncomeEntries, OtherReports, SingleLegRuns, TdsReport } from './AdminReports';
import { lastMonths, monthLabel, pnlLines } from './adminText';

// H3 "Income, profit and TDS": profit and loss, monthly payouts (royalty + S3 Level), TDS and reports.
type Section = 'pnl' | 'payouts' | 'tds' | 'reports';

function Line({ k, v, strong }: { k: string; v: number; strong?: boolean }) {
  return (
    <tr>
      <td className={cx(td, strong && 'font-bold')}>{k}</td>
      <td className={cx(td, 'text-right', strong && 'font-bold')}>
        <Money value={v} />
      </td>
    </tr>
  );
}

function Pnl({ month }: { month: string }) {
  const p = useQuery({
    queryKey: ['admin', 'pnl', month],
    queryFn: ({ signal }) => adminApi.pnl(month, signal),
  });
  if (p.isError) return <ErrorBox error={p.error} onRetry={() => p.refetch()} />;
  if (!p.data) return <SkeletonList rows={6} />;
  const d = p.data;
  const ci = d.company_income;
  const k = d.kept_out;
  const lines = pnlLines(d);
  return (
    <>
      <Kpis>
        <Kpi label="Profit" value={<Money value={d.profit} colored />} small={monthLabel(d.month)} />
        <Kpi label="Joinings" value={formatCount(d.joins)} small={<Money value={d.money_in.turnover} />} />
        <Kpi label="Level income" value={<Money value={d.costs.level_income_pool} />} />
        <Kpi label="Tax cut (TDS)" value={<Money value={k.tds} />} small="By PAN · not profit" />
        <Kpi label="Service charge" value={<Money value={ci.service_charge} />} small="Company income" />
        <Kpi label="Self Help Fund" value={<Money value={k.self_help} />} small="Kept aside" />
      </Kpis>
      <div className="grid grid-cols-1 gap-[18px] desk:grid-cols-2">
        <Panel title="Money in">
          <Table head={['', '₹']} min={300}>
            {lines.moneyIn.map(([a, b]) => (
              <Line key={a} k={a} v={b} />
            ))}
          </Table>
        </Panel>
        <Panel title="Money out">
          <Table head={['', '₹']} min={300}>
            {lines.moneyOut.map(([a, b]) => (
              <Line key={a} k={a} v={b} />
            ))}
            <Line k="Profit" v={d.profit} strong />
          </Table>
        </Panel>
      </div>
      <Panel title="Kept aside (not profit)">
        <Table head={['', '₹']} min={300}>
          {lines.keptAside.map(([a, b]) => (
            <Line key={a} k={a} v={b} />
          ))}
        </Table>
        <Note>
          TDS is government money and the money on hold belongs to members, so neither is counted as profit.
          {d.shop.mrp_sold > 0 &&
            ` Shop: ₹${formatCount(d.shop.sales)} paid from Fund + Income wallets${d.shop.in_profit ? ' (added to profit)' : ' (not added to profit)'}.`}
        </Note>
      </Panel>
    </>
  );
}

function PayConfirm({ p, onClose }: { p: Schema<'PayoutPreview-Output'>; onClose: () => void }) {
  const refresh = useAdminRefresh();
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const [pay, busy] = useSingleFlight(async () => {
    setError(null);
    try {
      await adminApi.payMonth(p.month);
      setDone(true);
    } catch (e) {
      setError(e);
    } finally {
      // Paying twice is safe on the server; still never retry by itself. Show the server's state.
      await refresh();
    }
  });
  return (
    <Sheet open onClose={onClose} title={`Pay ${monthLabel(p.month)}`} locked={busy}>
      {done ? (
        <>
          <Note role="status" tone="info">
            Royalty and S3 Level of {monthLabel(p.month)} are paid. Members see it in their Income Wallet.
          </Note>
          <Button onClick={onClose}>Done</Button>
        </>
      ) : (
        <>
          <Note tone="warn">
            Royalty pool <Money value={p.royalty.pool_total} /> for{' '}
            {formatCount(p.royalty.ranks.reduce((a, r) => a + r.members, 0))} members (of it,{' '}
            <Money value={p.royalty.to_company} /> goes to the company). S3 Level pool{' '}
            <Money value={p.s3_level.pool_total} /> for {formatCount(p.s3_level.members)} members (
            <Money value={p.s3_level.to_company} /> to the company). This cannot be undone.
          </Note>
          {error ? <ErrorBox error={error} /> : null}
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="ghost" disabled={busy} onClick={onClose}>
              Back
            </Button>
            <Button busy={busy} onClick={pay}>
              Pay now
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function Payouts() {
  const months = lastMonths(istDayKey(), 12);
  const [month, setMonth] = useState(months[1]!); // last month: the one to pay now
  const [paying, setPaying] = useState(false);
  const p = useQuery({
    queryKey: ['admin', 'payout', month],
    queryFn: ({ signal }) => adminApi.payoutPreview(month, signal),
  });
  const runs = useQuery({
    queryKey: ['admin', 'payout-runs'],
    queryFn: ({ signal }) => adminApi.payoutRuns(signal),
  });
  const d = p.data;
  const paid = d && d.runs.royalty?.status === 'done' && d.runs.s3_level?.status === 'done';

  return (
    <>
      <SelectField
        label="Month"
        options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        fieldClassName="max-w-[240px]"
      />
      {p.isError ? (
        <ErrorBox error={p.error} onRetry={() => p.refetch()} />
      ) : !d ? (
        <SkeletonList rows={5} />
      ) : (
        <div className="grid grid-cols-1 gap-[18px] desk:grid-cols-2">
          <Panel
            title={`Royalty · ${monthLabel(d.month)}`}
            right={<span className="text-[13px] text-mut">pays on {formatFullDate(d.pay_from)}</span>}
          >
            <Table head={['Rank', 'Members', 'Each gets', 'To company']} min={420}>
              {d.royalty.ranks.map((r) => (
                <tr key={r.rank}>
                  <td className={td}>{r.name}</td>
                  <td className={cx(td, 'num')}>{formatCount(r.members)}</td>
                  <td className={td}>{r.members ? <Money value={r.each} /> : '–'}</td>
                  <td className={td}>{r.to_company ? <Money value={r.to_company} /> : '–'}</td>
                </tr>
              ))}
            </Table>
            <span className="text-[13px] text-mut">
              Turnover <Money value={d.royalty.turnover} /> · each rank pool{' '}
              <Money value={d.royalty.pool_each_rank} />
            </span>
            {d.note && <Note>{d.note}</Note>}
          </Panel>
          <Panel title={`Super 3 Level pool · ${monthLabel(d.month)}`}>
            <div className="flex flex-col gap-1.5 text-sm">
              <span>
                Pool <Money value={d.s3_level.pool_total} />
              </span>
              <span>Members who qualify: {formatCount(d.s3_level.members)}</span>
              <span>
                Each gets <Money value={d.s3_level.each} />
              </span>
              {d.s3_level.to_company > 0 && (
                <span className="text-mut">
                  To company <Money value={d.s3_level.to_company} />
                </span>
              )}
            </div>
          </Panel>
          <Panel className="desk:col-span-2">
            {paid ? (
              <Note role="status" tone="info">
                {monthLabel(d.month)} is paid
                {d.runs.royalty?.finished_at ? ` on ${formatWhen(d.runs.royalty.finished_at)}` : ''}
                {d.runs.royalty?.paid_by == null ? ' (by the automatic backup)' : ''}.
              </Note>
            ) : d.can_pay ? (
              <Button onClick={() => setPaying(true)}>Check and pay royalty</Button>
            ) : (
              <Note>
                This month can be paid from {formatFullDate(d.pay_from)}. The preview changes until then.
              </Note>
            )}
          </Panel>
        </div>
      )}
      {paying && d && <PayConfirm p={d} onClose={() => setPaying(false)} />}
      <Panel title="Past payouts">
        {runs.isError ? (
          <ErrorBox error={runs.error} onRetry={() => runs.refetch()} />
        ) : !runs.data ? (
          <SkeletonList rows={3} />
        ) : runs.data.rows.length === 0 ? (
          <Empty title="Nothing paid yet." />
        ) : (
          <Table head={['Month', 'Payout', 'Pool', 'Shared', 'To company', 'Members', 'Paid']} min={680}>
            {runs.data.rows.map((r) => (
              <tr key={r.id}>
                <td className={td}>{monthLabel(r.month.slice(0, 7))}</td>
                <td className={td}>{r.kind === 'royalty' ? 'Royalty' : 'S3 Level'}</td>
                <td className={td}>
                  <Money value={r.pool_total} />
                </td>
                <td className={td}>
                  <Money value={r.shared} />
                </td>
                <td className={td}>
                  <Money value={r.company} />
                </td>
                <td className={cx(td, 'num')}>{formatCount(r.receivers)}</td>
                <td className={td}>
                  {r.status === 'done' ? (
                    <>
                      {r.finished_at ? formatWhen(r.finished_at) : 'Done'}
                      <small className="block text-[12.5px] text-mut">
                        {r.paid_by_name ?? 'automatic backup'}
                      </small>
                    </>
                  ) : (
                    <Chip tone="wait">Running</Chip>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}

export default function AdminIncome() {
  const [section, setSection] = useState<Section>('pnl');
  const months = lastMonths(istDayKey(), 12);
  const [month, setMonth] = useState(months[0]!);
  return (
    <>
      <AdminTitle
        title="Income, profit and TDS"
        sub="Profit and loss, how much went to each income, and this month's pools"
      />
      <Tabs
        label="Section"
        value={section}
        onChange={setSection}
        className="max-w-[640px]"
        items={[
          { value: 'pnl', label: 'Profit and loss' },
          { value: 'payouts', label: 'Monthly payouts' },
          { value: 'tds', label: 'TDS' },
          { value: 'reports', label: 'Reports' },
        ]}
      />
      {section === 'pnl' ? (
        <>
          <SelectField
            label="Month"
            options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            fieldClassName="max-w-[240px]"
          />
          <Pnl month={month} />
          <IncomeEntries month={month} />
        </>
      ) : section === 'payouts' ? (
        <Payouts />
      ) : section === 'tds' ? (
        <TdsReport />
      ) : (
        <>
          <OtherReports />
          <SingleLegRuns />
        </>
      )}
    </>
  );
}
