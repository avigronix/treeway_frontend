import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { endSession, useMe } from '@/auth/session';
import type { Schema } from '@/api/schema';
import { AppShell, type NavGroup } from '@/components/layout/AppShell';
import { Icon } from '@/components/layout/icons';
import { cx } from '@/lib/cx';
import { useIsTablet } from '@/lib/useMediaQuery';
import { useAdminDashboard } from './adminData';
import { searchTarget } from './adminText';

// Admin frame (design AdminSide, AdminMobileDash, AdminMobileDrawer).
// Tablet / laptop (>= 768 px): the app shell (dark green sidebar with groups, collapse, top bar with breadcrumb,
// search and the profile menu). Phone: dark top bar, the same menu in a drawer, bottom tabs.
// All admin code lives in src/features/admin (built to assets/admin, never precached for members).

const svg = (children: ReactNode) => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="flex-none"
  >
    {children}
  </svg>
);
const I = {
  dash: svg(
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>,
  ),
  funds: svg(<path d="M12 3v18M7 8h7a3 3 0 0 1 0 6H8" />),
  wd: svg(<path d="M12 4v12M7 11l5 5 5-5M4 20h16" />),
  pins: svg(
    <>
      <rect x="3" y="7" width="18" height="11" rx="2" />
      <path d="M7 12h.01M11 12h.01M15 12h.01" />
    </>,
  ),
  income: svg(<path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />),
  members: svg(
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
    </>,
  ),
  super3: svg(
    <>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="19" r="2.5" />
      <circle cx="12" cy="19" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      <path d="M12 7.5v9M10.8 7.2l-4.6 9.6M13.2 7.2l4.6 9.6" />
    </>,
  ),
  complaints: svg(<path d="M4 5h16v11H9l-5 4z" />),
  shop: svg(
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>,
  ),
  doctor: svg(<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />),
  content: svg(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9l5 3-5 3z" />
    </>,
  ),
  settings: svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>,
  ),
  logout: svg(<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />),
  audit: svg(<path d="M8 4h11v16H5V7zM8 4v3H5M9 11h6M9 15h6" />),
  menu: svg(<path d="M4 6h16M4 12h16M4 18h16" />),
};

function Count({ n, red }: { n: number | undefined; red?: boolean }) {
  if (!n) return null;
  return (
    <span
      className={cx(
        'ml-auto rounded-full px-2 py-px text-[11.5px] font-bold',
        red ? 'bg-[#F28B82] text-[#4A0E09]' : 'bg-sun text-[#3A2600]',
      )}
    >
      {n}
    </span>
  );
}

function Menu({ onPick }: { onPick?: () => void }) {
  const q = useAdminDashboard().data?.queue;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const link = (to: string, icon: ReactNode, label: string, badge?: ReactNode, end = false) => (
    <NavLink
      to={to}
      end={end}
      onClick={onPick}
      className={({ isActive }) =>
        cx(
          'flex min-h-[42px] items-center gap-2.5 rounded-[10px] px-3 text-[14.5px] no-underline',
          isActive ? 'bg-g font-bold text-white' : 'text-[#D7E6D2] hover:bg-[#1B4523] hover:text-white',
        )
      }
    >
      {icon}
      {label}
      {badge}
    </NavLink>
  );
  const sec = (t: string) => (
    <div className="px-3 pt-3.5 pb-1.5 text-[11px] font-bold tracking-[.09em] text-[#8FB08A] uppercase">
      {t}
    </div>
  );
  return (
    <nav aria-label="Admin menu" className="flex flex-col gap-0.5">
      <div className="mb-2.5 flex justify-center rounded-xl bg-white p-1.5">
        <img
          src="/icons/logo-480.webp"
          alt="Treeway"
          width={150}
          height={72}
          className="h-[72px] w-[150px] object-contain"
        />
      </div>
      {link('/admin', I.dash, 'Dashboard', null, true)}
      {sec('Money')}
      {link('/admin/funds', I.funds, 'Activation and funds', <Count n={q?.payment_requests} />)}
      {link('/admin/withdrawals', I.wd, 'Withdrawals', <Count n={q?.withdrawals} />)}
      {link('/admin/pins', I.pins, 'PINs')}
      {link('/admin/income', I.income, 'Income and TDS')}
      {sec('People')}
      {link('/admin/members', I.members, 'Members')}
      {link('/admin/super3', I.super3, 'Super 3')}
      {sec('Services')}
      {link('/admin/complaints', I.complaints, 'Complaints', <Count n={q?.open_complaints} red />)}
      {link('/admin/shop', I.shop, 'Products and orders', <Count n={q?.orders_to_pack} />)}
      {link('/admin/doctors', I.doctor, 'Doctor requests', <Count n={q?.doctor_requests_waiting} />)}
      {link('/admin/content', I.content, 'Videos and banners')}
      {sec('System')}
      {link('/admin/settings', I.settings, 'Settings')}
      {link('/admin/admins', I.members, 'Admins')}
      {link('/admin/audit', I.audit, 'Audit log')}
      <button
        type="button"
        onClick={() => {
          endSession(qc);
          navigate('/login', { replace: true });
        }}
        className="flex min-h-[42px] cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-3 text-left text-[14.5px] text-[#D7E6D2] hover:bg-[#1B4523] hover:text-white"
      >
        {I.logout}
        Logout
      </button>
    </nav>
  );
}

const TABS = [
  { to: '/admin', label: 'Dashboard', icon: I.dash, end: true },
  { to: '/admin/funds', label: 'Payments', icon: I.funds },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: I.wd },
  { to: '/admin/complaints', label: 'Complaints', icon: I.complaints },
];

/** "Member ID, UTR or complaint no." -> the member, the complaint or the payments list (every admin page). */
function AdminSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      className="relative w-[240px] wide:w-[320px]"
      onSubmit={(e) => {
        e.preventDefault();
        const to = searchTarget(q);
        if (to) {
          navigate(to);
          setQ('');
        }
      }}
    >
      <label htmlFor="admin-search" className="sr-only">
        Admin search: member ID, UTR or complaint no.
      </label>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-mut">
        {Icon.search}
      </span>
      <input
        id="admin-search"
        type="search"
        enterKeyHint="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Member ID, UTR or complaint no."
        className="h-11 w-full rounded-xl border-[1.5px] border-field bg-white pr-3 pl-10 text-[14.5px] focus:border-g"
      />
    </form>
  );
}

type Queue = Schema<'AdminQueue'>;

function groups(q: Queue | undefined): NavGroup[] {
  return [
    { items: [{ to: '/admin', label: 'Dashboard', icon: Icon.dash, end: true }] },
    {
      label: 'Money',
      items: [
        {
          to: '/admin/funds',
          label: 'Activation and funds',
          icon: Icon.funds,
          badge: <Count n={q?.payment_requests} />,
        },
        {
          to: '/admin/withdrawals',
          label: 'Withdrawals',
          icon: Icon.withdraw,
          badge: <Count n={q?.withdrawals} />,
        },
        { to: '/admin/pins', label: 'PINs', icon: Icon.pins },
        { to: '/admin/income', label: 'Income and TDS', icon: Icon.income },
      ],
    },
    {
      label: 'Members',
      items: [
        { to: '/admin/members', label: 'Members', icon: Icon.team },
        { to: '/admin/super3', label: 'Super 3', icon: Icon.super3 },
      ],
    },
    {
      label: 'Shop and services',
      items: [
        {
          to: '/admin/complaints',
          label: 'Complaints',
          icon: Icon.complaints,
          badge: <Count n={q?.open_complaints} red />,
        },
        {
          to: '/admin/shop',
          label: 'Products and orders',
          icon: Icon.shop,
          badge: <Count n={q?.orders_to_pack} />,
        },
        {
          to: '/admin/doctors',
          label: 'Doctor requests',
          icon: Icon.doctor,
          badge: <Count n={q?.doctor_requests_waiting} />,
        },
        { to: '/admin/content', label: 'Videos and banners', icon: Icon.content },
      ],
    },
    {
      label: 'System',
      items: [
        { to: '/admin/settings', label: 'Settings', icon: Icon.settings },
        { to: '/admin/admins', label: 'Admins', icon: Icon.admins },
        { to: '/admin/audit', label: 'Audit log', icon: Icon.audit },
      ],
    },
  ];
}

const SECTIONS: [string, string][] = [
  ['/admin/funds', 'Activation and funds'],
  ['/admin/withdrawals', 'Withdrawals'],
  ['/admin/pins', 'PINs'],
  ['/admin/income', 'Income and TDS'],
  ['/admin/members', 'Members'],
  ['/admin/super3', 'Super 3'],
  ['/admin/complaints', 'Complaints'],
  ['/admin/shop', 'Products and orders'],
  ['/admin/doctors', 'Doctor requests'],
  ['/admin/content', 'Videos and banners'],
  ['/admin/settings', 'Settings'],
  ['/admin/admins', 'Admins'],
  ['/admin/audit', 'Audit log'],
];

/** Admin › Section › item (e.g. Admin › Members › TW2054936). */
function crumbsFor(path: string): { label: string; to?: string }[] {
  const home = { label: 'Admin', to: '/admin' };
  const hit = SECTIONS.find(([p]) => path === p || path.startsWith(`${p}/`));
  if (!hit) return [home, { label: 'Dashboard' }];
  const rest = path.slice(hit[0].length + 1);
  return rest
    ? [
        home,
        { label: hit[1], to: hit[0] },
        { label: hit[0] === '/admin/complaints' ? `Complaint #${rest}` : rest },
      ]
    : [home, { label: hit[1] }];
}

export default function AdminLayout() {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const q = useAdminDashboard().data?.queue;
  const me = useMe().data;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const tablet = useIsTablet();
  // Close the drawer when the page changes (a link was tapped, or Back).
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setDrawer(false);
  }
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  return (
    <AppShell
      label="Admin menu"
      dark
      groups={groups(q)}
      crumbs={crumbsFor(location.pathname)}
      search={<AdminSearch />}
      user={{
        name: me?.full_name ?? '',
        role: me ? `Admin · ${me.user_code}` : 'Admin',
        onLogout: () => {
          endSession(qc);
          navigate('/login', { replace: true });
        },
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        {!tablet && (
          <header className="sticky top-0 z-30 flex min-h-[62px] items-center gap-2 border-b border-gt bg-gt px-3 py-2">
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border border-[#2E5A36] bg-transparent text-white"
            >
              {I.menu}
            </button>
            <b className="text-lg text-white">Treeway Admin</b>
          </header>
        )}

        <main className="flex min-w-0 flex-1 flex-col gap-[18px] px-4 py-4 tab:px-6 tab:pt-6 tab:pb-10 wide:px-8">
          <Outlet />
        </main>

        {!tablet && (
          <nav
            aria-label="Admin tabs"
            className="sticky bottom-0 grid grid-cols-5 border-t border-line bg-white px-1 pt-1.5 pb-[calc(14px+env(safe-area-inset-bottom))]"
          >
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  cx(
                    'flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11.5px] no-underline',
                    isActive ? 'font-bold text-g' : 'text-mut',
                  )
                }
              >
                {t.icon}
                {t.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 border-0 bg-transparent text-[11.5px] text-mut"
            >
              {I.menu}
              Menu
            </button>
          </nav>
        )}
      </div>

      {drawer && !tablet && (
        <div className="fixed inset-0 z-50">
          <div aria-hidden="true" className="absolute inset-0 bg-scrim" onClick={() => setDrawer(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            className="absolute inset-y-0 left-0 w-[264px] overflow-y-auto bg-gt px-3 pt-4 pb-6"
          >
            <Menu onPick={() => setDrawer(false)} />
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawer(false)}
            className="absolute top-3.5 right-4 inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-white text-lg"
          >
            ✕
          </button>
        </div>
      )}
    </AppShell>
  );
}
