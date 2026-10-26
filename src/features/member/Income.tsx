import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { IncomePeriod } from '@/api/member';
import { Card, ErrorBox, Money, Pills, Skeleton, Tabs } from '@/components/ui';
import { useIncomeSummary } from './data';
import { HistoryList } from './HistoryList';
import { INCOME_LABEL } from './ledger';
import { LevelIncomeTab } from './LevelIncome';
import { MemberPage } from './MemberPage';

// B2 "My income": totals per income type for a period, and every income row (after the 10% cut).
// Two tabs (Vinay 26 Oct): "All income" (total + by type, "All time" too) and "Level income" (25 levels);
// the tab is in the address (?tab=levels) so a link opens the right one.
const PERIODS: { value: IncomePeriod; label: string; heading: string }[] = [
  { value: 'today', label: 'Today', heading: "Today's income" },
  { value: 'week', label: 'This week', heading: "This week's income" },
  { value: 'month', label: 'This month', heading: "This month's income" },
  { value: 'all', label: 'All time', heading: 'All income so far' },
];
type IncomeTab = 'all' | 'levels';
// Summary rows in the design's order; some link to their own page.
const SUMMARY: { type: string; to?: string }[] = [
  { type: 'level_income', to: '/income?tab=levels' },
  { type: 'super3_income', to: '/super3' },
  { type: 'single_leg' },
  { type: 'royalty', to: '/rank' },
  { type: 's3_level' },
  { type: 'direct_bonus' },
];

export default function Income() {
  const [params, setParams] = useSearchParams();
  const tab: IncomeTab = params.get('tab') === 'levels' ? 'levels' : 'all';
  return (
    <MemberPage title="My income" subtitle="Every amount is after the 10% cut" className="gap-[11px]">
      <Tabs
        label="Income"
        value={tab}
        onChange={(v) => setParams(v === 'levels' ? { tab: 'levels' } : {}, { replace: true })}
        items={[
          { value: 'all', label: 'All income' },
          { value: 'levels', label: 'Level income' },
        ]}
      />
      {tab === 'levels' ? <LevelIncomeTab /> : <AllIncome />}
    </MemberPage>
  );
}

function AllIncome() {
  const [period, setPeriod] = useState<IncomePeriod>('month');
  const [type, setType] = useState<string>('all');
  const sum = useIncomeSummary(period);
  const all = useIncomeSummary('all'); // counts for the filter pills
  const p = PERIODS.find((x) => x.value === period)!;

  const pills = [
    { value: 'all', label: 'All', count: all.data?.total.count },
    ...SUMMARY.filter((s) => s.type !== 'direct_bonus').map((s) => ({
      value: s.type,
      label: INCOME_LABEL[s.type] ?? s.type,
      count: all.data?.by_type[s.type]?.count,
    })),
  ];

  return (
    <>
      <Tabs label="Period" value={period} onChange={setPeriod} items={PERIODS} />
      <Card className="gap-2">
        {sum.isError ? (
          <ErrorBox error={sum.error} onRetry={() => sum.refetch()} />
        ) : !sum.data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2.5">
              <span className="text-[13px] text-mut">{p.heading} (after cut)</span>
              <span className="text-[22px] font-bold text-g">
                <Money value={sum.data.total.net} />
              </span>
            </div>
            <div className="grid grid-cols-1 gap-x-[18px] gap-y-1.5 text-[13.5px] min-[360px]:grid-cols-2">
              {SUMMARY.map((s) => {
                const label = INCOME_LABEL[s.type] ?? s.type;
                const value = <Money value={sum.data.by_type[s.type]?.net ?? 0} />;
                return s.to ? (
                  <Link key={s.type} to={s.to} className="flex justify-between gap-2.5 text-ink no-underline">
                    <span className="text-mut">{label} ›</span>
                    <b className="num">{value}</b>
                  </Link>
                ) : (
                  <div key={s.type} className="flex justify-between gap-2.5">
                    <span className="text-mut">{label}</span>
                    <b className="num">{value}</b>
                  </div>
                );
              })}
              <div className="flex justify-between gap-2.5">
                <span className="text-mut">Tax (TDS 2%)</span>
                <b className="num">
                  <Money value={sum.data.total.tds} />
                </b>
              </div>
            </div>
          </>
        )}
      </Card>
      <Pills label="Income type" value={type} onChange={setType} items={pills} />
      <HistoryList
        filter={type === 'all' ? { group: 'income' } : { type }}
        emptyTitle="No income yet"
        emptyText="You earn when someone joins with your link."
      />
    </>
  );
}
