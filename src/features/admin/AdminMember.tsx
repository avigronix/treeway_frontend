import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { adminApi, type AdminMemberDetail } from '@/api/admin';
import {
  Button,
  Chip,
  ErrorBox,
  KeyValue,
  Money,
  Note,
  SelectField,
  Sheet,
  SkeletonList,
  Tabs,
  TextAreaField,
  TextField,
  Empty,
} from '@/components/ui';
import { formatFullDate, formatWhen } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { cx } from '@/lib/cx';
import { useAdminRefresh, useMember } from './adminData';
import { MemberStatusChip } from './AdminMembers';
import { AdminTitle, Kpi, Kpis, Panel, Table, td } from './AdminParts';
import { EditContactButton, ResetPasswordButton } from './AdminMemberEdit';
import { ComplaintsTab, IncomeTab, ReverseButton, Super3Tab } from './AdminMemberTabs';
import { canReverse, typeText } from './adminText';

// H2 "Member details": overview, wallet history (with hidden admin debits), team, block / unblock.
type Tab = 'overview' | 'income' | 'wallet' | 'team' | 'super3' | 'complaints';

function BlockButton({ d }: { d: AdminMemberDetail }) {
  const refresh = useAdminRefresh();
  const [open, setOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [reasonErr, setReasonErr] = useState<string | null>(null);
  const blocked = d.member.status === 'blocked';
  const action = blocked ? 'unblock' : 'block';

  const [go, busy] = useSingleFlight(async () => {
    setError(null);
    setReasonErr(remark.trim().length < 3 ? 'Write the reason (at least 3 letters).' : null);
    if (remark.trim().length < 3) return;
    try {
      await adminApi.setMemberStatus(d.member.user_code, action, remark.trim());
      await refresh();
      setOpen(false);
      setRemark('');
    } catch (e) {
      await refresh();
      setError(e);
    }
  });

  return (
    <>
      <Button size="sm" variant={blocked ? 'ghost' : 'danger'} onClick={() => setOpen(true)}>
        {blocked ? 'Unblock' : 'Block'}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`${blocked ? 'Unblock' : 'Block'} ${d.member.full_name}`}
        locked={busy}
      >
        <Note tone={blocked ? 'info' : 'warn'}>
          {blocked
            ? 'The member can log in again.'
            : 'The member is logged out everywhere and cannot log in until you unblock the ID.'}
        </Note>
        <TextAreaField
          label="Reason (saved with your name)"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          error={reasonErr}
        />
        {error ? <ErrorBox error={error} /> : null}
        <Button variant={blocked ? 'primary' : 'danger'} busy={busy} onClick={go}>
          {blocked ? 'Unblock the ID' : 'Block the ID'}
        </Button>
      </Sheet>
    </>
  );
}

type WalletName = 'income' | 'fund' | 'product';
const WALLETS: { value: WalletName; label: string }[] = [
  { value: 'income', label: 'Income Wallet' },
  { value: 'fund', label: 'Fund Wallet' },
  { value: 'product', label: 'Product Wallet' },
];
const AMOUNT_RE = /^\d{1,9}(\.\d{1,2})?$/;

/** H2 "Deduct from wallet": hidden from the member (no row, no reason), saved with the admin's name. */
function DeductButton({ d }: { d: AdminMemberDetail }) {
  const refresh = useAdminRefresh();
  const [open, setOpen] = useState(false);
  const [wallet, setWallet] = useState<WalletName>('income');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [errs, setErrs] = useState<{ amount?: string; comment?: string }>({});
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  const balance = d.wallet[wallet];
  const label = WALLETS.find((w) => w.value === wallet)!.label;

  const check = () => {
    const a = amount.trim();
    const e = {
      amount:
        !AMOUNT_RE.test(a) || Number(a) <= 0 ? 'Enter the amount in ₹ (at most 2 decimals).' : undefined,
      comment: comment.trim().length < 3 ? 'Write the reason (at least 3 letters).' : undefined,
    };
    setErrs(e);
    return !e.amount && !e.comment;
  };

  const [go, busy] = useSingleFlight(async () => {
    setError(null);
    try {
      const env = await adminApi.debit({
        user_code: d.member.user_code,
        wallet,
        amount: Number(amount.trim()),
        comment: comment.trim(),
      });
      setOpen(false);
      setConfirm(false);
      setAmount('');
      setComment('');
      setDone(
        env.status === 202
          ? 'Sent for a second admin to approve (2-admin approval is on).'
          : `₹${amount.trim()} taken from the ${label}. The member does not see it.`,
      );
    } catch (e) {
      setConfirm(false);
      setError(e);
    } finally {
      // A lost answer may still have worked: show the server's balance, never send it again by itself.
      await refresh();
    }
  });

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => (setOpen(true), setDone(null))}>
        Deduct from wallet
      </Button>
      {done && (
        <Note role="status" tone="info" className="basis-full">
          {done}
        </Note>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Deduct from wallet" locked={busy}>
        <Chip tone="bad" className="self-start">
          Only admins see this
        </Chip>
        {!confirm ? (
          <>
            <SelectField
              label="Wallet"
              options={WALLETS}
              value={wallet}
              onChange={(e) => setWallet(e.target.value as WalletName)}
            />
            <span className="text-[13px] text-mut">
              Now in the {label}: <Money value={balance} />
            </span>
            <TextField
              label="Amount (₹)"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={errs.amount}
            />
            <TextAreaField
              label="Reason (required)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              error={errs.comment}
            />
            <Note>
              The member will not see this entry or the reason. It is saved with your name and the time.
            </Note>
            {error ? <ErrorBox error={error} /> : null}
            <Button variant="danger" onClick={() => check() && setConfirm(true)}>
              Next
            </Button>
          </>
        ) : (
          <>
            <Note tone="warn">
              Take <b>₹{amount.trim()}</b> from {d.member.full_name}'s {label} ({d.member.user_code})? Reason:
              "{comment.trim()}".
            </Note>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>
                Back
              </Button>
              <Button variant="danger" busy={busy} onClick={go}>
                Deduct
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}

function Overview({ d }: { d: AdminMemberDetail }) {
  const m = d.member;
  const s = d.summary;
  return (
    <>
      <Kpis>
        <Kpi
          label="Income Wallet"
          value={<Money value={d.wallet.income} />}
          small={
            <>
              Total earned <Money value={d.wallet.total_earned} />
            </>
          }
        />
        <Kpi
          label="Product Wallet"
          value={<Money value={d.wallet.product} />}
          small={
            d.videos.day_no
              ? `Videos: day ${d.videos.day_no} of ${d.videos.days_total} · ${d.videos.days_done} done`
              : 'Videos not started'
          }
        />
        <Kpi
          label="Withdrawn"
          value={<Money value={d.wallet.total_withdrawn} />}
          small={
            s.pending_withdrawal ? (
              <>
                1 waiting <Money value={s.pending_withdrawal} />
              </>
            ) : (
              'Nothing waiting'
            )
          }
        />
        <Kpi
          label="Team"
          value={formatCount(s.team_25_levels.people)}
          small={`${formatCount(s.team_25_levels.active)} active · ${formatCount(s.team_25_levels.directs)} direct`}
        />
      </Kpis>
      <div className="grid grid-cols-1 gap-[18px] desk:grid-cols-2">
        <Panel title="Details">
          <div className="flex flex-col gap-1.5">
            <KeyValue k="Mobile">{m.mobile}</KeyValue>
            <KeyValue k="Email">{m.email}</KeyValue>
            <KeyValue k="Place">{[m.district, m.state].filter(Boolean).join(', ') || '–'}</KeyValue>
            <KeyValue k="Sponsor">{m.sponsor_name ? `${m.sponsor_name} (${m.sponsor_code})` : '–'}</KeyValue>
            <KeyValue k="People above">{formatCount(s.people_above)} levels</KeyValue>
            <KeyValue k="Activated">{m.activated_at ? formatFullDate(m.activated_at) : 'Not yet'}</KeyValue>
          </div>
        </Panel>
        <Panel title="Bank and PAN">
          <div className="flex flex-col gap-1.5">
            <KeyValue k="Account">
              {m.bank_account ? `${m.bank_holder ?? ''} · ${m.bank_account}` : '–'}
            </KeyValue>
            <KeyValue k="IFSC / Branch">
              {m.bank_ifsc ? `${m.bank_ifsc}${m.bank_branch ? ` · ${m.bank_branch}` : ''}` : '–'}
            </KeyValue>
            <KeyValue k="PAN">{m.pan ?? '–'}</KeyValue>
            {m.bank_updated_at && <KeyValue k="Bank changed">{formatWhen(m.bank_updated_at)}</KeyValue>}
          </div>
        </Panel>
      </div>
      <div className="grid grid-cols-1 gap-[18px] desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Team by level">
          {s.team_by_level.length === 0 ? (
            <Empty title="No team yet." />
          ) : (
            <Table head={['Level', 'People', 'Active', 'Level income']} min={420}>
              {s.team_by_level.map((l) => (
                <tr key={l.level}>
                  <td className={td}>Level {l.level}</td>
                  <td className={cx(td, 'num')}>{formatCount(l.people)}</td>
                  <td className={cx(td, 'num')}>{formatCount(l.active)}</td>
                  <td className={td}>
                    <Money value={l.level_income} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
        <div className="flex flex-col gap-[18px]">
          <Panel title="Rank and Super 3">
            <div className="flex flex-col gap-1.5">
              <KeyValue k="Rank">{s.rank?.rank_name ?? 'No rank yet'}</KeyValue>
              {s.rank && (
                <KeyValue k="Active team (all depth)">{formatCount(s.rank.active_team_full)}</KeyValue>
              )}
              <KeyValue k="Super 3">
                {s.super3.board
                  ? `Board ${s.super3.board} · spot #${formatCount(s.super3.spot ?? 0)}`
                  : 'Not on a board'}
              </KeyValue>
              <KeyValue k="Recycle IDs">{formatCount(s.super3.recycle_ids)}</KeyValue>
            </div>
          </Panel>
          <Panel title="Complaints">
            <span className="text-sm">
              {s.complaints.open} open · {s.complaints.solved} solved
            </span>
          </Panel>
          {s.last_deduction && (
            <Note>
              Last deduction: <Money value={s.last_deduction.amount} /> on{' '}
              {formatWhen(s.last_deduction.created_at)}
              {s.last_deduction.by_name ? ` by ${s.last_deduction.by_name}` : ''}
              {s.last_deduction.comment ? ` · "${s.last_deduction.comment}"` : ''}. Only admins see this.
            </Note>
          )}
        </div>
      </div>
    </>
  );
}

function WalletTab({ code, who }: { code: string; who: string }) {
  const h = useInfiniteQuery({
    queryKey: ['admin', 'member-history', code],
    queryFn: ({ pageParam, signal }) => adminApi.memberHistory(code, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  if (h.isError) return <ErrorBox error={h.error} onRetry={() => h.refetch()} />;
  if (!h.data) return <SkeletonList rows={5} />;
  const rows = h.data.pages.flatMap((p) => p.rows);
  return (
    <Panel
      title="Wallet history"
      right={<span className="text-xs text-mut">Hidden = an admin entry the member does not see</span>}
    >
      {rows.length === 0 ? (
        <Empty title="No entries." />
      ) : (
        <Table head={['When', 'Wallet', 'Type', 'Amount', 'Balance after', '']} min={720}>
          {rows.map((r) => (
            <tr key={r.id} className={cx(!r.visible_to_user && 'bg-[#FFF6F5]')}>
              <td className={td}>{formatWhen(r.created_at)}</td>
              <td className={td}>{r.wallet}</td>
              <td className={td}>
                {typeText(r.type)}
                {typeof r.meta?.comment === 'string' && (
                  <small className="block text-[12.5px] text-mut">{r.meta.comment}</small>
                )}
              </td>
              <td className={td}>
                <Money value={r.amount} colored />
              </td>
              <td className={td}>
                <Money value={r.balance_after} />
              </td>
              <td className={td}>
                <span className="flex flex-wrap items-center gap-1.5">
                  {!r.visible_to_user && <Chip tone="bad">Hidden</Chip>}
                  {r.reversed || canReverse(r) ? <ReverseButton r={r} who={who} /> : null}
                </span>
              </td>
            </tr>
          ))}
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

function TeamTab({ code }: { code: string }) {
  const t = useQuery({
    queryKey: ['admin', 'member-team', code],
    queryFn: ({ signal }) => adminApi.memberTeam(code, {}, signal),
  });
  if (t.isError) return <ErrorBox error={t.error} onRetry={() => t.refetch()} />;
  if (!t.data) return <SkeletonList rows={5} />;
  return (
    <Panel title={`Team (${formatCount(t.data.total)})`}>
      {t.data.rows.length === 0 ? (
        <Empty title="No team yet." />
      ) : (
        <Table head={['Member', 'Level', 'Joined', 'Team', 'Status', '']} min={560}>
          {t.data.rows.map((m) => (
            <tr key={m.user_code}>
              <td className={td}>
                <b>{m.full_name}</b>
                <small className="block text-[12.5px] text-mut">{m.user_code}</small>
              </td>
              <td className={td}>{m.level}</td>
              <td className={td}>{formatFullDate(m.created_at)}</td>
              <td className={cx(td, 'num')}>{formatCount(m.team_size)}</td>
              <td className={td}>
                {m.status === 'active' ? (
                  <Chip tone="ok">Active</Chip>
                ) : m.payment_pending ? (
                  <Chip tone="wait">Payment waiting</Chip>
                ) : (
                  <Chip tone="muted">{m.status}</Chip>
                )}
              </td>
              <td className={td}>
                <Link to={`/admin/members/${m.user_code}`} className="font-bold">
                  View ›
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Panel>
  );
}

export default function AdminMember() {
  const { code = '' } = useParams();
  const d = useMember(code);
  const [tab, setTab] = useState<Tab>('overview');
  const m = d.data?.member;

  return (
    <>
      <span className="text-[13px] text-mut">
        <Link to="/admin/members">Members</Link> › {m?.full_name ?? code}
      </span>
      {d.isError ? (
        <ErrorBox error={d.error} onRetry={() => d.refetch()} />
      ) : !d.data || !m ? (
        <SkeletonList rows={4} />
      ) : (
        <>
          <AdminTitle
            title={m.full_name}
            sub={
              <span className="inline-flex flex-wrap items-center gap-2">
                <MemberStatusChip m={{ status: m.status, days_inactive: null }} />
                {m.user_code}
                {d.data.summary.rank?.rank_name ? ` · ${d.data.summary.rank.rank_name}` : ''} · member since{' '}
                {formatFullDate(m.created_at)}
              </span>
            }
            actions={
              <>
                <DeductButton d={d.data} />
                {d.data.member.role === 'USER' && (
                  <>
                    <EditContactButton d={d.data} />
                    <ResetPasswordButton d={d.data} />
                    <BlockButton d={d.data} />
                  </>
                )}
              </>
            }
          />
          <Tabs
            label="Member sections"
            value={tab}
            onChange={setTab}
            className="max-w-[760px]"
            items={[
              { value: 'overview', label: 'Overview' },
              { value: 'income', label: 'Income' },
              { value: 'wallet', label: 'Wallet' },
              { value: 'team', label: 'Team' },
              { value: 'super3', label: 'Super 3' },
              { value: 'complaints', label: 'Complaints' },
            ]}
          />
          {tab === 'overview' ? (
            <Overview d={d.data} />
          ) : tab === 'income' ? (
            <IncomeTab code={m.user_code} who={`${m.full_name} (${m.user_code})`} />
          ) : tab === 'wallet' ? (
            <WalletTab code={m.user_code} who={`${m.full_name} (${m.user_code})`} />
          ) : tab === 'team' ? (
            <TeamTab code={m.user_code} />
          ) : tab === 'super3' ? (
            <Super3Tab code={m.user_code} />
          ) : (
            <ComplaintsTab code={m.user_code} />
          )}
        </>
      )}
    </>
  );
}
