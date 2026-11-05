import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { IncomePeriod } from '@/api/member';
import { Card, Chip, ErrorBox, Money, Note, Pills, Skeleton, Tabs } from '@/components/ui';
import { useIncomeSummary } from './data';
import { HistoryList } from './HistoryList';
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
// The 8 income types of the plan, in the plan's order (Vinay 4 Nov, "Types of Income"); some link to their page.
// YFI (the daily video ₹20) goes to the Product Wallet, so it is not in the "after cut" total. Repurchase is
// "Coming soon" in the plan (SRS 4.7): shown, never a number.
const REPURCHASE = 'repurchase';
const SUMMARY: { type: string; label: string; to?: string; product?: boolean }[] = [
  { type: 'yfi_daily', label: 'YFI Income', to: '/videos', product: true },
  { type: 'direct_bonus', label: 'Direct Income' },
  { type: 'level_income', label: 'Level Income', to: '/income?tab=levels' },
  { type: 'single_leg', label: 'Single Leg Income' },
  { type: 'royalty', label: 'Royalty Income', to: '/rank' },
  { type: 'super3_income', label: 'Super 3 Income', to: '/super3' },
  { type: 's3_level', label: 'Super 3 Level Income' },
  { type: REPURCHASE, label: 'Repurchase Income' },
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
    ...SUMMARY.map((s) => ({
      value: s.type,
      label: s.label,
      count: s.type === REPURCHASE ? undefined : (all.data?.by_type[s.type]?.count ?? 0),
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
            <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13.5px]">
              {SUMMARY.map((s, n) => {
                const label = (
                  <span className="flex min-w-0 items-center gap-2 text-mut">
                    <span
                      aria-hidden="true"
                      className="num flex size-6 flex-none items-center justify-center rounded-full bg-goldbg text-[11px] font-bold text-goldink"
                    >
                      {String(n + 1).padStart(2, '0')}
                    </span>
                    {s.label}
                    {s.product ? <small className="text-[11.5px]">(Product Wallet)</small> : null}
                    {s.to ? ' ›' : ''}
                  </span>
                );
                const value =
                  s.type === REPURCHASE ? (
                    <Chip tone="muted">Coming soon</Chip>
                  ) : (
                    <b className="num">
                      <Money value={sum.data.by_type[s.type]?.net ?? 0} />
                    </b>
                  );
                return (
                  <li key={s.type}>
                    {s.to ? (
                      <Link
                        to={s.to}
                        className="flex items-center justify-between gap-2.5 text-ink no-underline"
                      >
                        {label}
                        {value}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-2.5">
                        {label}
                        {value}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="flex flex-col gap-1.5 border-t border-line2 pt-2 text-[13.5px]">
              <div className="flex justify-between gap-2.5">
                <span className="text-mut">Tax (TDS 2%)</span>
                <b className="num">
                  <Money value={sum.data.total.tds} />
                </b>
              </div>
              <span className="text-xs text-mut">
                The total is your Income Wallet income. YFI (daily videos) goes to your Product Wallet.
              </span>
            </div>
          </>
        )}
      </Card>
      <Pills label="Income type" value={type} onChange={setType} items={pills} />
      {type === REPURCHASE ? (
        <Note>Repurchase income is coming soon.</Note>
      ) : (
        <HistoryList
          key={type}
          filter={type === 'all' ? { group: 'income' } : { type }}
          emptyTitle="No income yet"
          emptyText={
            type === 'yfi_daily'
              ? 'Watch the daily videos: you get the reward in your Product Wallet.'
              : 'You earn when someone joins with your link.'
          }
        />
      )}
    </>
  );
}
