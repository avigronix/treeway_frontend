import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/ui';
import { Icon } from '@/components/layout/icons';
import { cx } from '@/lib/cx';
import { formatMoney } from '@/lib/money';
import { useCompany, useConfig } from '@/features/auth/usePublic';
import { SitePage } from './SitePage';
import { SiteIcon } from './siteIcons';

// Public home page (Vinay 29 Oct; made bright and told in order, Vinay 6 Nov: "colorful, eye-catching, sequence
// manner"): hero -> numbers -> 01 who we are -> 02 what you get -> 03 how to start -> 04 vision and mission ->
// 05 become a distributor -> trust -> start. Plan numbers come from /config/public, never typed here. No income
// promise anywhere: the note at the end says so. Motion only when the phone allows it (motion-safe).

/** "01 · WHO WE ARE" + the heading of a step of the page. */
function StepHead({
  n,
  kicker,
  title,
  lead,
  light,
}: {
  n: string;
  kicker: string;
  title: string;
  lead?: ReactNode;
  light?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-3">
        <span
          className={cx(
            'font-brand text-[40px] leading-none font-bold tab:text-[52px]',
            light ? 'text-sun' : 'text-goldt',
          )}
        >
          {n}
        </span>
        <span
          className={cx(
            'text-[12.5px] font-bold tracking-[.2em] uppercase',
            light ? 'text-sun' : 'text-goldt',
          )}
        >
          {kicker}
        </span>
      </span>
      <h2
        className={cx(
          'm-0 text-[26px] leading-tight font-bold tab:text-[36px]',
          light ? 'text-white' : 'text-gt',
        )}
      >
        {title}
      </h2>
      {lead ? (
        <p
          className={cx('m-0 max-w-2xl text-[15.5px] leading-relaxed', light ? 'text-[#D6E8D0]' : 'text-mut')}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}

const TILE = {
  green: 'from-leaf to-gt text-sun',
  gold: 'from-sun to-amber text-gt',
  deep: 'from-g to-gt text-white',
  amber: 'from-amber to-gold text-white',
} as const;

function Feature({
  icon,
  title,
  tone,
  children,
}: {
  icon: ReactNode;
  title: string;
  tone: keyof typeof TILE;
  children: ReactNode;
}) {
  return (
    <li className="group flex flex-col gap-3 rounded-3xl border border-line bg-white p-5 transition motion-safe:hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(20,54,27,.45)]">
      <span className={cx('grid size-14 place-items-center rounded-2xl bg-linear-135 shadow-md', TILE[tone])}>
        {icon}
      </span>
      <h3 className="m-0 text-[18px] font-bold text-ink">{title}</h3>
      <p className="m-0 text-[14.5px] leading-relaxed text-mut">{children}</p>
    </li>
  );
}

function Stat({ big, small, tone }: { big: string; small: string; tone: keyof typeof TILE }) {
  return (
    <li className={cx('flex flex-col gap-0.5 rounded-2xl bg-linear-135 p-4 shadow-lg tab:p-5', TILE[tone])}>
      <b className="text-[22px] leading-tight tab:text-[26px]">{big}</b>
      <span className="text-[13px] font-semibold opacity-90">{small}</span>
    </li>
  );
}

export default function Landing() {
  const config = useConfig().data;
  const help = useCompany().data?.phone;
  const video = config?.video;

  return (
    <SitePage title="Home">
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-linear-160 from-gt via-g to-gt text-white">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-32 size-[520px] rounded-full bg-sun/25 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 -left-40 size-[420px] rounded-full bg-leaf/60 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 right-1/4 size-[360px] rounded-full bg-amber/20 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-24 tab:grid-cols-[1.15fr_1fr] tab:pt-20 tab:pb-32">
          <div className="flex flex-col gap-5">
            <span className="flex w-fit flex-wrap items-center gap-2 rounded-full border border-sun/50 bg-white/10 px-3.5 py-1.5 text-[12.5px] font-bold tracking-[.12em] text-sun uppercase backdrop-blur">
              <span aria-hidden="true" className="size-2 rounded-full bg-sun motion-safe:animate-pulse" />
              Ayurveda · Direct selling · Free doctor advice
            </span>
            <h1 className="m-0 font-brand text-[34px] leading-[1.1] text-white tab:text-[56px]">
              The Power of Nature,{' '}
              <span className="bg-linear-90 from-sun via-amber to-sun bg-clip-text text-transparent">
                The Promise of Growth
              </span>
            </h1>
            <p className="m-0 max-w-xl text-[16px] leading-relaxed text-[#D6E8D0] tab:text-[18px]">
              Ayurvedic products, free doctor advice, daily videos and your own business — all in one simple
              app in easy English, on any phone.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/register"
                className="inline-flex h-[52px] items-center justify-center rounded-2xl bg-linear-90 from-sun to-amber px-7 text-[16px] font-bold text-gt no-underline shadow-[0_12px_30px_-10px_rgba(242,201,76,.8)] transition motion-safe:hover:-translate-y-0.5"
              >
                Create a free account
              </Link>
              <ButtonLink
                to="/become-a-distributor"
                variant="outline-white"
                className="h-[52px] px-6 tab:w-auto"
              >
                Become a distributor
              </ButtonLink>
            </div>
            <span className="text-[14px] text-[#D6E8D0]">
              Already a member?{' '}
              <Link to="/login" className="font-bold text-sun">
                Log in
              </Link>
            </span>
          </div>

          <div className="relative mx-auto grid size-[280px] place-items-center tab:size-[380px]">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-[3px] border-dashed border-sun/60 motion-safe:animate-[tw-spin_40s_linear_infinite]"
            />
            <span aria-hidden="true" className="absolute inset-5 rounded-full bg-sun/20 blur-2xl" />
            <div className="relative grid size-[220px] place-items-center rounded-full bg-white p-6 shadow-[0_0_0_10px_rgba(255,255,255,.12),0_30px_80px_-20px_rgba(0,0,0,.6)] tab:size-[300px]">
              <img
                src="/icons/logo.png"
                alt="Treeway - The Power of Nature"
                width={360}
                height={197}
                className="h-auto w-[82%]"
              />
            </div>
            {[
              ['100% nature inspired', 'top-2 -left-2 tab:-left-6'],
              ['Free doctor advice', 'bottom-14 -right-3 tab:-right-6'],
              ['Home delivery', 'bottom-0 left-2 tab:left-6'],
            ].map(([t, pos], i) => (
              <span
                key={t}
                aria-hidden="true"
                style={{ animationDelay: `${i * 0.8}s` }}
                className={cx(
                  'absolute rounded-full bg-white px-3 py-1.5 text-[12.5px] font-bold text-gt shadow-lg motion-safe:animate-[tw-float_5s_ease-in-out_infinite]',
                  pos,
                )}
              >
                ✦ {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- numbers, over the hero edge */}
      <section className="relative z-10 mx-auto -mt-14 max-w-6xl px-4 tab:-mt-16">
        <ul
          aria-label="Treeway in numbers"
          className="m-0 grid list-none grid-cols-2 gap-3 p-0 desk:grid-cols-4"
        >
          <Stat
            tone="gold"
            big={config ? formatMoney(config.activation_amount) : '—'}
            small="Activate once, shop from your Product Wallet"
          />
          <Stat
            tone="deep"
            big={video ? `${formatMoney(video.reward)} a day` : 'Daily'}
            small="For watching the daily videos"
          />
          <Stat tone="green" big="Free" small="Advice from an Ayurvedic doctor" />
          <Stat tone="amber" big="All India" small="Delivery to your home" />
        </ul>
      </section>

      {/* ---------------------------------------------------------------- 01 who we are */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 tab:grid-cols-[1.1fr_1fr] tab:items-center tab:py-20">
        <div className="flex flex-col gap-4">
          <StepHead n="01" kicker="Who we are" title="More than a brand" />
          <p className="m-0 text-[15.5px] leading-relaxed">
            Treeway is a new initiative towards a better lifestyle, positive thinking and self-reliance. We
            bring positive changes to people's lives through nature-inspired products, traditional wisdom and
            modern innovation, with quality, honesty, transparency and customer satisfaction first.
          </p>
          <ButtonLink to="/about" variant="ghost" className="px-6 tab:w-auto tab:self-start">
            Read our story ›
          </ButtonLink>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
          {[
            [SiteIcon.leaf, 'Nature', 'bg-okbg text-g'],
            [SiteIcon.book, 'Tradition', 'bg-goldbg text-goldt'],
            [SiteIcon.sparkle, 'Innovation', 'bg-wbg text-w'],
            [SiteIcon.shield, 'Trust', 'bg-bluebg text-blue'],
          ].map(([i, t, c]) => (
            <li key={String(t)} className={cx('flex flex-col items-start gap-3 rounded-3xl p-5', String(c))}>
              <span className="grid size-12 place-items-center rounded-2xl bg-white shadow-sm">{i}</span>
              <b className="text-[17px]">{t}</b>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- 02 what you get */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 tab:py-20">
          <StepHead
            n="02"
            kicker="What you get"
            title="Everything in one app"
            lead="On your phone, in easy English."
          />
          <ul className="m-0 grid list-none gap-4 p-0 tab:grid-cols-2 desk:grid-cols-4">
            <Feature icon={Icon.shop} title="Ayurvedic shop" tone="green">
              Natural health products, delivered to your home. Pay from your Product Wallet.
            </Feature>
            <Feature icon={Icon.doctor} title="Free doctor advice" tone="gold">
              Tell an Ayurvedic doctor your problem and get advice and a prescription in the app.
            </Feature>
            <Feature icon={Icon.videos} title="Daily videos" tone="deep">
              {video
                ? `Watch the day's short videos (up to ${video.per_day}) for ${video.days} days and get ${formatMoney(video.reward)} a day in your Product Wallet.`
                : 'Watch short videos every day and get a reward in your Product Wallet.'}
            </Feature>
            <Feature icon={Icon.team} title="Your own team" tone="amber">
              Share your link. When people join through you, your team grows and you earn as per the plan.
            </Feature>
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------------- 03 how to start */}
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 tab:py-20">
        <StepHead n="03" kicker="How to start" title="Three simple steps" />
        <ol className="relative m-0 grid list-none gap-4 p-0 tab:grid-cols-3">
          <span
            aria-hidden="true"
            className="absolute top-8 right-[16%] left-[16%] hidden h-1 rounded-full bg-linear-90 from-leaf via-sun to-amber tab:block"
          />
          {[
            [
              'Sign up free',
              'Make your account with your sponsor’s ID or link. It takes 1 minute, no payment.',
            ],
            [
              'Activate your ID',
              config
                ? `Pay ${formatMoney(config.activation_amount)} once. ${formatMoney(config.product_wallet_on_activation)} comes to your Product Wallet for shopping.`
                : 'Pay the activation amount once. Part of it comes to your Product Wallet for shopping.',
            ],
            [
              'Use the app',
              'Watch videos, shop, ask the doctor and grow your team. Withdraw to your own bank.',
            ],
          ].map(([t, d], i) => (
            <li
              key={t}
              className="relative flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-[0_10px_30px_-18px_rgba(20,54,27,.4)]"
            >
              <span className="grid size-16 place-items-center rounded-full bg-linear-135 from-sun to-amber font-brand text-[26px] font-bold text-gt ring-8 ring-bg">
                {i + 1}
              </span>
              <b className="text-[18px] text-gt">{t}</b>
              <span className="text-[14.5px] leading-relaxed text-mut">{d}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------------- 04 vision and mission */}
      <section className="relative overflow-hidden bg-linear-160 from-gt via-g to-gt">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/3 size-[420px] rounded-full bg-sun/15 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 tab:py-20">
          <StepHead n="04" kicker="Vision and mission" title="Where we are going" light />
          <div className="grid gap-5 tab:grid-cols-2">
            <Link
              to="/about#vision-mission"
              className="flex flex-col gap-3 rounded-3xl bg-white/10 p-6 text-white no-underline ring-1 ring-white/20 backdrop-blur transition hover:bg-white/15"
            >
              <span className="flex items-center gap-3 text-sun">
                {SiteIcon.eye}
                <b className="text-[13px] tracking-[.18em] uppercase">Our vision</b>
              </span>
              <span className="text-[16px] leading-relaxed">
                To become a leading and trusted name in the Traditional &amp; Direct Selling industry,
                combining the wisdom of traditional values with modern innovation.
              </span>
              <span className="text-[14px] font-bold text-sun">Read more ›</span>
            </Link>
            <Link
              to="/about#vision-mission"
              className="flex flex-col gap-3 rounded-3xl bg-linear-135 from-sun to-amber p-6 text-gt no-underline shadow-[0_20px_50px_-20px_rgba(242,169,0,.7)] transition motion-safe:hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-3">
                {SiteIcon.target}
                <b className="text-[13px] tracking-[.18em] uppercase">Our mission</b>
              </span>
              <span className="text-[16px] leading-relaxed font-semibold">
                High-quality, affordable products inspired by nature, and ethical, transparent business
                opportunities with training and support for every partner.
              </span>
              <span className="text-[14px] font-bold">Read more ›</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- 05 become a distributor */}
      <section className="mx-auto max-w-6xl px-4 py-14 tab:py-20">
        <div className="relative flex flex-col gap-6 overflow-hidden rounded-[32px] bg-linear-120 from-amber via-sun to-gold p-6 text-gt tab:flex-row tab:items-center tab:justify-between tab:p-10">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -bottom-16 size-[260px] rounded-full bg-white/25 blur-2xl"
          />
          <div className="relative flex flex-col gap-2">
            <span className="flex items-center gap-3">
              <span className="font-brand text-[40px] leading-none font-bold text-gt">05</span>
              <span className="text-[12.5px] font-bold tracking-[.2em] uppercase">Become a distributor</span>
            </span>
            <b className="text-[26px] leading-tight tab:text-[34px]">Build your own business with Treeway</b>
            <span className="max-w-xl text-[15.5px] leading-relaxed">
              Part-time or full-time, at your own pace — with training, guidance and quality products.
            </span>
          </div>
          <div className="relative flex flex-wrap gap-3">
            <Link
              to="/become-a-distributor"
              className="inline-flex h-[52px] items-center justify-center rounded-2xl bg-gt px-6 text-[16px] font-bold text-sun no-underline shadow-lg"
            >
              See the 5 steps ›
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- trust */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-14 tab:grid-cols-3">
        {[
          [SiteIcon.lock, 'Safe', 'An email OTP for every withdrawal, transfer and bank change.', 'border-g'],
          [
            SiteIcon.shield,
            'Private',
            'Your bank details, PAN and health files are seen only by the people who need them.',
            'border-gold',
          ],
          [
            SiteIcon.heart,
            'Simple',
            'Easy English, works on any phone browser. Add it to your home screen like an app.',
            'border-amber',
          ],
        ].map(([i, t, d, c]) => (
          <div
            key={String(t)}
            className={cx('flex gap-4 rounded-3xl border-t-4 bg-white p-5 shadow-sm', String(c))}
          >
            <span className="grid size-11 flex-none place-items-center rounded-xl bg-okbg text-g">{i}</span>
            <span className="flex flex-col gap-1">
              <b className="text-[17px] text-gt">{t}</b>
              <span className="text-[14.5px] text-mut">{d}</span>
            </span>
          </div>
        ))}
      </section>

      {/* ---------------------------------------------------------------- start */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="relative flex flex-col items-start gap-5 overflow-hidden rounded-[32px] bg-linear-135 from-g to-gt p-6 text-white tab:flex-row tab:items-center tab:justify-between tab:p-10">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -left-10 size-[240px] rounded-full bg-sun/20 blur-3xl"
          />
          <div className="relative flex flex-col gap-1">
            <b className="font-brand text-[24px] text-sun tab:text-[30px]">Ready to start?</b>
            <span className="text-[15px] text-[#D6E8D0]">
              Questions first? {help ? `Call ${help} or ` : ''}send us a message.
            </span>
          </div>
          <div className="relative flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex h-[52px] items-center justify-center rounded-2xl bg-linear-90 from-sun to-amber px-6 text-[16px] font-bold text-gt no-underline"
            >
              Create a free account
            </Link>
            <ButtonLink to="/contact" variant="outline-white" className="h-[52px] px-6 tab:w-auto">
              Contact us
            </ButtonLink>
          </div>
        </div>
        <p className="m-0 mt-4 text-[13px] text-mut">
          Income depends on your own work and your team. Treeway does not promise any fixed income.
        </p>
      </section>
    </SitePage>
  );
}
