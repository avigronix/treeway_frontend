import { Link } from 'react-router';
import { useMe } from '@/auth/session';
import { IconLink } from '@/components/layout/TopBar';
import { ButtonLink, Card, ErrorBox, Hero, Money, Skeleton } from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { useDashboard, useHistory, useSuper3Status, useTeamSummary, useWalletSummary } from './data';
import { EtaCard, InviteBox, VideosCard, WalletAmount } from './HomeParts';
import { BannerStrip } from '@/features/content/BannerStrip';
import { describeRow, INCOME_LABEL } from './ledger';
import { MemberPage } from './MemberPage';

const icon = (d: string) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#1E5E2A"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);
const QUICK = [
  {
    to: '/team',
    label: 'My team',
    d: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6',
  },
  { to: '/level-income', label: 'Levels', d: 'M4 20v-6M10 20V10M16 20V4M22 20H2' },
  { to: '/shop', label: 'Shop', d: 'M6 7h12l-1 13H7L6 7zM9 7a3 3 0 0 1 6 0' },
  {
    to: '/ask-doctor',
    label: 'Doctor',
    d: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z',
  },
];

function LatestIncome() {
  const h = useHistory({ group: 'income' });
  const rows = h.data?.pages[0]?.rows.slice(0, 5);
  return (
    <div className="flex min-w-0 flex-col gap-3.5 rounded-[14px] border border-line bg-white p-[18px]">
      <div className="flex items-center justify-between gap-2.5">
        <b className="text-[17px]">Latest income</b>
        <Link to="/income" className="text-[13px] font-bold">
          See all
        </Link>
      </div>
      {h.isError ? (
        <ErrorBox error={h.error} onRetry={() => h.refetch()} />
      ) : !rows ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <span className="text-[13px] text-mut">
          No income yet. Share your link: you earn when someone joins.
        </span>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                {['Income', 'From', 'When'].map((t) => (
                  <th
                    key={t}
                    className="border-b border-line bg-[#FAFCF9] px-2.5 py-[9px] text-left text-[12.5px] font-semibold text-mut"
                  >
                    {t}
                  </th>
                ))}
                <th className="border-b border-line bg-[#FAFCF9] px-2.5 py-[9px] text-right text-[12.5px] font-semibold text-mut">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const v = describeRow(r);
                return (
                  <tr key={r.id}>
                    <td className="border-b border-line2 px-2.5 py-[11px]">
                      <b>
                        {r.type === 'level_income'
                          ? v.title.replace(' · Direct', '')
                          : (INCOME_LABEL[r.type] ?? v.title)}
                      </b>
                    </td>
                    <td className="border-b border-line2 px-2.5 py-[11px]">{v.source ?? v.title}</td>
                    <td className="border-b border-line2 px-2.5 py-[11px]">{formatWhen(r.created_at)}</td>
                    <td className="border-b border-line2 px-2.5 py-[11px] text-right">
                      <Money value={r.amount} colored />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const me = useMe().data;
  const w = useWalletSummary();
  const dash = useDashboard().data;
  const team = useTeamSummary().data;
  const s3 = useSuper3Status().data;
  const first = me?.full_name.split(' ')[0];
  const sum = w.data;

  return (
    <MemberPage
      logo
      title={first ? <span className="text-base">Hello, {first}</span> : <Skeleton className="h-5 w-32" />}
      subtitle={
        me ? (
          <span className="font-bold text-ok">
            {me.user_code} · Active{dash?.rank_name ? ` · ${dash.rank_name}` : ''}
          </span>
        ) : undefined
      }
      right={
        <IconLink to="/more" label="Menu">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7" />
            <path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
        </IconLink>
      }
      desktopTitle={first ? `Hello, ${first}` : ''}
      desktopSubtitle={
        me
          ? `${me.user_code}${dash?.rank_name ? ` · ${dash.rank_name}` : ''}${me.sponsor_name ? ` · Sponsor: ${me.sponsor_name}` : ''}`
          : ''
      }
      desktopActions={
        <>
          <ButtonLink to="/add-funds" variant="ghost" size="sm">
            Add funds
          </ButtonLink>
          <ButtonLink to="/withdraw" size="sm">
            Withdraw
          </ButtonLink>
        </>
      }
      className="gap-[11px]"
    >
      {w.isError && <ErrorBox error={w.error} onRetry={() => w.refetch()} />}
      <BannerStrip audience="everyone" />

      {/* ---------------- phone ---------------- */}
      <div className="flex flex-col gap-[11px] desk:hidden">
        <Hero>
          <span className="text-[13.5px] text-[#D6E8D0]">Income Wallet · you can withdraw this</span>
          <span className="text-[34px] leading-[1.1] font-bold">
            <WalletAmount value={sum?.income} />
          </span>
          {sum && (
            <span className="text-[13px] text-[#E4EFE0]">
              Today <Money value={sum.today_income} sign="always" /> · Total earned{' '}
              <Money value={sum.total_earned} />
            </span>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <ButtonLink to="/withdraw" variant="light" size="md">
              Withdraw
            </ButtonLink>
            <ButtonLink to="/add-funds" variant="outline-white" size="md">
              Add funds
            </ButtonLink>
          </div>
        </Hero>
        <EtaCard status={s3} />
        <nav aria-label="Shortcuts" className="grid grid-cols-4 gap-2">
          {QUICK.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-card px-1 py-2.5 text-ink no-underline"
            >
              {icon(q.d)}
              <span className="text-xs font-semibold">{q.label}</span>
            </Link>
          ))}
        </nav>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            to="/shop"
            className="flex flex-col gap-0.5 rounded-2xl border border-line bg-card p-3 text-ink no-underline"
          >
            <span className="text-xs text-mut">Product Wallet</span>
            <b className="text-lg">
              <WalletAmount value={sum?.product} />
            </b>
            <span className="text-xs font-bold text-goldt">For shopping only</span>
          </Link>
          <VideosCard />
        </div>
        <Card className="gap-2">
          <div className="flex items-center justify-between gap-2.5">
            <h2 className="m-0 text-[14.5px] font-bold">Invite and earn</h2>
            {team && (
              <span className="text-xs text-mut">{formatCount(team.directs)} joined with your link</span>
            )}
          </div>
          <InviteBox link={me?.referral_link} mode="share" />
        </Card>
      </div>

      {/* ---------------- computer (HomeDesktop) ---------------- */}
      <div className="hidden flex-col gap-[18px] desk:flex">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
          <div className="flex flex-col gap-1 rounded-[14px] border border-g bg-g p-4 text-white">
            <span className="text-[13.5px] text-[#D6E8D0]">Income Wallet</span>
            <b className="text-[26px] leading-[1.2]">
              <WalletAmount value={sum?.income} />
            </b>
            {sum && (
              <small className="text-[12.5px] text-[#D6E8D0]">
                Today <Money value={sum.today_income} sign="always" />
              </small>
            )}
          </div>
          <Kpi
            label="Product Wallet"
            value={sum && <Money value={sum.product} />}
            small="For shopping only"
          />
          <Kpi
            label="Income this month"
            value={dash && <Money value={dash.income_this_month} />}
            small="After the 10% cut"
          />
          <Kpi
            label="My team"
            value={team && formatCount(team.team)}
            small={
              team ? `${formatCount(team.active_team)} active · ${formatCount(team.directs)} direct` : ''
            }
          />
        </div>
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-[18px]">
          <LatestIncome />
          <div className="flex min-w-0 flex-col gap-[18px]">
            <EtaCard status={s3} big />
            <VideosCard className="rounded-[14px] p-[18px]" />
            <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-white p-[18px]">
              <b>Invite and earn</b>
              <InviteBox link={me?.referral_link} mode="copy" />
            </div>
          </div>
        </div>
      </div>
    </MemberPage>
  );
}

function Kpi({ label, value, small }: { label: string; value: React.ReactNode; small: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[14px] border border-line bg-white p-4">
      <span className="text-[13.5px] text-mut">{label}</span>
      <b className="num text-[26px] leading-[1.2]">{value ?? <Skeleton className="h-8 w-24" />}</b>
      <small className="text-[12.5px] text-mut">{small}</small>
    </div>
  );
}
