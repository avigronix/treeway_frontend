import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui';
import { Icon } from '@/components/layout/icons';
import { formatMoney } from '@/lib/money';
import { useCompany, useConfig } from '@/features/auth/usePublic';
import { SitePage } from './SitePage';

// Public home page (Vinay 29 Oct). Plan numbers (activation amount, video reward) come from /config/public, never
// typed here. No income promise anywhere: the note at the end says so.

function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
      <span className="grid size-11 place-items-center rounded-full bg-okbg text-g">{icon}</span>
      <h3 className="m-0 text-[17px] font-bold">{title}</h3>
      <p className="m-0 text-[14.5px] text-mut">{children}</p>
    </li>
  );
}

export default function Landing() {
  const config = useConfig().data;
  const help = useCompany().data?.phone;
  const video = config?.video;

  return (
    <SitePage title="Home">
      <section className="bg-linear-135 from-g to-gt text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 tab:grid-cols-[1.2fr_1fr] tab:py-20">
          <div className="flex flex-col gap-4">
            <span className="w-fit rounded-full border border-sun/60 px-3 py-1 text-[13px] font-semibold text-sun">
              The power of nature
            </span>
            <h1 className="m-0 font-brand text-[32px] leading-tight text-white tab:text-[46px]">
              Ayurvedic wellness, free doctor advice and a team that grows with you
            </h1>
            <p className="m-0 max-w-xl text-[16px] text-[#D6E8D0]">
              Treeway is a simple app in easy English. Shop natural products, ask a doctor for free, watch
              short videos every day and build your own team.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <ButtonLink to="/register" variant="light" className="px-6 tab:w-auto">
                Create a free account
              </ButtonLink>
              <ButtonLink to="/login" variant="outline-white" className="px-6 tab:w-auto">
                Log in
              </ButtonLink>
            </div>
          </div>
          <div className="flex justify-center rounded-3xl bg-white p-6 tab:p-8">
            <img
              src="/icons/logo.png"
              alt="Treeway - The Power of Nature"
              width={360}
              height={197}
              className="h-auto w-full max-w-[360px]"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[24px] font-bold text-gt tab:text-[30px]">What you get</h2>
          <p className="m-0 text-mut">Everything in one app on your phone.</p>
        </div>
        <ul className="m-0 grid list-none gap-4 p-0 tab:grid-cols-2 desk:grid-cols-4">
          <Feature icon={Icon.shop} title="Ayurvedic shop">
            Natural health products, delivered to your home. Pay from your Product Wallet.
          </Feature>
          <Feature icon={Icon.doctor} title="Free doctor advice">
            Tell an Ayurvedic doctor your problem and get advice and a prescription in the app.
          </Feature>
          <Feature icon={Icon.videos} title="Daily videos">
            {video
              ? `Watch the day's short videos (up to ${video.per_day}) for ${video.days} days and get ${formatMoney(video.reward)} a day in your Product Wallet.`
              : 'Watch short videos every day and get a reward in your Product Wallet.'}
          </Feature>
          <Feature icon={Icon.team} title="Your own team">
            Share your link. When people join through you, your team grows and you earn as per the plan.
          </Feature>
        </ul>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12">
          <h2 className="m-0 text-[24px] font-bold text-gt tab:text-[30px]">How it works</h2>
          <ol className="m-0 grid list-none gap-4 p-0 tab:grid-cols-3">
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
              <li key={t} className="flex gap-3 rounded-2xl bg-bg p-5">
                <span className="grid size-9 flex-none place-items-center rounded-full bg-goldt font-bold text-white">
                  {i + 1}
                </span>
                <span className="flex flex-col gap-1">
                  <b className="text-[16px]">{t}</b>
                  <span className="text-[14.5px] text-mut">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 tab:grid-cols-3">
        {[
          ['Safe', 'An email OTP for every withdrawal, transfer and bank change.'],
          ['Private', 'Your bank details, PAN and health files are seen only by the people who need them.'],
          ['Simple', 'Easy English, works on any phone browser. Add it to your home screen like an app.'],
        ].map(([t, d]) => (
          <div key={t} className="flex flex-col gap-1 rounded-2xl border-t-[3px] border-gold bg-white p-5">
            <b className="text-[17px] text-gt">{t}</b>
            <span className="text-[14.5px] text-mut">{d}</span>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-goldbg p-6 tab:flex-row tab:items-center tab:justify-between tab:p-8">
          <div className="flex flex-col gap-1">
            <b className="text-[20px] text-goldink">Ready to start?</b>
            <span className="text-[14.5px] text-goldink">
              Questions first? {help ? `Call ${help} or ` : ''}send us a message.
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/register">Create a free account</ButtonLink>
            <ButtonLink to="/contact" variant="ghost">
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
