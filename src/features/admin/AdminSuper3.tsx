import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { adminApi, adminKeys, type Super3IdsQuery } from '@/api/admin';
import type { Schema } from '@/api/schema';
import {
  Button,
  Chip,
  Empty,
  ErrorBox,
  Money,
  Note,
  SelectField,
  SkeletonList,
  Tabs,
  TextField,
} from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { usePageClamp } from '@/lib/usePageClamp';
import { useDebounced } from '@/lib/useDebounced';
import { formatCount } from '@/lib/money';
import { cx } from '@/lib/cx';
import { AdminTitle, FilterBar, Kpi, Kpis, Pager, Panel, Table, td } from './AdminParts';
import { speedText } from './adminText';

// I1 "Super 3 control": the 8 board lines, recycle IDs, money on hold, Self Help Fund, look up any spot.
type Spot = Schema<'Spot'>;

export function SpotBox({ s, me }: { s: Omit<Spot, 'children'>; me?: boolean }) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col gap-0.5 rounded-[10px] border p-2.5 text-[13.5px]',
        s.empty ? 'border-dashed border-line text-mut' : me ? 'border-g bg-tint' : 'border-line bg-white',
      )}
    >
      <b className="num">#{formatCount(s.position)}</b>
      {s.empty ? (
        <span>Empty spot</span>
      ) : (
        <>
          <span className="truncate">
            {s.name} {s.user_code !== 'COMPANY' && <small className="text-mut">{s.user_code}</small>}
          </span>
          {s.status === 'full' && (
            <Chip tone="ok" className="self-start">
              Full
            </Chip>
          )}
        </>
      )}
    </div>
  );
}

function Lookup({ boards }: { boards: number }) {
  const [board, setBoard] = useState('1');
  const [spot, setSpot] = useState('');
  const [err, setErr] = useState<string | undefined>();
  const [asked, setAsked] = useState<{ board: number; position: number } | null>(null);
  const tree = useQuery({
    queryKey: adminKeys.super3Tree(asked?.board ?? 0, asked?.position ?? 0),
    queryFn: ({ signal }) => adminApi.super3Tree(asked!.board, asked!.position, signal),
    enabled: !!asked,
  });

  const find = () => {
    const n = Number(spot.trim());
    if (!/^\d+$/.test(spot.trim()) || n < 1) {
      setErr('Enter a spot number (1 or more).');
      return;
    }
    setErr(undefined);
    setAsked({ board: Number(board), position: n });
  };

  return (
    <Panel title="Look up a spot">
      <div className="grid grid-cols-1 items-end gap-2.5 desk:grid-cols-[160px_200px_auto]">
        <SelectField
          label="Board"
          options={Array.from({ length: boards }, (_, i) => ({
            value: String(i + 1),
            label: `Board ${i + 1}`,
          }))}
          value={board}
          onChange={(e) => setBoard(e.target.value)}
        />
        <TextField
          label="Spot number"
          inputMode="numeric"
          value={spot}
          onChange={(e) => setSpot(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && find()}
          error={err}
        />
        <Button size="sm" onClick={find}>
          Find
        </Button>
      </div>
      {!asked ? null : tree.isError ? (
        <ErrorBox error={tree.error} onRetry={() => tree.refetch()} />
      ) : !tree.data ? (
        <SkeletonList rows={2} />
      ) : tree.data.root.empty ? (
        <span className="text-[13px] text-mut">
          Spot #{formatCount(asked.position)} on Board {asked.board} is not filled yet.
        </span>
      ) : (
        <div className="flex flex-col gap-2.5">
          {tree.data.above && (
            <span className="text-[13px] text-mut">
              Above: #{formatCount(tree.data.above.position)} ·{' '}
              {tree.data.above.empty ? 'Empty' : tree.data.above.name}
            </span>
          )}
          <SpotBox s={tree.data.root} me />
          <div className="grid grid-cols-3 gap-2">
            {tree.data.children.map((c) => (
              <SpotBox key={c.position} s={c} />
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

const KIND_TEXT = { main: 'Main ID', recycle: 'Recycle ID', company: 'Company' } as const;
type StatusTab = 'all' | 'filling' | 'full' | 'finished';

/** Every ID on the boards (Vinay 26 Oct): who is in the pool, which board ("level") and spot, how far along.
 * The server pages it (20 a page) and filters it; nothing here loads the whole pool. */
function PoolPanel({ boards }: { boards: number }) {
  const [search, setSearch] = useState('');
  const [board, setBoard] = useState('');
  const [status, setStatus] = useState<StatusTab>('all');
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim(), 400);
  const query: Super3IdsQuery = {
    search: q || undefined,
    board: board ? Number(board) : undefined,
    status: status === 'all' ? undefined : status,
    kind: (kind || undefined) as Super3IdsQuery['kind'],
    page,
  };
  const list = useQuery({
    queryKey: adminKeys.super3Ids(query),
    queryFn: ({ signal }) => adminApi.super3Ids(query, signal),
    placeholderData: (p) => p,
  });
  usePageClamp(page, list.data?.total, 20, setPage);
  const reset = () => setPage(1);

  return (
    <Panel
      title="IDs in Super 3"
      right={
        list.data ? (
          <span className="text-xs text-mut">
            {formatCount(list.data.total)} ID{list.data.total === 1 ? '' : 's'}
          </span>
        ) : null
      }
    >
      <FilterBar>
        <TextField
          fieldClassName="w-full desk:w-[240px]"
          label="Name, ID or mobile"
          type="search"
          value={search}
          onChange={(e) => (setSearch(e.target.value), reset())}
        />
        <SelectField
          fieldClassName="w-full desk:w-[150px]"
          label="Board"
          placeholder="All boards"
          options={Array.from({ length: boards }, (_, i) => ({
            value: String(i + 1),
            label: `Board ${i + 1}`,
          }))}
          value={board}
          onChange={(e) => (setBoard(e.target.value), reset())}
        />
        <SelectField
          fieldClassName="w-full desk:w-[160px]"
          label="Type"
          placeholder="All types"
          options={Object.entries(KIND_TEXT).map(([value, label]) => ({ value, label }))}
          value={kind}
          onChange={(e) => (setKind(e.target.value), reset())}
        />
        <Tabs
          label="Spot status"
          value={status}
          onChange={(v) => (setStatus(v), reset())}
          className="w-full desk:ml-auto desk:w-[380px]"
          items={[
            { value: 'all', label: 'All' },
            { value: 'filling', label: 'Filling' },
            { value: 'full', label: 'Full' },
            { value: 'finished', label: `All ${boards} done` },
          ]}
        />
      </FilterBar>
      {list.isError ? (
        <ErrorBox error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <SkeletonList rows={5} />
      ) : list.data.rows.length === 0 ? (
        <Empty title="No ID found." />
      ) : (
        <>
          <Table
            head={['Member', 'Type', 'Joined', 'In Super 3 since', 'Board (level)', 'Progress', 'Status']}
            min={880}
          >
            {list.data.rows.map((r) => (
              <tr key={r.journey_id} className={cx(r.kind === 'company' && 'bg-goldbg/40')}>
                <td className={td}>
                  {r.kind === 'company' ? (
                    <b>{r.full_name}</b>
                  ) : (
                    <Link to={`/admin/members/${r.user_code}`} className="font-bold">
                      {r.full_name}
                    </Link>
                  )}
                  <small className="block text-[12.5px] text-mut">{r.user_code}</small>
                </td>
                <td className={td}>{KIND_TEXT[r.kind]}</td>
                <td className={td}>{r.member_joined ? formatDay(r.member_joined) : '–'}</td>
                <td className={td}>{formatDay(r.started_at)}</td>
                <td className={cx(td, 'whitespace-nowrap')}>
                  Board {r.board}
                  {r.position ? (
                    <small className="block text-[12.5px] text-mut">spot #{formatCount(r.position)}</small>
                  ) : null}
                </td>
                <td className={td}>
                  <span className="block">{r.children ?? 0} of 3 below</span>
                  <small className="text-[12.5px] text-mut">
                    {r.boards_done} of {r.boards_total} boards done
                  </small>
                </td>
                <td className={td}>
                  {r.finished ? (
                    <Chip tone="ok">All {r.boards_total} done</Chip>
                  ) : r.spot_status === 'full' ? (
                    <Chip tone="ok">Full</Chip>
                  ) : (
                    <Chip tone="wait">Filling</Chip>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          <Pager page={page} size={20} total={list.data.total} onPage={setPage} />
        </>
      )}
    </Panel>
  );
}

export default function AdminSuper3() {
  const stats = useQuery({
    queryKey: adminKeys.super3,
    queryFn: ({ signal }) => adminApi.super3Stats(signal),
    refetchInterval: 60_000,
  });
  const d = stats.data;

  return (
    <>
      <AdminTitle
        title="Super 3"
        sub="The 8 board lines, recycle IDs, money on hold and the Self Help Fund"
      />
      {stats.isError ? (
        <ErrorBox error={stats.error} onRetry={() => stats.refetch()} />
      ) : !d ? (
        <SkeletonList rows={4} />
      ) : (
        <>
          <Kpis>
            <Kpi
              label="Total IDs on boards"
              value={formatCount(d.ids_on_boards)}
              small={`${formatCount(d.journeys.recycle)} recycle IDs${d.company_spots ? ` · incl. company ID (${formatCount(d.company_spots)} spots)` : ''}`}
            />
            <Kpi label="Still filling" value={formatCount(d.boards.reduce((a, b) => a + b.filling, 0))} />
            <Kpi label="Boards full" value={formatCount(d.boards.reduce((a, b) => a + b.full, 0))} />
            <Kpi label="Paid out (wallet part)" value={<Money value={d.money.wallet_part_paid} />} />
            <Kpi
              label="Self Help Fund"
              value={<Money value={d.money.self_help} />}
              small="₹100 from each 3rd+ direct"
            />
            <Kpi
              label="On hold (1st direct's ₹300)"
              value={<Money value={d.money.on_hold} />}
              small={`${formatCount(d.waiting_second_share)} members waiting for a 2nd direct`}
            />
          </Kpis>
          <Panel title="Each board at a glance">
            <Table
              head={['Board', 'IDs in line', 'Filling', 'Full', 'Next spot', 'Speed (7 days)']}
              min={620}
            >
              {d.boards.map((b) => (
                <tr key={b.board}>
                  <td className={td}>
                    <b>Board {b.board}</b>
                  </td>
                  <td className={cx(td, 'num')}>{b.last_spot ? formatCount(b.last_spot) : '–'}</td>
                  <td className={cx(td, 'num')}>{b.last_spot ? formatCount(b.filling) : '–'}</td>
                  <td className={cx(td, 'num')}>{b.last_spot ? formatCount(b.full) : '–'}</td>
                  <td className={cx(td, 'num')}>#{formatCount(b.next_spot)}</td>
                  <td className={td}>{speedText(b.speed_7d)}</td>
                </tr>
              ))}
            </Table>
            <Note>
              Spot #1 on every board belongs to the company ID. Its board income goes to the company.
            </Note>
          </Panel>
          <PoolPanel boards={Math.max(8, d.boards.length)} />
          <Lookup boards={Math.max(8, d.boards.length)} />
        </>
      )}
    </>
  );
}
