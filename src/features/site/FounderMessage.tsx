import type { ReactNode } from 'react';
import { SitePage } from './SitePage';
import { JoinBand, Tagline } from './SiteParts';
import { SiteIcon } from './siteIcons';

// Public "Founder's message": bhaiya's words as given (Vinay 11 Nov: "eye-catching, tadakta bhadakta"). A letter on a
// light card, two of its lines lifted out in gold, the signature at the end. No name or photo was given.

const PROMISES: [ReactNode, string][] = [
  [SiteIcon.leaf, 'Nature and Ayurveda in modern life'],
  [SiteIcon.shield, 'Made by licensed partner manufacturers'],
  [SiteIcon.star, 'Quality, packaging and transparency'],
  [SiteIcon.users, 'New opportunities for people'],
];

/** A line of the letter lifted out in gold (decorative: the same words are in the letter). */
function PullQuote({ children }: { children: ReactNode }) {
  return (
    <aside
      aria-hidden="true"
      className="relative my-2 overflow-hidden rounded-2xl bg-linear-120 from-amber via-sun to-gold px-6 py-5 text-gt shadow-[0_18px_40px_-18px_rgba(242,169,0,.7)]"
    >
      <span className="absolute -top-6 left-3 font-brand text-[90px] leading-none text-gt/15">“</span>
      <p className="relative m-0 font-brand text-[19px] leading-snug font-bold tab:text-[22px]">{children}</p>
    </aside>
  );
}

export default function FounderMessage() {
  return (
    <SitePage title="Founder's message">
      <section className="relative overflow-hidden bg-linear-160 from-gt via-g to-gt text-white">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-36 -right-24 size-[480px] rounded-full bg-sun/20 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 size-[380px] rounded-full bg-leaf/50 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-4 right-4 font-brand text-[200px] leading-none text-sun/15 tab:right-16 tab:text-[300px]"
        >
          ”
        </span>
        <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-4 py-14 tab:py-24">
          <span className="w-fit rounded-full border border-sun/60 bg-white/10 px-4 py-1 text-[12.5px] font-bold tracking-[.2em] text-sun uppercase">
            Founder's message
          </span>
          <h1 className="m-0 max-w-3xl font-brand text-[34px] leading-[1.1] text-white tab:text-[54px]">
            A message from our{' '}
            <span className="bg-linear-90 from-sun via-amber to-sun bg-clip-text text-transparent">
              Founder
            </span>
          </h1>
          <p className="m-0 max-w-2xl text-[16px] leading-relaxed text-[#D6E8D0] tab:text-[18px]">
            The goodness of nature and the timeless wisdom of Ayurveda, for modern lives.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 tab:py-16 desk:grid-cols-[300px_1fr] desk:items-start">
        <aside className="flex flex-col gap-4 desk:sticky desk:top-24">
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-linear-160 from-g to-gt p-6 text-center text-white shadow-[0_24px_50px_-24px_rgba(20,54,27,.8)]">
            <span className="grid size-28 place-items-center rounded-full bg-white p-3 shadow-[0_0_0_6px_rgba(242,201,76,.5)]">
              <img src="/icons/logo.png" alt="" width={360} height={197} className="h-auto w-full" />
            </span>
            <b className="font-brand text-[20px] text-sun">Founder &amp; CEO</b>
            <span className="text-[14px] font-semibold tracking-[.2em] uppercase">Treeway</span>
            <span className="text-[13px] text-[#D6E8D0]">The Power of Nature</span>
          </div>
          <ul aria-label="What Treeway stands for" className="m-0 grid list-none gap-2.5 p-0">
            {PROMISES.map(([i, t]) => (
              <li
                key={t}
                className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 text-[14px] font-semibold"
              >
                <span className="grid size-10 flex-none place-items-center rounded-xl bg-linear-135 from-sun to-amber text-gt">
                  {i}
                </span>
                {t}
              </li>
            ))}
          </ul>
        </aside>

        <article
          aria-label="Founder's message"
          className="relative overflow-hidden rounded-[28px] border border-gold/40 bg-white px-5 py-8 shadow-[0_30px_70px_-30px_rgba(20,54,27,.45)] tab:px-12 tab:py-12"
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-2 bg-linear-90 from-gold via-sun to-amber"
          />
          <div className="flex flex-col gap-5 text-[16px] leading-[1.8] text-ink tab:text-[17px] [&_p]:m-0">
            <p className="font-brand text-[18px] font-bold text-gt tab:text-[21px]">
              Dear Customers, Business Associates, and Well-Wishers,
            </p>
            <p className="first-letter:float-left first-letter:mr-2 first-letter:font-brand first-letter:text-[64px] first-letter:leading-[.9] first-letter:font-bold first-letter:text-goldt">
              Treeway was founded not merely as a business venture, but with a vision to connect the goodness
              of nature and the timeless wisdom of Ayurveda with modern lifestyles, making quality wellness
              products accessible to people.
            </p>
            <p>
              I strongly believe that health and well-being should be a priority in everyone's life. With this
              belief, we established Treeway with the aim of bringing a trusted range of Ayurvedic, herbal,
              nutraceutical, and wellness products to customers.
            </p>
            <PullQuote>Health and well-being should be a priority in everyone's life.</PullQuote>
            <p>
              Treeway operates through a brand-focused business model and does not own or operate its own
              manufacturing facility. Instead, we collaborate with experienced and licensed third-party
              manufacturing companies across India to manufacture products under the Treeway brand name. Our
              focus remains on careful product selection, quality standards, packaging, branding, and customer
              satisfaction.
            </p>
            <p>
              Our vision goes beyond simply offering products. We aim to build a strong business network that
              creates new opportunities for people, encourages entrepreneurship, helps individuals recognize
              their potential, and supports their journey towards financial independence.
            </p>
            <p>
              I firmly believe that the true identity of any company is built not only through its products
              but also through its values, transparency, commitment, and the trust it earns from people. At
              Treeway, we consider this trust our greatest strength.
            </p>
            <PullQuote>At Treeway, we consider this trust our greatest strength.</PullQuote>
            <p>
              I sincerely thank all our customers, partners, business associates, and distributors who are
              becoming a part of the Treeway journey and supporting our vision.
            </p>
            <p className="font-semibold text-gt">
              Together, let us build a brand that people trust and take pride in, a brand that strives to make
              a positive difference in the lives of millions in the years to come.
            </p>
          </div>

          <footer className="mt-8 flex flex-col gap-1 border-t border-line pt-6">
            <span className="text-[15px] text-mut italic">With gratitude and commitment,</span>
            <b className="font-brand text-[22px] text-gt">Founder &amp; CEO</b>
            <span className="font-brand text-[18px] tracking-[.15em] text-goldt">TREEWAY</span>
            <span className="text-[14px] text-mut">The Power of Nature</span>
          </footer>
        </article>
      </section>

      <JoinBand
        title="Be a part of the Treeway journey"
        text="Create your free account, or ask us anything first."
      />
      <Tagline>Treeway – The Power of Nature.</Tagline>
    </SitePage>
  );
}
