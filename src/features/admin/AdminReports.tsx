import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { Chip, ErrorBox, Money, Note, SelectField, SkeletonList, TextField, Empty } from '@/components/ui';
import { formatDay, formatWhen, istDayKey } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { cx } from '@/lib/cx';
import { CsvButton, Pager, Panel, Table, td } from './AdminParts';
import { fyOf, lastFys, monthLabel, monthRange, typeText } from './adminText';

// Reports of AdminIncome: TDS by PAN, income by type, joinings, withdrawals, turnover, Single Leg runs.
// Every number comes from the server; Excel buttons download the same data.

export function IncomeEntries({ month }: { month: string }) {
  const { from, to } = monthRange(month, istDayKey());
  const r = useQuery({
    queryKey: ['admin', 'report-income', from, to],
    queryFn: ({ signal }) => adminApi.incomeReport(from, to, signal),
  });
  return (
    <Panel
      title={`Income by type · ${monthLabel(month)}`}
      right={<CsvButton name="income-entries" query={{ from, to }} label="Excel (every entry)" />}
    >
      {r.isError ? (
        <ErrorBox error={r.error} onRetry={() => r.refetch()} />
      ) : !r.data ? (
        <SkeletonList rows={4} />
      ) : r.data.by_type.length === 0 ? (
        <Empty title="No income this month." />
      ) : (
        <>
          <Table
            head={['Income', 'Entries', 'Members', 'Before cut', 'TDS', 'Service', 'Single Leg', 'Other cut']}
            min={760}
          >
            {r.data.by_type.map((t) => (
              <tr key={t.type}>
                <td className={td}>{typeText(t.type)}</td>
                <td className={cx(td, 'num')}>{formatCount(t.entries)}</td>
                <td className={cx(td, 'num')}>{formatCount(t.members)}</td>
                <td className={td}>
                  <Money value={t.gross} />
                </td>
                <td className={td}>
                  <Money value={t.tds} />
                </td>
                <td className={td}>
                  <Money value={t.service} />
                </td>
                <td className={td}>
                  <Money value={t.single_leg} />
                </td>
                <td className={td}>
                  <Money value={t.other_cut} />
                </td>
              </tr>
            ))}
          </Table>
          {r.data.lapsed_to_company.length > 0 && (
            <span className="text-[13px] text-mut">
              Went to the company (not earned by anyone):{' '}
              {r.data.lapsed_to_company.map((l, i) => (
                <span key={l.type}>
                  {i > 0 && ' · '}
                  {typeText(l.type)} <Money value={l.amount} />
                </span>
              ))}
            </span>
          )}
        </>
      )}
    </Panel>
  );
}

const QUARTERS = [
  { value: '', label: 'Whole year' },
  { value: 'Q1', label: 'Q1 (Apr–Jun)' },
  { value: 'Q2', label: 'Q2 (Jul–Sep)' },
  { value: 'Q3', label: 'Q3 (Oct–Dec)' },
  { value: 'Q4', label: 'Q4 (Jan–Mar)' },
];

export function TdsReport() {
  const today = istDayKey();
  const [fy, setFy] = useState(fyOf(today));
  const [quarter, setQuarter] = useState('');
  const [page, setPage] = useState(1);
  const q = quarter || undefined;
  const r = useQuery({
    queryKey: ['admin', 'tds', fy, quarter, page],
    queryFn: ({ signal }) => adminApi.tdsReport(fy, q, page, signal),
    placeholderData: (p) => p,
  });
  const noPan = useQuery({
    queryKey: ['admin', 'tds-no-pan', fy, quarter],
    queryFn: ({ signal }) => adminApi.tdsNoPan(fy, q, signal),
  });
  const t = r.data?.totals;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 desk:grid-cols-[200px_220px]">
        <SelectField
          label="Financial year"
          options={lastFys(today, 3).map((f) => ({ value: f, label: f }))}
          value={fy}
          onChange={(e) => (setFy(e.target.value), setPage(1))}
        />
        <SelectField
          label="Quarter"
          options={QUARTERS}
          value={quarter}
          onChange={(e) => (setQuarter(e.target.value), setPage(1))}
        />
      </div>
      <Panel title="TDS report (by PAN)" right={<CsvButton name="tds" query={{ fy, quarter: q }} />}>
        {r.isError ? (
          <ErrorBox error={r.error} onRetry={() => r.refetch()} />
        ) : !r.data || !t ? (
          <SkeletonList rows={4} />
        ) : (
          <>
            <span className="text-[13.5px]">
              {formatCount(t.pans)} PANs · income <Money value={t.gross} /> · TDS{' '}
              <b>
                <Money value={t.tds} />
              </b>{' '}
              · paid <Money value={t.net} />
            </span>
            {r.data.rows.length === 0 ? (
              <Empty title="No TDS in this period." />
            ) : (
              <Table head={['PAN', 'Name', 'IDs', 'Income', 'TDS', 'Net']} min={680}>
                {r.data.rows.map((x) => (
                  <tr key={x.pan}>
                    <td className={cx(td, 'num font-semibold')}>{x.pan}</td>
                    <td className={td}>{x.name}</td>
                    <td className={td}>
                      {x.ids}
                      {x.id_count > 1 && (
                        <small className="block text-[12.5px] text-mut">{x.id_count} IDs on one PAN</small>
                      )}
                    </td>
                    <td className={td}>
                      <Money value={x.gross} />
                    </td>
                    <td className={td}>
                      <Money value={x.tds} />
                    </td>
                    <td className={td}>
                      <Money value={x.net} />
                    </td>
                  </tr>
                ))}
              </Table>
            )}
            <Pager page={page} size={20} total={r.data.total} onPage={setPage} />
          </>
        )}
      </Panel>
      <Panel
        title="TDS of members without a PAN"
        right={<CsvButton name="tds-no-pan" query={{ fy, quarter: q }} />}
      >
        {t && t.members_without_pan > 0 && (
          <Note tone="warn">
            {formatCount(t.members_without_pan)} members have no PAN. Their TDS:{' '}
            <Money value={t.tds_without_pan} />. Ask them to add a PAN before the TDS return.
          </Note>
        )}
        {noPan.isError ? (
          <ErrorBox error={noPan.error} onRetry={() => noPan.refetch()} />
        ) : !noPan.data ? (
          <SkeletonList rows={2} />
        ) : noPan.data.rows.length === 0 ? (
          <Empty title="Every member with TDS has a PAN." />
        ) : (
          <Table head={['ID', 'Name', 'Mobile', 'Income', 'TDS']} min={560}>
            {noPan.data.rows.map((x) => (
              <tr key={x.user_code}>
                <td className={td}>{x.user_code}</td>
                <td className={td}>{x.full_name}</td>
                <td className={td}>{x.mobile}</td>
                <td className={td}>
                  <Money value={x.gross} />
                </td>
                <td className={td}>
                  <Money value={x.tds} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}

export function OtherReports() {
  const today = istDayKey();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [fy, setFy] = useState(fyOf(today));
  const bad = !from || !to || from > to ? 'The "from" date must be before the "to" date.' : undefined;
  const join = useQuery({
    queryKey: ['admin', 'report-joinings', from, to],
    queryFn: ({ signal }) => adminApi.joiningsReport(from, to, 'day', signal),
    enabled: !bad,
  });
  const wd = useQuery({
    queryKey: ['admin', 'report-withdrawals', from, to],
    queryFn: ({ signal }) => adminApi.withdrawalsReport(from, to, signal),
    enabled: !bad,
  });
  const turn = useQuery({
    queryKey: ['admin', 'report-turnover', fy],
    queryFn: ({ signal }) => adminApi.turnoverReport(fy, signal),
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 desk:grid-cols-[200px_200px]">
        <TextField
          label="From"
          type="date"
          value={from}
          max={today}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField
          label="To"
          type="date"
          value={to}
          max={today}
          onChange={(e) => setTo(e.target.value)}
          error={bad}
        />
      </div>
      <div className="grid grid-cols-1 gap-[18px] desk:grid-cols-2">
        <Panel title="Joinings">
          {bad ? null : join.isError ? (
            <ErrorBox error={join.error} onRetry={() => join.refetch()} />
          ) : !join.data ? (
            <SkeletonList rows={3} />
          ) : (
            <>
              <span className="text-[13.5px]">
                {formatCount(join.data.totals.registered)} registered ·{' '}
                {formatCount(join.data.totals.activated)} activated · turnover{' '}
                <Money value={join.data.totals.turnover} />
              </span>
              <Table head={['Day', 'Registered', 'Activated', 'Turnover']} min={420}>
                {join.data.rows.map((x) => (
                  <tr key={x.period}>
                    <td className={td}>{formatDay(x.period)}</td>
                    <td className={cx(td, 'num')}>{formatCount(x.registered)}</td>
                    <td className={cx(td, 'num')}>{formatCount(x.activated)}</td>
                    <td className={td}>
                      <Money value={x.turnover} />
                    </td>
                  </tr>
                ))}
              </Table>
            </>
          )}
        </Panel>
        <Panel title="Withdrawals">
          {bad ? null : wd.isError ? (
            <ErrorBox error={wd.error} onRetry={() => wd.refetch()} />
          ) : !wd.data ? (
            <SkeletonList rows={3} />
          ) : (
            <>
              <span className="text-[13.5px]">
                Waiting now: {formatCount(wd.data.pending.n)} · <Money value={wd.data.pending.amount} />
                {wd.data.pending.oldest ? ` · oldest ${formatWhen(wd.data.pending.oldest)}` : ''}
              </span>
              <Table head={['Day', 'Asked', 'Paid', 'Paid ₹', 'Rejected']} min={460}>
                {wd.data.rows.map((x) => (
                  <tr key={x.day}>
                    <td className={td}>{formatDay(x.day)}</td>
                    <td className={cx(td, 'num')}>{formatCount(x.requested)}</td>
                    <td className={cx(td, 'num')}>{formatCount(x.paid)}</td>
                    <td className={td}>
                      <Money value={x.paid_amount} />
                    </td>
                    <td className={cx(td, 'num')}>{formatCount(x.rejected)}</td>
                  </tr>
                ))}
              </Table>
            </>
          )}
        </Panel>
      </div>
      <Panel
        title="Turnover (for GST)"
        right={
          <SelectField
            label="Financial year"
            options={lastFys(today, 3).map((f) => ({ value: f, label: f }))}
            value={fy}
            onChange={(e) => setFy(e.target.value)}
          />
        }
      >
        {turn.isError ? (
          <ErrorBox error={turn.error} onRetry={() => turn.refetch()} />
        ) : !turn.data ? (
          <SkeletonList rows={3} />
        ) : (
          <>
            {turn.data.over_gst_threshold ? (
              <Note tone="warn">
                Turnover is over <Money value={turn.data.gst_threshold} /> this year. Talk to the CA about
                GST.
              </Note>
            ) : (
              <span className="text-[13px] text-mut">
                GST limit <Money value={turn.data.gst_threshold} /> · so far{' '}
                <Money value={turn.data.totals.turnover} />
              </span>
            )}
            <Table head={['Month', 'Joinings', 'Turnover']} min={360}>
              {turn.data.rows.map((x) => (
                <tr key={x.month}>
                  <td className={td}>{monthLabel(x.month.slice(0, 7))}</td>
                  <td className={cx(td, 'num')}>{formatCount(x.joins)}</td>
                  <td className={td}>
                    <Money value={x.turnover} />
                  </td>
                </tr>
              ))}
            </Table>
          </>
        )}
      </Panel>
    </>
  );
}

export function SingleLegRuns() {
  const r = useQuery({
    queryKey: ['admin', 'single-leg-runs'],
    queryFn: ({ signal }) => adminApi.singleLegRuns(signal),
  });
  return (
    <Panel title="Single Leg night runs">
      {r.isError ? (
        <ErrorBox error={r.error} onRetry={() => r.refetch()} />
      ) : !r.data ? (
        <SkeletonList rows={3} />
      ) : r.data.rows.length === 0 ? (
        <Empty title="No run yet." />
      ) : (
        <Table head={['Night', 'Pool', 'Shared', 'To company', 'Members', 'Status']} min={600}>
          {r.data.rows.map((x) => (
            <tr key={x.id}>
              <td className={td}>{formatDay(x.run_date)}</td>
              <td className={td}>
                <Money value={x.pool_total} />
              </td>
              <td className={td}>
                <Money value={x.shared} />
              </td>
              <td className={td}>
                <Money value={x.company} />
              </td>
              <td className={cx(td, 'num')}>{formatCount(x.receivers)}</td>
              <td className={td}>
                {x.status === 'done' ? <Chip tone="ok">Done</Chip> : <Chip tone="wait">Running</Chip>}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Panel>
  );
}
