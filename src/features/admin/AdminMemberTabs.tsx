import { useState } from 'react';
import { Link } from 'react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { adminApi, type AdminLedgerRow } from '@/api/admin';
import { complaintsApi } from '@/api/complaints';
import {
  Button,
  Chip,
  ErrorBox,
  KeyValue,
  Money,
  Note,
  Sheet,
  SkeletonList,
  TextAreaField,
  Empty,
} from '@/components/ui';
import { formatDay, formatWhen } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { cx } from '@/lib/cx';
import { label, tone } from '@/features/complaints/complaintText';
import { useAdminRefresh } from './adminData';
import { Kpi, Kpis, Panel, Table, td } from './AdminParts';
import { canReverse, typeText } from './adminText';

// AdminMember tabs: Income, Super 3, Complaints, and the Reverse entry button on a ledger row.

/** Reverse entry: an opposite row is added; nothing is deleted. The server says if the wallet is too low. */
export function ReverseButton({ r, who }: { r: AdminLedgerRow; who: string }) {
  const refresh = useAdminRefresh();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState<string | undefined>();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  const income = r.type === 'level_income' || r.type === 'direct_bonus';

  const [go, busy] = useSingleFlight(async () => {
    setError(null);
    try {
      const env = await adminApi.reverse(r.id, reason.trim());
      setDone(
        env.status === 202
          ? 'Sent for a second admin to approve (2-admin approval is on).'
          : 'Reverse entry done. The opposite entry is in the history.',
      );
      setConfirm(false);
    } catch (e) {
      setConfirm(false);
      setError(e);
    } finally {
      // A lost answer may still have worked: the history shows the server's state, never send it again by itself.
      await refresh();
    }
  });

  const close = () => {
    setOpen(false);
    setConfirm(false);
    setError(null);
    setDone(null);
  };

  return (
    <>
      {/* Stays mounted after the row turns "Reversed", so the sheet can still show "done". */}
      {r.reversed ? (
        <Chip tone="muted">Reversed</Chip>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          Reverse
        </Button>
      )}
      <Sheet open={open} onClose={close} title="Reverse entry" locked={busy}>
        {done ? (
          <>
            <Note role="status" tone="info">
              {done}
            </Note>
            <Button onClick={close}>Done</Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <KeyValue k="Member">{who}</KeyValue>
              <KeyValue k="Entry">
                {typeText(r.type)} · {formatWhen(r.created_at)}
              </KeyValue>
              <KeyValue k="Amount">
                <Money value={r.amount} colored />
              </KeyValue>
            </div>
            <Note>
              An opposite entry of <Money value={-r.amount} /> is added to the {r.wallet} wallet. Nothing is
              deleted.
              {income ? ' Its TDS and service charge are taken back too.' : ''} If the wallet does not have
              enough money, nothing changes.
            </Note>
            {!confirm ? (
              <>
                <TextAreaField
                  label="Reason (required)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  error={reasonErr}
                />
                {error ? <ErrorBox error={error} /> : null}
                <Button
                  variant="danger"
                  onClick={() => {
                    const bad =
                      reason.trim().length < 3 ? 'Write the reason (at least 3 letters).' : undefined;
                    setReasonErr(bad);
                    if (!bad) setConfirm(true);
                  }}
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                <Note tone="warn">Reverse this entry? Reason: "{reason.trim()}".</Note>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>
                    Back
                  </Button>
                  <Button variant="danger" busy={busy} onClick={go}>
                    Reverse
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}

export function IncomeTab({ code, who }: { code: string; who: string }) {
  const h = useInfiniteQuery({
    queryKey: ['admin', 'member-history', code, 'income'],
    queryFn: ({ pageParam, signal }) => adminApi.memberHistory(code, pageParam, signal, 'income'),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  if (h.isError) return <ErrorBox error={h.error} onRetry={() => h.refetch()} />;
  if (!h.data) return <SkeletonList rows={5} />;
  const rows = h.data.pages.flatMap((p) => p.rows);
  return (
    <Panel
      title="Income"
      right={<span className="text-xs text-mut">Gross, cuts and what reached the wallet</span>}
    >
      {rows.length === 0 ? (
        <Empty title="No income yet." />
      ) : (
        <Table
          head={['When', 'Income', 'From', 'Gross', 'TDS', 'Service', 'Single Leg', 'Net', '']}
          min={900}
        >
          {rows.map((r) => {
            const from = typeof r.meta?.from_name === 'string' ? r.meta.from_name : null;
            const level = typeof r.meta?.level === 'number' ? r.meta.level : null;
            return (
              <tr key={r.id}>
                <td className={td}>{formatWhen(r.created_at)}</td>
                <td className={td}>
                  {typeText(r.type)}
                  {level ? ` · L${level}` : ''}
                </td>
                <td className={td}>{from ?? '–'}</td>
                <td className={td}>
                  <Money value={r.gross} />
                </td>
                <td className={td}>
                  <Money value={r.tds} />
                </td>
                <td className={td}>
                  <Money value={r.service} />
                </td>
                <td className={td}>
                  <Money value={r.single_leg} />
                </td>
                <td className={td}>
                  <b>
                    <Money value={r.amount} />
                  </b>
                </td>
                <td className={td}>
                  {r.reversed || canReverse(r) ? <ReverseButton r={r} who={who} /> : null}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      {h.hasNextPage && (
        <Button variant="ghost" size="md" busy={h.isFetchingNextPage} onClick={() => h.fetchNextPage()}>
          Show more
        </Button>
      )}
    </Panel>
  );
}

export function Super3Tab({ code }: { code: string }) {
  const s = useQuery({
    queryKey: ['admin', 'member-super3', code],
    queryFn: ({ signal }) => adminApi.memberSuper3(code, signal),
  });
  if (s.isError) return <ErrorBox error={s.error} onRetry={() => s.refetch()} />;
  if (!s.data) return <SkeletonList rows={4} />;
  const d = s.data;
  return (
    <>
      <Kpis>
        <Kpi label="Directs" value={formatCount(d.direct_count)} />
        <Kpi
          label="Super 3"
          value={d.in_super3 ? 'In' : 'Not yet'}
          small={
            d.s3_shares === 1
              ? '1st direct share on hold'
              : d.in_super3
                ? 'On Board 1 or above'
                : '2 directs needed'
          }
        />
        <Kpi label="On hold" value={<Money value={d.on_hold} />} />
        <Kpi
          label="Recycle IDs"
          value={formatCount(d.recycle_ids)}
          small={
            <>
              Earned on boards <Money value={d.journey_total} />
            </>
          }
        />
      </Kpis>
      <Panel title="Board spots">
        {d.journeys.length === 0 ? (
          <Empty title="Not on any board yet." />
        ) : (
          <Table head={['ID', 'Board now', 'Spot', 'Below', 'Line', 'Expected', 'Every board']} min={760}>
            {d.journeys.map((j) => (
              <tr key={j.journey_id}>
                <td className={td}>
                  {j.kind === 'main' ? 'Main ID' : j.kind === 'recycle' ? 'Recycle ID' : 'Company'}
                </td>
                <td className={td}>{j.finished ? <Chip tone="ok">All 8 done</Chip> : `Board ${j.board}`}</td>
                <td className={cx(td, 'num')}>{j.position ? `#${formatCount(j.position)}` : '–'}</td>
                <td className={cx(td, 'num')}>{j.children != null ? `${j.children} of 3` : '–'}</td>
                <td className={cx(td, 'num')}>{j.line_at ? `#${formatCount(j.line_at)} now` : '–'}</td>
                <td className={td}>{j.eta_days != null ? `~${j.eta_days} days` : '–'}</td>
                <td className={td}>
                  {j.positions.map((p) => `B${p.board} #${formatCount(p.position)}`).join(' · ') || '–'}
                </td>
              </tr>
            ))}
          </Table>
        )}
        <span className="text-xs text-mut">
          To see a board tree, open Super 3 → Look up a spot with the board and spot number.
        </span>
      </Panel>
    </>
  );
}

export function ComplaintsTab({ code }: { code: string }) {
  const l = useQuery({
    queryKey: ['complaints', 'list', 'admin', 'member', code],
    queryFn: ({ signal }) => complaintsApi.list({ search: code }, signal),
  });
  if (l.isError) return <ErrorBox error={l.error} onRetry={() => l.refetch()} />;
  if (!l.data) return <SkeletonList rows={3} />;
  return (
    <Panel title={`Complaints (${formatCount(l.data.total)})`}>
      {l.data.rows.length === 0 ? (
        <Empty title="No complaint sent. (Drafts stay private to the member.)" />
      ) : (
        <Table head={['Complaint', 'Type', 'Filed on', 'Status', '']} min={560}>
          {l.data.rows.map((c) => (
            <tr key={c.id}>
              <td className={td}>
                <b className="num">{c.complaint_no}</b>
                {c.unread > 0 && (
                  <small className="block text-[12.5px] font-bold text-b">
                    {c.unread} new message{c.unread === 1 ? '' : 's'}
                  </small>
                )}
              </td>
              <td className={td}>{c.category}</td>
              <td className={td}>{formatDay(c.created_at)}</td>
              <td className={td}>
                <Chip tone={tone(c.status)}>{label(c.status)}</Chip>
              </td>
              <td className={td}>
                <Link to={`/admin/complaints/${c.id}`} className="font-bold">
                  Open ›
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Panel>
  );
}
