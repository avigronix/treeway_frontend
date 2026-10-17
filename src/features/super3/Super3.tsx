import { useState } from 'react';
import { Link } from 'react-router';
import type { Journey, Super3Status } from '@/api/member';
import { ButtonLink, Card, Chip, Empty, ErrorBox, Money, Note, SkeletonList, Tabs } from '@/components/ui';
import { etaDate } from '@/lib/dates';
import { formatCount, formatMoney } from '@/lib/money';
import { cx } from '@/lib/cx';
import { useSuper3Status } from '@/features/member/data';
import { MemberPage } from '@/features/member/MemberPage';
import { entryState, etaText, journeyLabel, myJourneys, ORDINAL } from './super3Text';

// C1 "Super 3: when will my 3 come". Every number is the server's (/super3/status); the ETA date is today +
// eta_days, an estimate from the last 7 days' joining speed ("estimate, not a promise", SRS §5).

export function JourneyBar({ s, j }: { s: Super3Status; j: Journey }) {
  const total = s.boards.length;
  return (
    <Card className="gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <b className="text-[14.5px]">
          Your journey · Board {j.board} of {total}
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
              aria-label={`Board ${b.board}${done ? ', done' : now ? ', now' : ''}: you get ${formatMoney(b.you_get)}`}
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
        <b className="text-[15px]">When will my 3 come?</b>
        <span className="text-xs text-[#A9C7A3]">Live</span>
      </div>
      <span className="text-[13px] text-[#A9C7A3]">
        Board {j.board}
        {j.position !== null ? ` · your spot in line #${formatCount(j.position)}` : ''}
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
          Line now at #{formatCount(j.line_at)} · Your 3rd at #{formatCount(last.spot)}
        </span>
      )}
      <span className="text-xs text-[#C9DCC5]">
        {j.speed_per_day
          ? `Speed: about ${formatCount(Math.round(j.speed_per_day))} new joins a day (last 7 days)`
          : 'No new joins on this board in the last 7 days.'}
      </span>
      {j.you_get_when_full !== null && j.you_get_when_full !== undefined && (
        <span className="text-[13px]">
          When Board {j.board} is full you get <b>{formatMoney(j.you_get_when_full)}</b>
          {next ? ` and you move to Board ${next.board}` : ' and the journey is complete'}
        </span>
      )}
    </div>
  );
}

function NotIn({ s }: { s: Super3Status }) {
  const e = entryState(s);
  if (e.kind === 'in') return null;
  return (
    <Card className="gap-2">
      <b className="text-[15px]">You are not in Super 3 yet</b>
      {e.kind === 'none' && (
        <span className="text-sm">
          You have {e.directs} direct{e.directs === 1 ? '' : 's'}. Super 3 starts with your 2nd direct.
        </span>
      )}
      {e.kind === 'hold' && (
        <span className="text-sm">
          Your 1st direct's <Money value={e.onHold} /> is kept for you. Your 2nd direct puts you on Board 1.
        </span>
      )}
      {e.kind === 'lapsed' && (
        <span className="text-sm">
          You have {e.directs} directs, but a direct joined while your ID was blocked, so that share went to
          the company. Super 3 starts when 2 shares are yours ({e.shares} now). Your next direct counts.
        </span>
      )}
      <ButtonLink to="/team" variant="ghost" size="md">
        Invite and grow your team
      </ButtonLink>
    </Card>
  );
}

export default function Super3() {
  const q = useSuper3Status();
  const s = q.data;
  const all = s ? myJourneys(s) : [];
  const [pick, setPick] = useState<string>('');
  const j = all.find((x) => String(x.journey_id) === pick) ?? all[0];

  return (
    <MemberPage
      title="Super 3"
      subtitle={
        s
          ? s.in_super3
            ? `You have ${s.direct_count} directs · you are in${s.recycle_ids ? ` · Recycle IDs: ${s.recycle_ids}` : ''}`
            : `You have ${s.direct_count} direct${s.direct_count === 1 ? '' : 's'}`
          : ' '
      }
    >
      <nav aria-label="Super 3 pages" className="grid grid-cols-2 gap-1 rounded-xl bg-tabs p-1">
        <span className="flex h-10 items-center justify-center rounded-[9px] bg-white text-sm font-semibold text-gt">
          My status
        </span>
        <Link
          to={j ? `/super3/tree?journey=${j.journey_id}` : '/super3/tree'}
          className="flex h-10 items-center justify-center rounded-[9px] text-sm font-semibold text-tabink no-underline"
        >
          Board tree
        </Link>
      </nav>
      {q.isError ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : !s ? (
        <SkeletonList rows={4} />
      ) : !s.in_super3 && all.length === 0 ? (
        <NotIn s={s} />
      ) : !j ? (
        <Empty title="No board yet" />
      ) : (
        <>
          {all.length > 1 && (
            <Tabs
              label="Which ID"
              value={String(j.journey_id)}
              onChange={setPick}
              items={all.map((x) => ({ value: String(x.journey_id), label: journeyLabel(x, all) }))}
            />
          )}
          {all.length > 1 && j.kind === 'recycle' && (
            <Chip tone="gold" className="self-start">
              A recycle ID runs its own journey from Board 1
            </Chip>
          )}
          <EtaCard s={s} j={j} />
          <JourneyBar s={s} j={j} />
        </>
      )}
      <Note>This is an estimate, not a promise. It changes with the joining speed.</Note>
    </MemberPage>
  );
}
