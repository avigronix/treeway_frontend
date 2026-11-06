import { Link } from 'react-router';
import { ButtonLink } from '@/components/ui';
import { SitePage } from './SitePage';
import { Checks, IconCard, JoinBand, SectionTitle, SiteHero, Tagline } from './SiteParts';
import { SiteIcon } from './siteIcons';

// Public "Become a distributor" + "Treeway business opportunity": bhaiya's words (Vinay 6 Nov). The example IDs
// use the real format (TW + 7 digits). Growth depends on real sales: no income promise.

const STEPS: { title: string; text: string; example?: string }[] = [
  {
    title: 'Get introduced to Treeway',
    text: 'Connect with an existing registered Treeway Business Partner, who will introduce you to the company and guide you through the joining process. You may also contact Treeway directly through its official website or authorized channels to learn about the registration process.',
  },
  {
    title: 'Generate your reference number',
    text: "After the introduction, you can obtain a Reference Number through your referring Business Partner or the company's authorized registration system, wherever applicable.",
    example: 'Reference No. – TW1234567',
  },
  {
    title: 'Complete your registration',
    text: "With your Reference Number, submit the required personal details and documents through Treeway's official registration platform or authorized channel. After successful verification, your unique Treeway Business Partner ID will be generated.",
    example: 'ID No. – TW7654321',
  },
  {
    title: 'Start your business',
    text: "With your Treeway Business Partner ID, purchase products through authorized Treeway sales channels at applicable Business Partner prices, and promote or sell them according to the company's approved pricing and business policies.",
  },
  {
    title: 'Grow your business',
    text: "As you develop your business through genuine product sales and customer relationships, you may become eligible for various incentives, bonuses, rewards, and recognition according to Treeway's official Business Plan and applicable eligibility criteria.",
  },
];

const JOIN = [
  [
    'Introduction',
    "Learn about Treeway through a registered business partner, or the company's official website and authorized channels.",
  ],
  [
    'Registration',
    "After understanding the company's products, policies and business opportunity, submit the required information and documents.",
  ],
  [
    'Business Partner ID',
    "After successful verification, receive your unique Treeway Business Partner ID, subject to the company's registration policies.",
  ],
  [
    'Start your business',
    "Buy Treeway products through authorized company channels at applicable prices, and promote or sell them as per the company's approved business policies.",
  ],
  [
    'Growth and recognition',
    "Explore growth opportunities, incentives, recognition and rewards based on actual sales performance and eligibility under Treeway's official business plan.",
  ],
] as const;

export default function Distributor() {
  return (
    <SitePage title="Become a distributor">
      <SiteHero
        eyebrow="Become a distributor"
        title="How to become a Treeway Business Partner"
        lead="A great business opportunity is waiting for you at Treeway! Our joining process is simple, transparent and hassle-free."
      >
        <ButtonLink to="/register" variant="light" className="tab:w-auto tab:px-6">
          Create a free account
        </ButtonLink>
        <ButtonLink to="/contact" variant="outline-white" className="tab:w-auto tab:px-6">
          Talk to us
        </ButtonLink>
      </SiteHero>

      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 tab:py-16">
        <SectionTitle
          kicker="5 simple steps"
          title="Your joining journey"
          lead="Treeway offers an easy and convenient joining process for individuals who wish to become part of our growing business network."
        />
        <ol className="m-0 flex list-none flex-col p-0">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-4 pb-8 last:pb-0">
              {i < STEPS.length - 1 ? (
                <span aria-hidden="true" className="absolute top-12 bottom-0 left-[23px] w-0.5 bg-gold/40" />
              ) : null}
              <span className="relative grid size-12 flex-none place-items-center rounded-full border-2 border-gold bg-gt font-brand text-[18px] font-bold text-sun">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-2xl border border-line bg-white p-5">
                <span className="text-[12px] font-bold tracking-[.16em] text-goldt uppercase">
                  Step {i + 1}
                </span>
                <h3 className="m-0 text-[18px] font-bold text-gt">{s.title}</h3>
                <p className="m-0 text-[14.5px] leading-relaxed text-mut">{s.text}</p>
                {s.example ? (
                  <span className="w-fit rounded-lg bg-goldbg px-3 py-1.5 font-mono text-[13.5px] font-semibold text-goldink">
                    Example: {s.example}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <p className="m-0 text-[14.5px] text-mut">
          For complete details about business growth, rewards and earning opportunities, please refer to the
          official Treeway Business Plan. Questions?{' '}
          <Link to="/contact" className="font-semibold text-g">
            Contact us
          </Link>
          .
        </p>
      </section>

      <section className="relative overflow-hidden bg-gt text-[#D6E8D0]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 size-[360px] rounded-full bg-sun/10 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-5xl gap-8 px-4 py-12 tab:grid-cols-2 tab:items-center tab:py-16">
          <div className="flex flex-col gap-3">
            <span className="text-[12.5px] font-bold tracking-[.18em] text-sun uppercase">
              Treeway business opportunity
            </span>
            <h2 className="m-0 font-brand text-[26px] leading-tight text-white tab:text-[34px]">
              Build your own business with Treeway
            </h2>
          </div>
          <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
            <p className="m-0">
              Treeway is committed to bringing quality products and meaningful business opportunities to
              people through the Direct Selling industry. With a focus on product quality, customer
              satisfaction, traditional values, and modern business practices, Treeway aims to create a
              platform where individuals can grow together and achieve their entrepreneurial goals.
            </p>
            <p className="m-0">
              Our business philosophy is based on two important principles:{' '}
              <b className="text-sun">building your own business</b> and{' '}
              <b className="text-sun">helping others build theirs</b>. We believe in teamwork, continuous
              learning, and shared growth.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 tab:py-16">
        <SectionTitle kicker="How to join Treeway" title="Joining is simple and convenient" />
        <ol className="m-0 grid list-none gap-3 p-0 tab:grid-cols-5">
          {JOIN.map(([t, d], i) => (
            <li key={t} className="flex flex-col gap-2 rounded-2xl border-t-[3px] border-gold bg-white p-4">
              <span className="font-brand text-[22px] font-bold text-goldt">
                {String(i + 1).padStart(2, '0')}
              </span>
              <b className="text-[15px] text-gt">{t}</b>
              <span className="text-[13.5px] leading-relaxed text-mut">{d}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 tab:py-16">
          <ul className="m-0 grid list-none gap-4 p-0 tab:grid-cols-2">
            <IconCard icon={SiteIcon.clock} title="Part-time or full-time business">
              <p className="m-0">
                The Treeway Business Opportunity offers flexibility: work according to your own time,
                convenience and capabilities, while keeping a balance between personal and professional life.
              </p>
              <p className="m-0">
                Start part-time alongside your existing profession or dedicate more time to your business.
                Your growth depends on your efforts, product sales, customer relationships and business
                development activities.
              </p>
            </IconCard>
            <IconCard icon={SiteIcon.box} title="Quality products and customer satisfaction" tone="gold">
              <p className="m-0">
                Treeway focuses on a diverse range of quality products inspired by nature, traditional
                knowledge and modern research, at reasonable prices, with a strong commitment to quality,
                customer satisfaction and continuous improvement.
              </p>
              <p className="m-0">
                We believe that customer trust and product satisfaction are the foundations of long-term
                business growth.
              </p>
            </IconCard>
          </ul>
          <div className="grid gap-6 rounded-3xl bg-bg p-6 tab:grid-cols-[1fr_1.2fr] tab:p-8">
            <div className="flex flex-col gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-okbg text-g">
                {SiteIcon.book}
              </span>
              <h3 className="m-0 text-[20px] font-bold text-gt">Training and business support</h3>
              <p className="m-0 text-[14.5px] leading-relaxed text-mut">
                Treeway believes that knowledge and proper guidance are essential for business success. We aim
                to provide regular training and educational support to our business partners.
              </p>
            </div>
            <Checks
              items={[
                'Product knowledge and awareness',
                'Business development strategies',
                'Sales and marketing guidance',
                'Customer relationship management',
                'Personal development and communication skills',
                'Digital marketing and online business promotion',
              ]}
            />
          </div>
          <ul className="m-0 grid list-none gap-4 p-0 tab:grid-cols-2">
            <IconCard icon={SiteIcon.lock} title="Privacy and data protection">
              <p className="m-0">
                Treeway respects the privacy of its customers and registered business partners. Personal
                information collected during registration, product purchases, payments and other interactions
                (personal details, contact information, registration details, payment-related information and
                customer feedback) is handled responsibly as per our{' '}
                <Link to="/privacy" className="font-semibold text-g">
                  Privacy Policy
                </Link>{' '}
                and applicable data protection laws, with appropriate security measures to keep it
                confidential and safe.
              </p>
            </IconCard>
            <IconCard icon={SiteIcon.handshake} title="Grow together with Treeway" tone="gold">
              <p className="m-0">
                Success becomes more meaningful when it is shared. Our aim is a transparent, ethical and
                growth-oriented business environment where individuals can develop their skills, build
                customer relationships and explore entrepreneurial opportunities.
              </p>
              <p className="m-0">
                Join Treeway and become a part of a growing business community built on quality, trust,
                teamwork and continuous progress.
              </p>
            </IconCard>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-12">
        <p className="m-0 mb-6 text-[13px] text-mut">
          Income and rewards depend on genuine product sales and your own work, as per the official business
          plan. Treeway does not promise any fixed income.
        </p>
      </section>
      <JoinBand
        title="Join Treeway today!"
        text="Take your first step towards entrepreneurship, personal growth and new opportunities."
      />
      <Tagline>TREEWAY – The Power of Nature, The Power of Growth.</Tagline>
    </SitePage>
  );
}
