import { Link } from 'react-router';
import { Card, ErrorBox, Money, Note, Skeleton, SkeletonList } from '@/components/ui';
import { formatCount, formatMoney } from '@/lib/money';
import { useConfig } from '@/features/auth/usePublic';
import { useLevelIncome, useTeamSummary } from './data';
import { MemberPage } from './MemberPage';
import { levelRate } from './levels';

// B3 "Level income": up to 25 levels. People per level from /users/team-summary, money from
// /wallet/level-income: per level `this_month` and `net` (= all-time, the design's EARNED column).
// Rates from /config/public.

const LEVELS = 25;
const HINT: Record<number, string> = { 1: 'People you added', 2: 'Added by your level 1' };

export default function LevelIncome() {
  const li = useLevelIncome();
  const team = useTeamSummary();
  const config = useConfig().data;
  const table = config?.level_income as Record<string, number> | undefined;

  // Levels with people; the empty rest is one line, as in the design.
  const people = new Map((team.data?.levels ?? []).map((l) => [l.level, l]));
  const money = new Map((li.data?.by_level ?? []).map((l) => [l.level, l]));
  const lastFilled = Math.max(0, ...[...people.keys()].filter((k) => (people.get(k)?.total ?? 0) > 0));

  return (
    <MemberPage
      title="Level income"
      subtitle="Up to 25 levels, every time someone joins"
      back="/income"
      className="gap-[11px]"
    >
      {li.isError && <ErrorBox error={li.error} onRetry={() => li.refetch()} />}
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="gap-0.5 p-3">
          <span className="text-xs text-mut">This month</span>
          <span className="text-[22px] font-bold text-g">
            {li.data ? <Money value={li.data.this_month} /> : <Skeleton className="h-7 w-20" />}
          </span>
        </Card>
        <Card className="gap-0.5 p-3">
          <span className="text-xs text-mut">Total so far</span>
          <span className="text-[22px] font-bold">
            {li.data ? <Money value={li.data.total_amount} /> : <Skeleton className="h-7 w-20" />}
          </span>
        </Card>
      </div>

      {team.isError ? (
        <ErrorBox error={team.error} onRetry={() => team.refetch()} />
      ) : !team.data || !li.data ? (
        <SkeletonList rows={5} />
      ) : (
        <Card flat>
          {/* Fixed layout: 4 columns fit a 360 px phone; long words wrap instead of widening the page. */}
          <table className="w-full table-fixed border-collapse break-words">
            <thead>
              <tr className="bg-[#FAFCF9] align-bottom">
                <th className="py-2.5 pl-3 text-left text-[11.5px] font-bold text-mut">LEVEL</th>
                <th className="w-[62px] py-2.5 pl-1 text-left text-[11.5px] font-bold text-mut">PEOPLE</th>
                <th className="w-[66px] py-2.5 pl-1 text-right text-[11.5px] font-bold text-mut">
                  THIS MONTH
                </th>
                <th className="w-[76px] py-2.5 pr-3 pl-1 text-right text-[11.5px] font-bold text-mut">
                  EARNED
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: lastFilled }, (_, i) => i + 1).map((level) => {
                const p = people.get(level);
                const rate = levelRate(table, level);
                return (
                  <tr key={level} className="border-t border-line2">
                    <td className="py-3 pl-3">
                      <Link
                        to={`/team?level=${level}`}
                        className="flex flex-col gap-0.5 text-ink no-underline"
                      >
                        <b className="text-[14px]">
                          Level {level}
                          {rate !== undefined ? ` · ${formatMoney(rate)}` : ''}
                        </b>
                        <span className="text-xs text-mut">{HINT[level] ?? ' '}</span>
                      </Link>
                    </td>
                    <td className="py-3 pl-1 text-[13px]">
                      {formatCount(p?.total ?? 0)}{' '}
                      <span className="block text-[11.5px] font-bold text-ok">
                        ({formatCount(p?.active ?? 0)} active)
                      </span>
                    </td>
                    <td className="num py-3 pl-1 text-right text-[13px]">
                      <Money value={money.get(level)?.this_month ?? 0} />
                    </td>
                    <td className="num py-3 pr-3 pl-1 text-right font-bold">
                      <Money value={money.get(level)?.net ?? 0} />
                    </td>
                  </tr>
                );
              })}
              {lastFilled < LEVELS && (
                <tr className="border-t border-line2">
                  <td className="py-3 pl-3">
                    <b className="text-[14px]">
                      {lastFilled + 1 === LEVELS ? `Level ${LEVELS}` : `Level ${lastFilled + 1} to ${LEVELS}`}
                    </b>
                    <span className="block text-xs text-mut">No one yet</span>
                  </td>
                  <td className="py-3 pl-1 text-[13px] text-mut">0</td>
                  <td className="num py-3 pl-1 text-right text-[13px] text-mut">₹0</td>
                  <td className="num py-3 pr-3 pl-1 text-right font-bold text-mut">₹0</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
      {table && (
        <Note>
          {Object.entries(table)
            .map(([k, v]) => `Level ${k.replace('-', '–')}: ${formatMoney(v)}`)
            .join(' · ')}
          . Tap a level to see its people.
        </Note>
      )}
    </MemberPage>
  );
}
