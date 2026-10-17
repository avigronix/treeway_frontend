import { useState } from 'react';
import { Link } from 'react-router';
import type { HistoryFilter } from '@/api/member';
import { ButtonLink, ErrorBox, Hero, Pills } from '@/components/ui';
import { formatCount } from '@/lib/money';
import { useWalletSummary } from './data';
import { HistoryList } from './HistoryList';
import { WalletAmount } from './HomeParts';
import { MemberPage } from './MemberPage';

// B6 "Wallet and history": three wallets, withdrawn total, ready PINs, and the full history with filters.
const FILTERS: { value: string; label: string; filter: HistoryFilter }[] = [
  { value: 'all', label: 'All', filter: {} },
  { value: 'in', label: 'Money in', filter: { direction: 'in' } },
  { value: 'out', label: 'Money out', filter: { direction: 'out' } },
  { value: 'funds', label: 'Funds', filter: { group: 'funds' } },
  { value: 'p2p', label: 'P2P', filter: { group: 'p2p' } },
];

export default function Wallet() {
  const w = useWalletSummary();
  const [f, setF] = useState('all');
  const sum = w.data;
  const filter = FILTERS.find((x) => x.value === f)!.filter;

  return (
    <MemberPage title="Wallet" subtitle="All your money in one place">
      {w.isError && <ErrorBox error={w.error} onRetry={() => w.refetch()} />}
      <Hero>
        <span className="text-[13.5px] text-[#D6E8D0]">Income Wallet · you can withdraw this</span>
        <span className="text-[34px] leading-[1.1] font-bold">
          <WalletAmount value={sum?.income} />
        </span>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <ButtonLink to="/add-funds" variant="light" size="sm" className="w-full px-1 whitespace-nowrap">
            Add funds
          </ButtonLink>
          <ButtonLink to="/withdraw" variant="light" size="sm" className="w-full px-1 whitespace-nowrap">
            Withdraw
          </ButtonLink>
          <ButtonLink to="/p2p" variant="outline-white" size="sm" className="w-full px-1 whitespace-nowrap">
            Send
          </ButtonLink>
        </div>
      </Hero>
      <div className="grid grid-cols-3 gap-2">
        <Link
          to="/pins"
          className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-line bg-card p-3 text-ink no-underline"
        >
          <span className="text-xs text-mut">Fund Wallet</span>
          <b className="num">
            <WalletAmount value={sum?.fund} />
          </b>
          <span className="text-xs text-ok">{sum ? `${formatCount(sum.ready_pins)} PINs ready ›` : ' '}</span>
        </Link>
        <Link
          to="/shop"
          className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-line bg-card p-3 text-ink no-underline"
        >
          <span className="text-xs text-mut">Product Wallet</span>
          <b className="num">
            <WalletAmount value={sum?.product} />
          </b>
          <span className="text-xs text-goldt">Shopping only</span>
        </Link>
        <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-line bg-card p-3">
          <span className="text-xs text-mut">Withdrawn</span>
          <b className="num">
            <WalletAmount value={sum?.total_withdrawn} />
          </b>
          <span className="text-xs text-mut">To your bank</span>
        </div>
      </div>
      <h2 className="m-0 text-[14.5px] font-bold">History</h2>
      <Pills label="Filter history" value={f} onChange={setF} items={FILTERS} />
      <HistoryList filter={filter} emptyTitle="Nothing here yet" />
    </MemberPage>
  );
}
