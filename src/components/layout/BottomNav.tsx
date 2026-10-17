import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { cx } from '@/lib/cx';

// Icons and order from docs/design/Nav.html
const icon = (children: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="23"
    height="23"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const ITEMS = [
  {
    to: '/',
    label: 'Home',
    end: true,
    icon: icon(<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />),
  },
  { to: '/income', label: 'Income', icon: icon(<path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />) },
  {
    to: '/super3',
    label: 'Super 3',
    icon: icon(
      <>
        <circle cx="12" cy="5" r="2.5" />
        <circle cx="5" cy="19" r="2.5" />
        <circle cx="12" cy="19" r="2.5" />
        <circle cx="19" cy="19" r="2.5" />
        <path d="M12 7.5v9M10.8 7.2l-4.6 9.6M13.2 7.2l4.6 9.6" />
      </>,
    ),
  },
  {
    to: '/wallet',
    label: 'Wallet',
    icon: icon(
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <path d="M16 14h2" />
      </>,
    ),
  },
  { to: '/more', label: 'More', icon: icon(<path d="M4 6h16M4 12h16M4 18h16" />) },
] as const;

/** Member bottom menu (theme .nav). */
export function BottomNav() {
  return (
    <nav
      aria-label="Main menu"
      className="grid w-full flex-none grid-cols-5 border-t border-line bg-white px-1 pt-1.5 pb-[calc(14px+env(safe-area-inset-bottom))]"
    >
      {ITEMS.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={'end' in it ? it.end : false}
          className={({ isActive }) =>
            cx(
              'flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11.5px] no-underline',
              isActive ? 'font-bold text-g' : 'text-mut',
            )
          }
        >
          {it.icon}
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
