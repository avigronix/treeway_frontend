import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { cx } from '@/lib/cx';
import { useIsTablet } from '@/lib/useMediaQuery';
import { Icon } from './icons';

// One app frame for member, admin and doctor on a tablet / laptop (>= 768 px).
// - Sidebar: groups, icons, active item, collapse / expand (remembered on this device), a tooltip on each icon
//   when collapsed. Default: collapsed below 1280 px, open from 1280 px.
// - Top bar: where you are (breadcrumb), an optional search, the user's name + role, and a profile menu.
// Phones (< 768 px) do not use it: the pages keep their own top bar and bottom menu.

export type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean; badge?: ReactNode };
export type NavGroup = { label?: string; items: NavItem[] };

const KEY = 'tw_sidebar';

function startCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'collapsed') return true;
    if (saved === 'open') return false;
  } catch {
    // storage blocked: fall back to the screen size
  }
  return typeof window !== 'undefined' && window.innerWidth < 1280;
}

/** The sidebar state, remembered per device. */
function useSidebar() {
  const [collapsed, setCollapsed] = useState(startCollapsed);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? 'open' : 'collapsed');
      } catch {
        // not remembered; still works for this page
      }
      return !c;
    });
  return { collapsed, toggle };
}

type Hint = { label: string; top: number } | null;

function SideLink({
  item,
  collapsed,
  dark,
  onHint,
}: {
  item: NavItem;
  collapsed: boolean;
  dark: boolean;
  onHint: (h: Hint) => void;
}) {
  const show = (el: HTMLElement) => {
    if (!collapsed) return;
    const r = el.getBoundingClientRect();
    onHint({ label: item.label, top: r.top + r.height / 2 });
  };
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onMouseEnter={(e) => show(e.currentTarget)}
      onFocus={(e) => show(e.currentTarget)}
      onMouseLeave={() => onHint(null)}
      onBlur={() => onHint(null)}
      className={({ isActive }) =>
        cx(
          'group relative flex min-h-[42px] items-center gap-3 rounded-[10px] text-[14.5px] no-underline transition-colors',
          collapsed ? 'justify-center px-0' : 'px-3',
          dark
            ? isActive
              ? 'bg-g font-semibold text-white'
              : 'text-[#D7E6D2] hover:bg-[#1B4523] hover:text-white'
            : isActive
              ? 'bg-g font-semibold text-white'
              : 'text-ink hover:bg-soft',
        )
      }
    >
      {item.icon}
      <span className={cx('min-w-0 flex-1 truncate', collapsed && 'sr-only')}>{item.label}</span>
      {!collapsed && item.badge}
      {collapsed && item.badge ? (
        <span aria-hidden="true" className="absolute top-1.5 right-2 size-2 rounded-full bg-sun" />
      ) : null}
    </NavLink>
  );
}

function Sidebar({
  groups,
  collapsed,
  dark,
  label,
}: {
  groups: NavGroup[];
  collapsed: boolean;
  dark: boolean;
  label: string;
}) {
  const [hint, setHint] = useState<Hint>(null);
  return (
    <aside
      aria-label={label}
      className={cx(
        'sticky top-0 hidden h-dvh flex-none flex-col transition-[width] duration-200 tab:flex',
        collapsed ? 'w-[76px]' : 'w-[264px]',
        dark ? 'bg-gt' : 'border-r border-line bg-white',
      )}
    >
      <Link
        to={groups[0]?.items[0]?.to ?? '/'}
        aria-label="Treeway home"
        className={cx(
          'mx-3 mt-3 mb-2 flex h-14 flex-none items-center justify-center rounded-xl bg-white',
          !dark && 'border border-line',
        )}
      >
        <img
          src={collapsed ? '/icons/icon-192.png' : '/icons/logo-480.webp'}
          alt=""
          width={collapsed ? 36 : 112}
          height={collapsed ? 36 : 52}
          className={collapsed ? 'size-9 rounded-lg' : 'h-[52px] w-[112px] object-contain'}
        />
      </Link>
      <nav aria-label={label} className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
        {groups.map((g, i) => (
          <div key={g.label ?? i} className="flex flex-col gap-0.5">
            {g.label &&
              (collapsed ? (
                <div
                  aria-hidden="true"
                  className={cx('mx-2 my-2 border-t', dark ? 'border-[#2E5A36]' : 'border-line')}
                />
              ) : (
                <div
                  className={cx(
                    'px-3 pt-3.5 pb-1 text-[11px] font-bold tracking-[.09em] uppercase',
                    dark ? 'text-[#8FB08A]' : 'text-mut',
                  )}
                >
                  {g.label}
                </div>
              ))}
            {g.items.map((it) => (
              <SideLink key={it.to} item={it} collapsed={collapsed} dark={dark} onHint={setHint} />
            ))}
          </div>
        ))}
      </nav>
      {collapsed && hint && (
        // Tooltip of a collapsed menu icon (fixed, so the scrolling menu never cuts it off).
        <span
          role="tooltip"
          style={{ top: hint.top }}
          className="pointer-events-none fixed left-[84px] z-50 -translate-y-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-white shadow-lg"
        >
          {hint.label}
        </span>
      )}
    </aside>
  );
}

/** The sidebar's open / close button: an icon only, with a tooltip on hover / focus and a name for screen readers. */
function MenuToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const label = collapsed ? 'Open the menu' : 'Close the menu to icons';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={label}
      className="group relative -ml-2 inline-flex size-10 flex-none cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-mut hover:bg-tint hover:text-ink"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <path d="M9 4v16" />
        <path d={collapsed ? 'M13.5 10l2 2-2 2' : 'M16 10l-2 2 2 2'} />
      </svg>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-full left-0 z-50 mt-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {collapsed ? 'Open menu' : 'Collapse menu'}
      </span>
    </button>
  );
}

/** "Name ▾" with Profile / Logout. Escape and a click outside close it; arrow keys move inside. */
function ProfileMenu({
  name,
  role,
  profileTo,
  onLogout,
}: {
  name: string;
  role: ReactNode;
  profileTo?: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', key);
    box.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const item =
    'flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent px-3 text-left text-sm text-ink no-underline hover:bg-tint focus-visible:bg-tint';
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-white py-1 pr-2.5 pl-1 hover:bg-tint"
      >
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-lg bg-soft text-[13px] font-bold text-gt"
        >
          {initials || '?'}
        </span>
        <span className="hidden max-w-[180px] flex-col text-left leading-tight wide:flex">
          <b className="truncate text-[13.5px]">{name}</b>
          <small className="truncate text-xs text-mut">{role}</small>
        </span>
        {Icon.chevronDown}
      </button>
      {open && (
        <div
          role="menu"
          tabIndex={-1}
          aria-label="Profile menu"
          className="absolute top-full right-0 z-50 mt-1.5 flex w-56 flex-col gap-0.5 rounded-xl border border-line bg-white p-1.5 shadow-lg"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            e.preventDefault();
            const items = [...(box.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
            const i = items.indexOf(document.activeElement as HTMLElement);
            items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
          }}
        >
          <div className="px-3 pt-1.5 pb-2 text-xs text-mut">
            <b className="block text-[13.5px] text-ink">{name}</b>
            {role}
          </div>
          {profileTo && (
            <Link role="menuitem" to={profileTo} className={item} onClick={() => setOpen(false)}>
              {Icon.profile}
              Profile
            </Link>
          )}
          <button role="menuitem" type="button" className={item} onClick={onLogout}>
            {Icon.logout}
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({
  label,
  groups,
  dark = false,
  crumbs,
  search,
  user,
  children,
}: {
  /** "Member menu", "Admin menu" ... (the sidebar's name for screen readers) */
  label: string;
  groups: NavGroup[];
  /** dark green sidebar (admin) */
  dark?: boolean;
  /** where you are, e.g. [{label: 'Members', to: '/admin/members'}, {label: 'Suresh'}] */
  crumbs: { label: ReactNode; to?: string }[];
  search?: ReactNode;
  user: { name: string; role: ReactNode; profileTo?: string; onLogout: () => void };
  children: ReactNode;
}) {
  const { collapsed, toggle } = useSidebar();
  const tablet = useIsTablet();
  if (!tablet) return <div className="min-h-dvh bg-bg">{children}</div>; // phone: the page's own frame
  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar groups={groups} collapsed={collapsed} dark={dark} label={label} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 hidden h-16 flex-none items-center gap-4 border-b border-line bg-white/95 px-6 backdrop-blur tab:flex">
          <MenuToggle collapsed={collapsed} onToggle={toggle} />
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="m-0 flex min-w-0 list-none items-center gap-1.5 p-0 text-sm">
              {crumbs.map((c, i) => (
                <li key={i} className="flex min-w-0 items-center gap-1.5">
                  {i > 0 && (
                    <span aria-hidden="true" className="text-mut">
                      ›
                    </span>
                  )}
                  {c.to && i < crumbs.length - 1 ? (
                    <Link to={c.to} className="truncate text-mut no-underline hover:text-g hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={i === crumbs.length - 1 ? 'page' : undefined}
                      className="truncate font-bold text-ink"
                    >
                      {c.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          {search}
          <ProfileMenu {...user} />
        </header>
        {children}
      </div>
    </div>
  );
}
