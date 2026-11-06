import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui';
import { cx } from '@/lib/cx';

// Building blocks of the public website pages (Vinay 6 Nov: bhaiya's content, "top-notch, eye-catching"):
// a green hero with soft light and a gold eyebrow, section headings with a gold rule, icon cards, numbered
// policy cards and the tagline band. Only theme colours.

/** The green band at the top of a page: gold eyebrow, big title, lead text, optional buttons. */
export function SiteHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lead: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-linear-135 from-g to-gt text-white">
      {/* Soft light, like sun through leaves. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-20 size-[380px] rounded-full bg-sun/15 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-16 size-[300px] rounded-full bg-leaf/40 blur-3xl"
      />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-4 py-12 tab:py-20">
        <span className="flex items-center gap-2 text-[12.5px] font-bold tracking-[.22em] text-sun uppercase">
          <span aria-hidden="true" className="h-px w-8 bg-sun/70" />
          {eyebrow}
        </span>
        <h1 className="m-0 max-w-3xl font-brand text-[32px] leading-[1.15] text-white tab:text-[48px]">
          {title}
        </h1>
        <p className="m-0 max-w-2xl text-[15.5px] leading-relaxed text-[#D6E8D0] tab:text-[18px]">{lead}</p>
        {children ? <div className="flex flex-wrap gap-3 pt-2">{children}</div> : null}
      </div>
    </section>
  );
}

/** A section heading with a short gold rule above it. */
export function SectionTitle({ kicker, title, lead }: { kicker?: string; title: string; lead?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span aria-hidden="true" className="h-1 w-12 rounded-full bg-gold" />
      {kicker ? (
        <span className="text-[12.5px] font-bold tracking-[.18em] text-goldt uppercase">{kicker}</span>
      ) : null}
      <h2 className="m-0 text-[24px] leading-tight font-bold text-gt tab:text-[32px]">{title}</h2>
      {lead ? <p className="m-0 max-w-3xl text-[15.5px] leading-relaxed text-mut">{lead}</p> : null}
    </div>
  );
}

/** A white card with a round icon, a title and text. */
export function IconCard({
  icon: i,
  title,
  children,
  tone = 'green',
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  tone?: 'green' | 'gold';
}) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_0_#dce4d8] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(20,54,27,.35)]">
      <span
        className={cx(
          'grid size-12 place-items-center rounded-2xl',
          tone === 'gold' ? 'bg-goldbg text-goldt' : 'bg-okbg text-g',
        )}
      >
        {i}
      </span>
      <h3 className="m-0 text-[17px] font-bold text-ink">{title}</h3>
      <div className="flex flex-col gap-2 text-[14.5px] leading-relaxed text-mut">{children}</div>
    </li>
  );
}

/** One numbered part of a policy page. */
export function PolicyCard({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex gap-4 rounded-2xl border border-line bg-white p-5 tab:p-6">
      <span className="grid size-10 flex-none place-items-center rounded-full bg-gt font-brand text-[17px] font-bold text-sun">
        {n}
      </span>
      <div className="flex min-w-0 flex-col gap-2 text-[15px] leading-relaxed text-ink [&_p]:m-0">
        <h2 className="m-0 text-[18px] font-bold text-gt">{title}</h2>
        {children}
      </div>
    </section>
  );
}

/** The brand line at the end of a page. */
export function Tagline({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gt px-6 py-8 text-center tab:py-10">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/2 size-[260px] -translate-x-1/2 rounded-full bg-sun/10 blur-3xl"
        />
        <p className="relative m-0 font-brand text-[19px] leading-snug text-sun tab:text-[26px]">
          {children}
        </p>
      </div>
    </section>
  );
}

/** "Join Treeway" call to action. */
export function JoinBand({ title, text }: { title: string; text: ReactNode }) {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-8">
      <div className="flex flex-col items-start gap-4 rounded-3xl border border-gold/40 bg-goldbg p-6 tab:flex-row tab:items-center tab:justify-between tab:p-8">
        <div className="flex flex-col gap-1">
          <b className="text-[20px] text-goldink">{title}</b>
          <span className="text-[14.5px] text-goldink">{text}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/register" className="tab:w-auto tab:px-6">
            Create a free account
          </ButtonLink>
          <ButtonLink to="/contact" variant="ghost" className="tab:w-auto tab:px-6">
            Contact us
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** Bullets with a gold check. */
export function Checks({ items }: { items: string[] }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {items.map((t) => (
        <li key={t} className="flex gap-2.5 text-[14.5px] leading-relaxed text-ink">
          <span
            aria-hidden="true"
            className="mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-gold text-[11px] font-bold text-white"
          >
            ✓
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}
