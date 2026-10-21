import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, adminKeys } from '@/api/admin';
import type { Journey, Super3Status } from '@/api/member';
import { Button, Card, Chip, Empty, ErrorBox, Money, Note, SkeletonList, Tabs } from '@/components/ui';
import { etaDate } from '@/lib/dates';
import { formatCount, formatMoney } from '@/lib/money';
import { cx } from '@/lib/cx';
import { etaText, journeyLabel, myJourneys, ORDINAL } from '@/features/super3/super3Text';
import { Kpi, Kpis, Panel, Table, td } from './AdminParts';
import { SpotBox } from './AdminSuper3';

// AdminMember → Super 3 tab (Vinay 21 Oct): first the member's board tree, then their status ("when will the 3
// come", the 8-board journey, every spot). The status is admin only; members see just their tree.

function JourneyBar({ s, j }: { s: Super3Status; j: Journey }) {
  const total = s.boards.length;
  return (
    <Card className="gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <b className="text-[14.5px]">
          Journey · Board {j.board} of {total}
        </b>
        <span className="text-xs text-mut">
          All {total}: <Money value={s.journey_total} />
        </span>
      </div>
      <ol
        className="m-0 grid list-none gap-1 p-0"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      >
        {s.boards.map((b) => {
          const done = j.finished || b.board < j.board;
          const now = !j.finished && b.board === j.board;
          return (
            <li
              key={b.board}
              aria-label={`Board ${b.board}${done ? ', done' : now ? ', now' : ''}: gets ${formatMoney(b.you_get)}`}
              className={cx(
                'flex h-9 items-center justify-center rounded-lg text-[13px] font-bold',
                done
                  ? 'bg-g text-white'
                  : now
                    ? 'bg-gold text-[#3A2600] ring-2 ring-gold/40'
                    : 'bg-track text-mut',
              )}
            >
              {done ? '✓' : b.board}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function EtaCard({ s, j }: { s: Super3Status; j: Journey }) {
  if (j.finished)
    return (
      <Card className="gap-1.5">
        <b className="text-[15px]">All {s.boards.length} boards done ✓</b>
        <span className="text-[13px] text-mut">This ID finished the whole Super 3 journey.</span>
      </Card>
    );
  const last = j.spots?.[j.spots.length - 1];
  const next = s.boards.find((b) => b.board === j.board + 1);
  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-gt px-4 py-3.5 text-white">
      <div className="flex items-center justify-between gap-2.5">
        <b className="text-[15px]">When will the 3 come?</b>
        <span className="text-xs text-[#A9C7A3]">Admin only</span>
      </div>
      <span className="text-[13px] text-[#A9C7A3]">
        Board {j.board}
        {j.position !== null ? ` · spot in line #${formatCount(j.position)}` : ''}
      </span>
      <div className="flex items-end justify-between gap-2.5">
        <span className="text-[30px] leading-none font-bold">{etaText(j)}</span>
        {j.eta_days !== null && j.eta_days !== undefined && j.eta_days > 0 && (
          <span className="font-bold text-sun">around {etaDate(j.eta_days)}</span>
        )}
      </div>
      {j.spots && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
          {j.spots.map((sp, i) => (
            <li key={sp.spot} className="flex justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-1.5">
              <span>
                {ORDINAL[i]} spot #{formatCount(sp.spot)}
              </span>
              <b>{sp.to_go > 0 ? `${formatCount(sp.to_go)} to go` : 'Filled ✓'}</b>
            </li>
          ))}
        </ul>
      )}
      {j.line_at !== null && j.line_at !== undefined && last && (
        <span className="text-xs text-[#C9DCC5]">
          Line now at #{formatCount(j.line_at)} · 3rd spot at #{formatCount(last.spot)}
        </span>
      )}
      <span className="text-xs text-[#C9DCC5]">
        {j.speed_per_day
          ? `Speed: about ${formatCount(Math.round(j.speed_per_day))} new joins a day (last 7 days)`
          : 'No new joins on this board in the last 7 days.'}
      </span>
      {j.you_get_when_full !== null && j.you_get_when_full !== undefined && (
        <span className="text-[13px]">
          When Board {j.board} is full the member gets <b>{formatMoney(j.you_get_when_full)}</b>
          {next ? ` and moves to Board ${next.board}` : ' and the journey is complete'}
        </span>
      )}
    </div>
  );
}

/** The member's tree: one spot with the spot above and the 3 below, on any board this ID reached. */
function BoardTree({ j }: { j: Journey }) {
  const [board, setBoard] = useState(j.board);
  const own = j.positions.find((p) => p.board === board) ?? j.positions[j.positions.length - 1];
  const [position, setPosition] = useState<number | null>(null);
  const at = position ?? own?.position;
  const b = own?.board ?? board;
  const tree = useQuery({
    queryKey: adminKeys.super3Tree(b, at ?? 0),
    queryFn: ({ signal }) => adminApi.super3Tree(b, at!, signal),
    enabled: !!at,
  });
  if (!own) return <Empty title="Not on any board yet." />;
  const t = tree.data;
  return (
    <div className="flex flex-col gap-2.5">
      {j.positions.length > 1 && (
        <Tabs
          label="Board"
          value={String(b)}
          onChange={(v) => (setBoard(Number(v)), setPosition(null))}
          items={j.positions.map((p) => ({
            value: String(p.board),
            label: `Board ${p.board}${p.board < j.board || j.finished ? ' ✓' : ''}`,
          }))}
        />
      )}
      {tree.isError ? (
        <ErrorBox error={tree.error} onRetry={() => tree.refetch()} />
      ) : !t ? (
        <SkeletonList rows={2} />
      ) : (
        <>
          {t.above && (
            <span className="text-[13px] text-mut">
              Above: #{formatCount(t.above.position)} · {t.above.empty ? 'Empty' : t.above.name}
            </span>
          )}
          <div className="mx-auto w-full desk:w-1/3">
            <SpotBox s={t.root} me={t.root.position === own.position} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {t.children.map((c) =>
              c.empty ? (
                <SpotBox key={c.position} s={c} />
              ) : (
                <button
                  key={c.position}
                  type="button"
                  className="min-w-0 cursor-pointer border-0 bg-transparent p-0 text-left"
                  aria-label={`Open the tree of spot #${formatCount(c.position)}`}
                  onClick={() => setPosition(c.position)}
                >
                  <SpotBox s={c} />
                </button>
              ),
            )}
          </div>
          {t.root.position !== own.position && (
            <Button size="sm" variant="ghost" className="self-start" onClick={() => setPosition(null)}>
              Back to the member's spot
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export function Super3Tab({ code }: { code: string }) {
  const s = useQuery({
    queryKey: ['admin', 'member-super3', code],
    queryFn: ({ signal }) => adminApi.memberSuper3(code, signal),
  });
  const [pick, setPick] = useState('');
  if (s.isError) return <ErrorBox error={s.error} onRetry={() => s.refetch()} />;
  if (!s.data) return <SkeletonList rows={4} />;
  const d = s.data;
  const all = myJourneys(d);
  const j = all.find((x) => String(x.journey_id) === pick) ?? all[0];
  return (
    <>
      <Panel title="Board tree">
        {all.length > 1 && j && (
          <Tabs
            label="Which ID"
            value={String(j.journey_id)}
            onChange={setPick}
            items={all.map((x) => ({ value: String(x.journey_id), label: journeyLabel(x, all) }))}
          />
        )}
        {j ? <BoardTree key={j.journey_id} j={j} /> : <Empty title="Not on any board yet." />}
      </Panel>
      <Panel title="Status" right={<Chip tone="muted">Only admins see this</Chip>}>
        {j ? (
          <div className="flex flex-col gap-2.5 desk:max-w-[560px]">
            <EtaCard s={d} j={j} />
            <JourneyBar s={d} j={j} />
            <Note>This is an estimate, not a promise. It changes with the joining speed.</Note>
          </div>
        ) : null}
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
        {d.journeys.length > 0 && (
          <Table head={['ID', 'Board now', 'Spot', 'Below', 'Line', 'Expected', 'Every board']} min={760}>
            {d.journeys.map((x) => (
              <tr key={x.journey_id}>
                <td className={td}>
                  {x.kind === 'main' ? 'Main ID' : x.kind === 'recycle' ? 'Recycle ID' : 'Company'}
                </td>
                <td className={td}>{x.finished ? <Chip tone="ok">All 8 done</Chip> : `Board ${x.board}`}</td>
                <td className={cx(td, 'num')}>{x.position ? `#${formatCount(x.position)}` : '–'}</td>
                <td className={cx(td, 'num')}>{x.children != null ? `${x.children} of 3` : '–'}</td>
                <td className={cx(td, 'num')}>{x.line_at ? `#${formatCount(x.line_at)} now` : '–'}</td>
                <td className={td}>{x.eta_days != null ? `~${x.eta_days} days` : '–'}</td>
                <td className={td}>
                  {x.positions.map((p) => `B${p.board} #${formatCount(p.position)}`).join(' · ') || '–'}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}
