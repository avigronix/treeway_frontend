import type { ReactNode } from 'react';
import { Checks, IconCard, SectionTitle } from './SiteParts';
import { SiteIcon } from './siteIcons';

// "Vision and mission" and "Our promise": bhaiya's words (Vinay 6 Nov), shown inside About us (Vinay 6 Nov: "mission
// and vision about me hona chahiye"). /vision-mission now opens About at #vision-mission.

function Big({
  icon,
  label,
  title,
  children,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    // A gold-to-amber frame around a white card: bright on the dark green band.
    <article className="rounded-[28px] bg-linear-135 from-sun via-amber to-gold p-[3px] shadow-[0_24px_60px_-24px_rgba(242,169,0,.55)]">
      <div className="flex h-full flex-col gap-4 rounded-[25px] bg-white p-6 tab:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-14 flex-none place-items-center rounded-2xl bg-linear-135 from-g to-gt text-sun shadow-lg">
            {icon}
          </span>
          <div className="flex flex-col">
            <span className="text-[12.5px] font-bold tracking-[.18em] text-goldt uppercase">{label}</span>
            <h3 className="m-0 text-[22px] leading-tight font-bold text-gt tab:text-[26px]">{title}</h3>
          </div>
        </div>
        <div className="flex flex-col gap-3 text-[15.5px] leading-relaxed text-ink">{children}</div>
      </div>
    </article>
  );
}

export function VisionMissionSection() {
  return (
    <section
      id="vision-mission"
      aria-labelledby="vision-mission-title"
      className="relative scroll-mt-20 overflow-hidden bg-linear-160 from-gt via-g to-gt text-white"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-sun/15 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 size-[320px] rounded-full bg-leaf/50 blur-3xl"
      />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-4 py-14 tab:py-20">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="rounded-full border border-sun/60 bg-sun/10 px-4 py-1 text-[12.5px] font-bold tracking-[.2em] text-sun uppercase">
            Vision and mission
          </span>
          <h2
            id="vision-mission-title"
            className="m-0 font-brand text-[28px] leading-tight text-white tab:text-[42px]"
          >
            Where we are going, and how we get there
          </h2>
          <p className="m-0 max-w-2xl text-[15.5px] text-[#D6E8D0]">
            The wisdom of traditional values, together with modern innovation.
          </p>
        </div>
        <div className="grid gap-6 desk:grid-cols-2">
          <Big icon={SiteIcon.eye} label="Our vision" title="A trusted name, a healthier future">
            <p className="m-0">
              To become a leading and trusted name in the Traditional &amp; Direct Selling industry by
              combining the wisdom of traditional values with modern innovation. Treeway aspires to deliver
              high-quality products inspired by nature and tradition, while creating meaningful business
              opportunities that promote entrepreneurship, prosperity, and enrich lives.
            </p>
            <p className="m-0">
              Our vision is to build a trusted global community where quality, integrity, tradition, and
              innovation come together to create a better and healthier future.
            </p>
          </Big>
          <Big icon={SiteIcon.target} label="Our mission" title="Quality products, real growth">
            <p className="m-0">
              At Treeway, our mission is to develop and offer a diverse range of high-quality, innovative, and
              affordable products inspired by nature, traditional wisdom, and modern research, designed to
              meet the evolving needs of our customers.
            </p>
            <p className="m-0">
              We are committed to promoting ethical, transparent, and sustainable business opportunities
              through a growth-oriented Direct Selling model. By empowering our business partners with proper
              training, education, guidance, and support, we aim to help them develop their capabilities and
              achieve their entrepreneurial goals.
            </p>
          </Big>
        </div>
        <p className="m-0 text-center font-brand text-[18px] text-sun tab:text-[22px]">
          The Power of Nature, The Wisdom of Tradition, The Promise of Growth.
        </p>
      </div>
    </section>
  );
}

export function PromiseSection() {
  return (
    <>
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 tab:grid-cols-[1fr_1.1fr] tab:items-center tab:py-16">
        <SectionTitle
          kicker="Our promise"
          title="Built on a strong foundation"
          lead="With a strong foundation of honesty, integrity, customer satisfaction, respect for traditional values, and continuous quality improvement, Treeway strives to build lasting relationships, strengthen its business network, and create shared prosperity for everyone associated with us."
        />
        <div className="rounded-3xl border border-gold/40 bg-goldbg p-6">
          <Checks
            items={[
              'Honesty and integrity',
              'Customer satisfaction',
              'Respect for traditional values',
              'Continuous quality improvement',
              'Lasting relationships and shared prosperity',
            ]}
          />
        </div>
      </section>
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-12 tab:pb-16">
        <SectionTitle kicker="What we stand for" title="Four things come together" />
        <ul className="m-0 grid list-none gap-4 p-0 tab:grid-cols-2 desk:grid-cols-4">
          <IconCard icon={SiteIcon.star} title="Quality">
            High-quality products, made better every day.
          </IconCard>
          <IconCard icon={SiteIcon.shield} title="Integrity" tone="gold">
            Ethical and transparent in everything we do.
          </IconCard>
          <IconCard icon={SiteIcon.leaf} title="Tradition">
            Inspired by nature and traditional wisdom.
          </IconCard>
          <IconCard icon={SiteIcon.sparkle} title="Innovation" tone="gold">
            Modern research for today's needs.
          </IconCard>
        </ul>
      </section>
    </>
  );
}
