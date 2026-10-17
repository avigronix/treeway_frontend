import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminPaymentRequest } from '@/api/admin';
import { useMe } from '@/auth/session';
import { Button, Chip, ErrorBox, KeyValue, Money, Note, Sheet, Skeleton, Tabs, Empty } from '@/components/ui';
import { formatDay, formatFullDate, formatTime, formatWhen, istDayKey } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { cx } from '@/lib/cx';
import { useAdminDashboard, usePayments } from './adminData';
import { AdminTitle, Kpi, Kpis, Panel, Table, td } from './AdminParts';
import { PaymentDetail } from './AdminFunds';
import { monthLabel, pnlLines, searchTarget } from './adminText';

// G1 Admin dashboard (L1 on a phone): search, what is waiting, members, joins, turnover, joins chart, this month's
// profit and loss, latest activation payments; on a phone "Check payments" with Receipt / Approve / Reject.
// Every number is from the server (/admin/dashboard, /admin/pnl, /admin/payment-requests); nothing is added up here.

/** "Member ID, UTR or complaint no." -> the member, the complaint, or the payments list searched for it. */
function DashSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      className="w-full tab:hidden" // tablet / laptop: the search in the top bar
      onSubmit={(e) => {
        e.preventDefault();
        const to = searchTarget(q);
        if (to) navigate(to);
      }}
    >
      <label htmlFor="admin-dash-search" className="sr-only">
        Search member, UTR or complaint
      </label>
      <input
        id="admin-dash-search"
        type="search"
        enterKeyHint="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Member ID, UTR or complaint no."
        className="h-11 w-full min-w-0 rounded-xl border-[1.5px] border-field bg-white px-3.5 text-[15px] desk:w-[300px]"
      />
    </form>
  );
}

function PnlBlock() {
  const month = istDayKey().slice(0, 7);
  const p = useQuery({
    queryKey: ['admin', 'pnl', month],
    queryFn: ({ signal }) => adminApi.pnl(month, signal),
  });
  const d = p.data;
  const lines = d ? pnlLines(d) : null;
  return (
    <Panel
      title={<h2 className="m-0 text-[17px] font-bold">Profit and loss · {monthLabel(month)}</h2>}
      right={d ? d.profit >= 0 ? <Chip tone="ok">Profit</Chip> : <Chip tone="bad">Loss</Chip> : null}
    >
      {p.isError ? (
        <ErrorBox error={p.error} onRetry={() => p.refetch()} />
      ) : !d || !lines ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-mut uppercase">Money in</span>
          {lines.moneyIn.map(([k, v]) => (
            <KeyValue key={k} k={k}>
              <Money value={v} />
            </KeyValue>
          ))}
          <span className="mt-1 text-xs font-bold text-mut uppercase">Money out</span>
          {lines.moneyOut.map(([k, v]) => (
            <KeyValue key={k} k={k}>
              <Money value={v} />
            </KeyValue>
          ))}
          <div className="my-1 border-t border-line" />
          <KeyValue k={<b className="text-ink">Profit this month</b>} className="text-base">
            <b className={d.profit >= 0 ? 'text-ok' : 'text-b'}>
              <Money value={d.profit} />
            </b>
          </KeyValue>
          <span className="text-xs text-mut">
            Not company money, shown apart:{' '}
            {lines.keptAside.map(([k, v], i) => (
              <span key={k}>
                {i > 0 ? ' · ' : ''}
                {k} <Money value={v} />
              </span>
            ))}
          </span>
          <Link to="/admin/income" className="text-[13px] font-bold">
            See full report ›
          </Link>
        </div>
      )}
    </Panel>
  );
}

const FOR: Record<AdminPaymentRequest['purpose'], string> = {
  activation: 'Activation',
  fund: 'Add funds',
  pins: 'Buy PINs',
};

/** L1 on a phone: the waiting payments with Receipt / Approve / Reject. Each opens the same checked sheet as
 * Payments (receipt, UTR, "match it with the bank statement", approve or reject with a reason). */
function PhoneCheckPayments() {
  const list = usePayments({ status: 'pending', limit: 5 });
  const [open, setOpen] = useState<AdminPaymentRequest | null>(null);
  const [done, setDone] = useState<string | null>(null);
  return (
    <section className="flex flex-col gap-2.5 desk:hidden" aria-labelledby="check-payments">
      <div className="flex items-center justify-between">
        <h2 id="check-payments" className="m-0 text-[17px] font-bold">
          Check payments
        </h2>
        <Link to="/admin/funds" className="text-[13px] font-bold">
          All ›
        </Link>
      </div>
      {done && (
        <Note role="status" tone="info">
          {done}
        </Note>
      )}
      {list.isError ? (
        <ErrorBox error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <Skeleton className="h-24 w-full" />
      ) : list.data.rows.length === 0 ? (
        <Empty title="No payment is waiting." />
      ) : (
        list.data.rows.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 flex-col">
                <b className="truncate text-sm">
                  {r.full_name} · {r.user_code}
                </b>
                <span className="text-xs text-mut">
                  {FOR[r.purpose]} · UTR …{r.utr.slice(-4)} · {formatTime(r.created_at)}
                </span>
              </span>
              <b className="num">
                <Money value={r.amount} />
              </b>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['Receipt', 'Approve', 'Reject'] as const).map((label) => (
                <Button
                  key={label}
                  size="sm"
                  variant={label === 'Receipt' ? 'ghost' : label === 'Reject' ? 'danger' : 'primary'}
                  aria-label={`${label} · ${r.full_name}`}
                  onClick={() => (setDone(null), setOpen(r))}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        ))
      )}
      <Sheet open={!!open} onClose={() => setOpen(null)} title="Check the payment">
        {open && (
          <PaymentDetail
            r={open}
            onDone={(msg) => {
              setDone(msg);
              setOpen(null);
            }}
          />
        )}
      </Sheet>
    </section>
  );
}

function JoinsChart({ days }: { days: { day: string; activated: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.activated));
  return (
    <div
      className="flex h-[170px] items-end gap-1.5 border-b border-line pt-2"
      role="img"
      aria-label={`Activations per day: ${days.map((d) => `${formatDay(d.day)} ${d.activated}`).join(', ')}`}
    >
      {days.map((d, i) => (
        <div
          key={d.day}
          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 text-[11.5px] text-mut"
        >
          <span className="num">{d.activated}</span>
          <i
            className={cx('block w-full rounded-t-md', i === days.length - 1 ? 'bg-gold' : 'bg-leaf')}
            style={{ height: `${(d.activated / max) * 100}%`, minHeight: 2 }}
          />
          {days.length <= 7 && (
            <span className="truncate">{i === days.length - 1 ? 'Today' : formatDay(d.day)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminDash() {
  const me = useMe().data;
  const dash = useAdminDashboard();
  const latest = usePayments({ status: 'pending', purpose: 'activation', limit: 5 });
  const [range, setRange] = useState<'7' | '30'>('7');
  const d = dash.data;
  const q = d?.queue;
  const byPurpose = q?.payment_requests_by_purpose ?? {};
  const total = d ? d.members.active + d.members.inactive + d.members.blocked : 0;

  return (
    <>
      <AdminTitle
        title="Dashboard"
        sub={`${formatFullDate(new Date())}${me ? ` · Admin: ${me.full_name}` : ''}`}
      />
      <DashSearch />
      {dash.isError && <ErrorBox error={dash.error} onRetry={() => dash.refetch()} />}
      {q && q.video_days_missing.length > 0 && (
        <Note tone="warn">
          Daily videos missing:{' '}
          {q.video_days_missing.map((v) => `${formatDay(v.date)} (${v.missing})`).join(', ')}. Add them before
          12 midnight, or members cannot finish the login videos.
        </Note>
      )}

      <Panel title="Waiting for you today">
        {!d ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <Kpis>
            <Kpi
              to="/admin/funds"
              alert={!!q?.payment_requests}
              label="Payments to check"
              value={formatCount(q!.payment_requests)}
              small={`Activations ${byPurpose.activation ?? 0} · Add funds ${(byPurpose.fund ?? 0) + (byPurpose.pins ?? 0)} ›`}
            />
            <Kpi
              to="/admin/withdrawals"
              alert={!!q?.withdrawals}
              label="Withdrawals to pay"
              value={
                <>
                  {formatCount(q!.withdrawals)} · <Money value={q!.withdrawals_amount} />
                </>
              }
              small={
                q!.oldest_withdrawal ? `Oldest from ${formatWhen(q!.oldest_withdrawal)} ›` : 'Nothing waiting'
              }
            />
            <Kpi
              to="/admin/complaints"
              alert={!!q!.complaints_new_messages}
              label="Open complaints"
              value={formatCount(q!.open_complaints)}
              small={
                q!.complaints_new_messages
                  ? `${formatCount(q!.complaints_new_messages)} with new messages ›`
                  : 'No new message'
              }
            />
            <Kpi
              to="/admin/shop"
              label="Orders to pack"
              value={formatCount(q!.orders_to_pack)}
              small={`Doctor requests ${q!.doctor_requests_waiting} ›`}
            />
          </Kpis>
        )}
      </Panel>

      <PhoneCheckPayments />

      {d && (
        <Kpis>
          <Kpi
            to="/admin/members"
            label="Total members"
            value={formatCount(total)}
            small={`${formatCount(d.members.active)} active`}
          />
          <Kpi
            label="Joined today"
            value={formatCount(d.members.joined_today)}
            small={`Yesterday ${formatCount(d.joins.joined_yesterday)}`}
          />
          <Kpi
            label="Turnover this month"
            value={<Money value={d.joins.turnover_this_month} />}
            small={`${formatCount(d.joins.joins_this_month)} joins`}
          />
          <Kpi
            to="/admin/super3"
            label="IDs in Super 3"
            value={formatCount(d.joins.ids_in_super3)}
            small={`${formatCount(d.joins.boards_full)} boards full`}
          />
        </Kpis>
      )}

      <div className="grid grid-cols-1 items-start gap-[18px] desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Panel
            title="New joins"
            right={
              <Tabs
                label="Days"
                value={range}
                onChange={setRange}
                className="w-[180px]"
                items={[
                  { value: '7', label: '7 days' },
                  { value: '30', label: '30 days' },
                ]}
              />
            }
          >
            {d ? (
              <JoinsChart days={d.last_30_days.slice(range === '7' ? -7 : -30)} />
            ) : (
              <Skeleton className="h-[170px] w-full" />
            )}
            {d && <span className="text-xs text-mut">Counts as of {formatWhen(d.totals_as_of)}</span>}
          </Panel>
          <Panel title="Members">
            {d ? (
              <div className="flex flex-col gap-2 text-sm">
                {[
                  ['Active', d.members.active],
                  ['Not active yet', d.members.inactive],
                  ['Blocked', d.members.blocked],
                  ['Activated today', d.members.activated_today],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2.5">
                    <span className="text-mut">{k}</span>
                    <b className="num">{formatCount(v as number)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </Panel>
        </div>
        <PnlBlock />
      </div>

      <Panel
        className="hidden desk:flex"
        title="Latest activation payments"
        right={
          <Link to="/admin/funds" className="text-[13px] font-bold">
            See all ›
          </Link>
        }
      >
        {latest.isError ? (
          <ErrorBox error={latest.error} onRetry={() => latest.refetch()} />
        ) : !latest.data ? (
          <Skeleton className="h-24 w-full" />
        ) : latest.data.rows.length === 0 ? (
          <Empty title="No activation payment is waiting." />
        ) : (
          <Table head={['Member', 'Sponsor', 'UTR', 'Amount', 'When', '']} min={640}>
            {latest.data.rows.map((r) => (
              <tr key={r.id}>
                <td className={td}>
                  <b>{r.full_name}</b>
                  <small className="block text-[12.5px] text-mut">{r.user_code}</small>
                </td>
                <td className={td}>{r.sponsor_name ? `${r.sponsor_name} (${r.sponsor_code})` : '–'}</td>
                <td className={cx(td, 'num')}>{r.utr}</td>
                <td className={td}>
                  <Money value={r.amount} />
                </td>
                <td className={td}>{formatWhen(r.created_at)}</td>
                <td className={td}>
                  <Link to={`/admin/funds?id=${r.id}`} className="font-bold">
                    Check ›
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}
