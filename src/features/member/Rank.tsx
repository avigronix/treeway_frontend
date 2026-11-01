import { useQuery } from '@tanstack/react-query';
import { memberApi } from '@/api/member';
import { Bar, Card, Chip, ErrorBox, Money, Note, SkeletonList } from '@/components/ui';
import { formatDay, formatWhen, ordinal } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { monthName } from './ledger';
import { MemberPage } from './MemberPage';
import { directsLines, rankLabel } from './rankText';

// B5 "Rank and Royalty" from GET /rank/me (directs live; team numbers from the night count, `as_of`).

export default function Rank() {
  const r = useQuery({ queryKey: ['income', 'rank'], queryFn: ({ signal }) => memberApi.rank(signal) });
  const d = r.data;

  return (
    <MemberPage
      title="Rank and Royalty"
      subtitle={d ? `Royalty is paid on the ${ordinal(d.pay_day)} of every month` : ' '}
      back="/more"
    >
      {r.isError ? (
        <ErrorBox error={r.error} onRetry={() => r.refetch()} />
      ) : !d ? (
        <SkeletonList rows={4} />
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-[18px] bg-g p-4 text-white">
            <span className="text-[13.5px] text-[#D6E8D0]">My rank</span>
            <b className="text-[26px]">{rankLabel(d.rank_name)}</b>
            <span className="text-[13px] text-[#E4EFE0]">
              {d.last_royalty ? (
                <>
                  Last royalty <Money value={d.last_royalty.amount} />
                  {d.last_royalty.month ? ` for ${monthName(d.last_royalty.month)}` : ''}
                </>
              ) : (
                'No royalty yet'
              )}
            </span>
          </div>

          {d.next && (
            <Card className="gap-2">
              <div className="flex items-center justify-between gap-2.5">
                <b className="text-[14.5px]">
                  Next rank: {d.next.name} · {formatCount(d.next.need)}
                </b>
                <span className="num text-[13px] font-bold">
                  {formatCount(d.next.counted)} / {formatCount(d.next.need)}
                </span>
              </div>
              <Bar value={d.next.counted} max={d.next.need} label={`Progress to ${d.next.name}`} gold thick />
              {d.rank === 0 && (
                <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]" aria-label="Your directs">
                  {directsLines(d.directs).map((l, i) => (
                    <li key={l} className={i === 0 ? 'font-bold' : 'text-mut'}>
                      {l}
                    </li>
                  ))}
                </ul>
              )}
              {d.next.one_line_max !== null && (
                <span className="text-[13px] text-mut">
                  50:50 rule: we count at most {formatCount(d.next.one_line_max)} from one team line.
                  {d.next.biggest_line
                    ? ` ${d.next.biggest_line.name ?? d.next.biggest_line.user_code}'s line has ${formatCount(d.next.biggest_line.active)} active; ${formatCount(d.next.biggest_line.counted)} are counted.`
                    : ''}
                </span>
              )}
            </Card>
          )}

          <Card flat>
            <ul className="m-0 list-none p-0">
              {d.ranks.map((s) => (
                <li
                  key={s.rank}
                  className="flex min-h-[58px] items-center justify-between gap-2.5 border-b border-line2 px-3.5 py-3 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <b className="text-[14.5px]">{s.name}</b>
                    <span className="text-[12.5px] text-mut">
                      {formatCount(s.need)} {s.counts}
                      {s.counts === 'active team' ? ' (50:50 rule)' : ''}
                    </span>
                  </div>
                  {s.status === 'done' ? (
                    <Chip tone="ok">Done ✓</Chip>
                  ) : s.status === 'next' ? (
                    <Chip tone="gold">Next</Chip>
                  ) : (
                    <Chip tone="muted">Locked</Chip>
                  )}
                </li>
              ))}
              <li className="px-3.5 py-2.5 text-[12.5px] text-mut">
                Ranks go in order: each rank also needs the one before it, so Silver and up need your{' '}
                {formatCount(d.ranks[0]?.need ?? 0)} active directs too.
              </li>
            </ul>
          </Card>

          <Card className="gap-2">
            <div className="flex items-center justify-between gap-2.5">
              <b className="text-[14.5px]">Super 3 Level pool</b>
              <span className="num text-[13px] font-bold">
                {formatCount(d.s3_level.active_directs)} / {formatCount(d.s3_level.directs_needed)} directs
              </span>
            </div>
            <Bar
              value={d.s3_level.active_directs}
              max={d.s3_level.directs_needed}
              label="Active directs for the Super 3 Level pool"
            />
            <span className="text-[13px] text-mut">
              {d.s3_level.reached_on
                ? `Reached on ${formatDay(d.s3_level.reached_on)}.${d.s3_level.first_payout ? ` First share on ${formatDay(d.s3_level.first_payout)}.` : ''} Shares paid: ${d.s3_level.payouts}.`
                : `With ${d.s3_level.directs_needed} active directs you get a share every month for 6 months, from the next ${ordinal(d.pay_day)}.`}
            </span>
          </Card>
          {d.as_of && (
            <Note>
              Directs count the moment they are activated. Team numbers (Silver and up) are counted every
              night; last count {formatWhen(d.as_of)}.
            </Note>
          )}
        </>
      )}
    </MemberPage>
  );
}
