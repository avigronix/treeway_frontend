import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, adminKeys } from '@/api/admin';
import type { Schema } from '@/api/schema';
import { Button, Chip, ErrorBox, Money, Note, SelectField, SkeletonList, TextField } from '@/components/ui';
import { formatCount } from '@/lib/money';
import { cx } from '@/lib/cx';
import { AdminTitle, Kpi, Kpis, Panel, Table, td } from './AdminParts';
import { speedText } from './adminText';

// I1 "Super 3 control": the 8 board lines, recycle IDs, money on hold, Self Help Fund, look up any spot.
type Spot = Schema<'Spot'>;

function SpotBox({ s, me }: { s: Omit<Spot, 'children'>; me?: boolean }) {
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
              small={`${formatCount(d.journeys.recycle)} are recycle IDs`}
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
          <Lookup boards={Math.max(8, d.boards.length)} />
        </>
      )}
    </>
  );
}
