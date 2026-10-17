import { useState } from 'react';
import { useSearchParams } from 'react-router';
import type { TeamMember } from '@/api/member';
import { Button, Card, Chip, Empty, ErrorBox, Pills, SkeletonList, TextField } from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { useDebounced } from '@/lib/useDebounced';
import { useTeamMembers, useTeamSummary, useTopSponsors } from './data';
import { MemberPage } from './MemberPage';

// B4 "My team": counts, people by level, search, 5 per page (as the design's pager).
const PAGE_SIZE = 5;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

function MemberRow({ m }: { m: TeamMember }) {
  const joined = formatDay(m.created_at);
  let chip = <Chip tone="ok">Active</Chip>;
  let detail = `${m.user_code} · joined ${joined} · team ${formatCount(m.team_size)}`;
  if (m.status !== 'active') {
    chip = m.payment_pending ? <Chip tone="wait">Waiting</Chip> : <Chip tone="muted">Not active</Chip>;
    detail = `${m.user_code} · ${joined} · ${m.payment_pending ? 'payment being checked' : 'not active yet'}`;
  }
  return (
    <li className="flex min-h-[58px] items-center justify-between gap-2.5 border-b border-line2 px-3.5 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex size-[42px] flex-none items-center justify-center rounded-full bg-soft text-sm font-bold text-gt"
        >
          {initials(m.full_name)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <b className="truncate text-[14.5px]">{m.full_name}</b>
          {/* Wraps instead of cutting: "team 12" is at the end and is the part members look for. */}
          <span className="text-[12.5px] text-mut">{detail}</span>
        </div>
      </div>
      {chip}
    </li>
  );
}

export default function Team() {
  const [params, setParams] = useSearchParams();
  const level = Number(params.get('level')) || 1;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 400);

  const summary = useTeamSummary();
  const top = useTopSponsors().data;
  const list = useTeamMembers({ level: q ? undefined : level, search: q || undefined, page });
  const s = summary.data;

  const subtitle = s
    ? `${formatCount(s.team)} people · ${formatCount(s.active_team)} active${s.payment_waiting ? ` · ${formatCount(s.payment_waiting)} payment waiting` : ''}`
    : ' ';
  const levels = (s?.levels ?? []).filter((l) => l.total > 0);
  const total = list.data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <MemberPage title="My team" subtitle={subtitle} back="/">
      {summary.isError && <ErrorBox error={summary.error} onRetry={() => summary.refetch()} />}
      {levels.length > 0 && (
        <Pills
          label="Team level"
          value={String(level)}
          onChange={(v) => {
            setParams({ level: v }, { replace: true });
            setPage(1);
            setSearch('');
          }}
          items={levels.map((l) => ({
            value: String(l.level),
            label: l.level <= 4 ? `Level ${l.level}` : `L${l.level}`,
            count: l.total,
          }))}
        />
      )}
      <TextField
        label="Search by name or ID"
        placeholder="Search by name or ID"
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      {list.isError ? (
        <ErrorBox error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <SkeletonList rows={5} />
      ) : list.data.rows.length === 0 ? (
        <Empty
          title={q ? 'No one found' : 'No one here yet'}
          text={q ? 'Check the name or ID.' : 'Share your link. People who join with it show up here.'}
        />
      ) : (
        <>
          <Card flat>
            <ul className="m-0 list-none p-0" aria-busy={list.isFetching || undefined}>
              {list.data.rows.map((m) => (
                <MemberRow key={m.user_code} m={m} />
              ))}
            </ul>
          </Card>
          {total > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 text-[13.5px] text-mut">
              <span>
                {from}–{to} of {formatCount(total)}
              </span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" disabled={to >= total} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      {top && top.length > 0 && (
        <Card className="gap-2">
          <div className="flex flex-col">
            <h2 className="m-0 text-[14.5px] font-bold">Top sponsors</h2>
            <span className="text-xs text-mut">Most joins this month</span>
          </div>
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {top.slice(0, 5).map((t, i) => (
              <li key={t.user_code} className="flex items-center justify-between gap-2.5 text-[13px]">
                <span className="min-w-0 truncate">
                  {i + 1}. <b>{t.full_name}</b> <span className="text-mut">{t.user_code}</span>
                </span>
                <span className="num font-bold">{formatCount(t.joins)} joins</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </MemberPage>
  );
}
