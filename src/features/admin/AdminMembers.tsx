import { useState } from 'react';
import { Link } from 'react-router';
import type { AdminMemberRow } from '@/api/admin';
import { Chip, ErrorBox, Money, SelectField, SkeletonList, Tabs, TextField, Empty } from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { INDIAN_STATES } from '@/lib/states';
import { usePageClamp } from '@/lib/usePageClamp';
import { useDebounced } from '@/lib/useDebounced';
import { cx } from '@/lib/cx';
import { useMembers } from './adminData';
import { COMPANY_ID, super3Cell } from './adminText';
import { AdminTitle, FilterBar, CsvButton, Kpi, Kpis, Pager, Panel, Table, td } from './AdminParts';

// H1 "Members": counts, filters, search, every member with sponsor, place, rank, team and Income Wallet.
type Status = 'all' | 'active' | 'inactive' | 'blocked';
const RANKS = ['Distributor', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond'];
const PAGE = 20;

export function MemberStatusChip({
  m,
}: {
  m: Pick<AdminMemberRow, 'status' | 'days_inactive'> & { is_company?: boolean };
}) {
  // The company's own ID never looks like a normal member (Vinay 21 Oct).
  if (m.is_company)
    return <Chip tone="gold">Company ID · {m.status === 'active' ? 'Active' : m.status}</Chip>;
  if (m.status === 'active') return <Chip tone="ok">Active</Chip>;
  if (m.status === 'blocked') return <Chip tone="bad">Blocked</Chip>;
  if (m.status === 'removed') return <Chip tone="muted">Removed</Chip>;
  return <Chip tone="wait">Not active{m.days_inactive != null ? ` · day ${m.days_inactive}` : ''}</Chip>;
}

export default function AdminMembers() {
  const [status, setStatus] = useState<Status>('all');
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [rank, setRank] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim(), 400);
  const list = useMembers({
    status: status === 'all' ? undefined : status,
    search: q || undefined,
    state: state || undefined,
    rank: rank || undefined,
    page,
  });
  const c = list.data?.counts;
  const total = list.data?.total ?? 0;
  usePageClamp(page, list.data?.total, PAGE, setPage);
  const reset = () => setPage(1);

  return (
    <>
      <AdminTitle
        title="Members"
        sub="Every member's details, team and wallet"
        actions={<CsvButton name="members" query={{ status: status === 'all' ? undefined : status }} />}
      />
      {c && (
        <Kpis>
          <Kpi
            label="Total members"
            value={formatCount(c.total)}
            small={c.company ? `incl. company ID ${COMPANY_ID}` : undefined}
          />
          <Kpi label="Active" value={formatCount(c.active)} />
          <Kpi
            label="Not active yet"
            value={formatCount(c.inactive)}
            small={`Removed after 30 days: ${formatCount(c.removed)}`}
          />
          <Kpi label="Blocked" value={formatCount(c.blocked)} />
        </Kpis>
      )}
      <Panel>
        <FilterBar>
          <TextField
            fieldClassName="w-full desk:w-[240px]"
            label="Name, ID or mobile"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              reset();
            }}
          />
          <SelectField
            fieldClassName="w-full desk:w-[180px]"
            label="State"
            placeholder="All states"
            options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              reset();
            }}
          />
          <SelectField
            fieldClassName="w-full desk:w-[180px]"
            label="Rank"
            placeholder="All ranks"
            options={RANKS.map((r, i) => ({ value: String(i + 1), label: r }))}
            value={rank}
            onChange={(e) => {
              setRank(e.target.value);
              reset();
            }}
          />
          <Tabs
            label="Status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              reset();
            }}
            className="w-full desk:ml-auto desk:w-[360px]"
            items={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Not active' },
              { value: 'blocked', label: 'Blocked' },
            ]}
          />
        </FilterBar>
        {list.isError ? (
          <ErrorBox error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data ? (
          <SkeletonList rows={5} />
        ) : list.data.rows.length === 0 ? (
          <Empty title="No member found." />
        ) : (
          <>
            <Table
              head={[
                'Member',
                'Sponsor',
                'Place',
                'Joined',
                'Rank',
                'Team',
                'Super 3',
                'Income Wallet',
                'Status',
                '',
              ]}
              min={1000}
            >
              {list.data.rows.map((m) => (
                <tr
                  key={m.user_code}
                  className={cx(m.is_company ? 'bg-goldbg/40' : m.status === 'blocked' && 'bg-[#FFF6F5]')}
                >
                  <td className={td}>
                    <b>{m.full_name}</b>
                    {m.is_company ? (
                      <Chip tone="gold" className="ml-1.5">
                        Main ID · Company
                      </Chip>
                    ) : null}
                    <small className="block text-[12.5px] text-mut">
                      {m.user_code} · {m.mobile}
                    </small>
                  </td>
                  <td className={td}>
                    {m.sponsor_code === COMPANY_ID ? `${COMPANY_ID} · Company` : (m.sponsor_code ?? '–')}
                  </td>
                  <td className={td}>{[m.district, m.state].filter(Boolean).join(', ') || '–'}</td>
                  <td className={td}>{formatDay(m.created_at)}</td>
                  <td className={td}>{m.rank_name ?? '–'}</td>
                  <td className={cx(td, 'num')}>{formatCount(m.active_team)}</td>
                  <td className={cx(td, 'whitespace-nowrap')}>{super3Cell(m)}</td>
                  <td className={td}>
                    <Money value={m.income} />
                  </td>
                  <td className={td}>
                    <MemberStatusChip m={m} />
                  </td>
                  <td className={cx(td, 'whitespace-nowrap')}>
                    <Link to={`/admin/members/${m.user_code}`} className="font-bold">
                      View ›
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
            <Pager page={page} size={PAGE} total={total} onPage={setPage} />
          </>
        )}
      </Panel>
    </>
  );
}
