import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { ButtonLink } from '@/components/ui';
import { Icon } from '@/components/layout/icons';
import { cx } from '@/lib/cx';
import { useCompany } from '@/features/auth/usePublic';

// Public website frame (Vinay 29 Oct; pages added 6 Nov): Home, About us (with vision and mission), Become a
// distributor, Contact us; the policies in the footer. No login needed. The app still opens on /login; these pages
// are reached from "Back to Site" on the login page.

const SITE_LINKS = [
  { to: '/site', label: 'Home' },
  { to: '/about', label: 'About us' },
  { to: '/founders-message', label: "Founder's message" },
  { to: '/become-a-distributor', label: 'Become a distributor' },
  { to: '/contact', label: 'Contact us' },
] as const;
const POLICY_LINKS = [
  { to: '/privacy', label: 'Privacy policy' },
  { to: '/shipping-policy', label: 'Shipping policy' },
  { to: '/refund-policy', label: 'Refund, return and replacement' },
] as const;

const navClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    'rounded-lg px-3 py-2 text-[15px] font-semibold no-underline',
    isActive ? 'bg-okbg text-g' : 'text-ink hover:bg-tint',
  );

export function SitePage({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const company = useCompany().data;
  useEffect(() => {
    document.title = title === 'Home' ? 'Treeway · The power of nature' : `${title} · Treeway`;
  }, [title]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/site" aria-label="Treeway home" className="flex-none">
            <img
              src="/icons/logo-header.png"
              alt=""
              width={84}
              height={46}
              className="h-[46px] w-[84px] object-contain"
            />
          </Link>
          <nav aria-label="Website" className="ml-4 hidden flex-1 items-center gap-1 desk:flex">
            {SITE_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={navClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 desk:flex">
            <ButtonLink to="/login" variant="ghost" size="sm">
              Log in
            </ButtonLink>
            <ButtonLink to="/register" size="sm">
              Sign up
            </ButtonLink>
          </div>
          <button
            type="button"
            className="ml-auto grid size-11 cursor-pointer place-items-center rounded-xl border border-line bg-white text-ink desk:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {Icon.menu}
          </button>
        </div>
        {open && (
          <nav
            id="site-menu"
            aria-label="Website menu"
            className="border-t border-line bg-white px-4 pb-4 desk:hidden"
          >
            <ul className="m-0 flex list-none flex-col gap-1 p-0 pt-2">
              {SITE_LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    className={(s) => cx(navClass(s), 'block')}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
              {POLICY_LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    className={(s) => cx(navClass(s), 'block text-[14px] font-medium text-mut')}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ButtonLink to="/login" variant="ghost" size="md">
                Log in
              </ButtonLink>
              <ButtonLink to="/register" size="md">
                Sign up
              </ButtonLink>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t-[3px] border-gold bg-gt text-[#D6E8D0]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 tab:grid-cols-4">
          <div className="flex flex-col gap-2">
            <b className="font-brand text-xl text-sun">Treeway</b>
            <span className="text-sm">
              The Power of Nature, The Wisdom of Tradition, The Promise of Growth.
            </span>
            {company?.address ? <span className="text-[13px]">{company.address}</span> : null}
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-1.5 text-sm">
            {SITE_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="text-white no-underline hover:underline">
                {l.label}
              </Link>
            ))}
            <Link to="/login" className="text-white no-underline hover:underline">
              Log in
            </Link>
            <Link to="/register" className="text-white no-underline hover:underline">
              Sign up
            </Link>
          </nav>
          <nav aria-label="Policies" className="flex flex-col gap-1.5 text-sm">
            <b className="text-white">Policies</b>
            {POLICY_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="text-white no-underline hover:underline">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-1.5 text-sm">
            <b className="text-white">Help</b>
            {company?.phone ? (
              <a href={`tel:${company.phone}`} className="text-white">
                {company.phone}
              </a>
            ) : null}
            {company?.email ? (
              <a href={`mailto:${company.email}`} className="text-white">
                {company.email}
              </a>
            ) : null}
            <span>
              © {new Date().getFullYear()} {company?.name || 'Treeway'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** A plain text page (About, Privacy): a heading band and a readable column. */
export function SiteArticle({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <>
      <section className="bg-linear-135 from-g to-gt text-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-10 tab:py-14">
          <h1 className="m-0 font-brand text-[30px] leading-tight text-white tab:text-[40px]">{title}</h1>
          <p className="m-0 text-[15px] text-[#D6E8D0] tab:text-[17px]">{lead}</p>
        </div>
      </section>
      <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 text-[15px] leading-relaxed text-ink [&_h2]:m-0 [&_h2]:text-[19px] [&_h2]:font-bold [&_h2]:text-gt [&_p]:m-0 [&_p_a]:font-semibold [&_p_a]:underline [&_section]:flex [&_section]:flex-col [&_section]:gap-2">
        {children}
      </article>
    </>
  );
}

/** A bulleted list for the text pages (gold bullets). */
export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="m-0 flex list-disc flex-col gap-1 pl-5 marker:text-gold">{children}</ul>;
}
