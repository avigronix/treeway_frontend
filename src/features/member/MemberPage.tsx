import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { endSession, useMe } from '@/auth/session';
import { memberApi } from '@/api/member';
import { AppShell, type NavGroup } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { Icon } from '@/components/layout/icons';
import { TopBar } from '@/components/layout/TopBar';
import { cx } from '@/lib/cx';
import { useIsTablet } from '@/lib/useMediaQuery';

// Frame of every active-member page.
// Phone (< 768 px): the page's top bar + content + bottom menu (design Nav), as before.
// Tablet / laptop: the app shell (sidebar with groups, collapse, top bar with the profile menu), the page heading,
// content up to 1200 px wide in the middle; `narrow` pages (forms) are 560 px.

const GROUPS: NavGroup[] = [
  { items: [{ to: '/', label: 'Home', icon: Icon.home, end: true }] },
  {
    label: 'Earnings',
    items: [
      { to: '/income', label: 'My income', icon: Icon.income },
      { to: '/level-income', label: 'Level income', icon: Icon.levels },
      { to: '/team', label: 'My team', icon: Icon.team },
      { to: '/super3', label: 'Super 3', icon: Icon.super3 },
      { to: '/rank', label: 'Rank and Royalty', icon: Icon.rank },
      { to: '/videos', label: 'Daily videos', icon: Icon.videos },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/wallet', label: 'Wallet', icon: Icon.wallet },
      { to: '/pins', label: 'My PINs', icon: Icon.pins },
    ],
  },
  {
    label: 'Shop and help',
    items: [
      { to: '/shop', label: 'Shop and orders', icon: Icon.shop },
      { to: '/ask-doctor', label: 'Ask a doctor', icon: Icon.doctor },
      { to: '/complaints', label: 'Complaints', icon: Icon.complaints },
    ],
  },
  { label: 'Account', items: [{ to: '/profile', label: 'Profile and bank', icon: Icon.profile }] },
];

export function MemberPage({
  title,
  subtitle,
  back,
  logo,
  right,
  desktopTitle,
  desktopSubtitle,
  desktopActions,
  narrow = false,
  className,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  logo?: boolean;
  right?: ReactNode;
  /** heading on a computer (defaults to `title`) */
  desktopTitle?: ReactNode;
  desktopSubtitle?: ReactNode;
  desktopActions?: ReactNode;
  /** a form page: 560 px wide on a computer */
  narrow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const me = useMe().data;
  // The rank only if the dashboard is already loaded (no extra request on every page).
  const rank = useQuery({ queryKey: ['dashboard'], queryFn: () => memberApi.dashboard(), enabled: false })
    .data?.rank_name;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const heading = desktopTitle ?? title;
  const tablet = useIsTablet();
  const { pathname } = useLocation();
  return (
    <AppShell
      label="Member menu"
      groups={GROUPS}
      crumbs={pathname === '/' ? [{ label: heading }] : [{ label: 'Home', to: '/' }, { label: heading }]}
      user={{
        name: me?.full_name ?? '',
        role: me ? `${me.user_code} · ${rank ?? 'Member'}` : '',
        profileTo: '/profile',
        onLogout: () => {
          endSession(qc);
          navigate('/login', { replace: true });
        },
      }}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-1 flex-col tab:min-h-0 tab:max-w-[1248px]">
        {tablet ? (
          <div
            className={cx(
              'flex flex-wrap items-end justify-between gap-3 px-6 pt-6',
              narrow && 'mx-auto w-full max-w-[608px]',
            )}
          >
            <div>
              <h1 className="m-0 text-[26px] leading-[1.2] font-bold">{heading}</h1>
              {(desktopSubtitle ?? subtitle) && (
                <p className="mt-1 mb-0 text-[14.5px] text-mut">{desktopSubtitle ?? subtitle}</p>
              )}
            </div>
            {desktopActions && <div className="flex flex-wrap gap-2">{desktopActions}</div>}
          </div>
        ) : (
          <TopBar title={title} subtitle={subtitle} back={back} logo={logo} right={right} />
        )}
        <main
          className={cx(
            'flex flex-1 flex-col gap-3 px-4 py-3.5 tab:gap-[18px] tab:px-6 tab:pt-5 tab:pb-10',
            narrow && 'tab:mx-auto tab:w-full tab:max-w-[608px]',
            className,
          )}
        >
          {children}
        </main>
        {!tablet && (
          <div className="sticky bottom-0">
            <BottomNav />
          </div>
        )}
      </div>
    </AppShell>
  );
}
