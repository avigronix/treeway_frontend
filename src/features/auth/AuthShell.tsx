import type { ReactNode } from 'react';

/**
 * Page frame for guest screens (login, sign-up, forgot, contact, reset).
 * Phone: the phone-width white column, as before. Tablet / laptop: one card in the middle of the page with the
 * green brand panel on the left and the form on the right (it scrolls inside if long).
 */
export function AuthPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-white tab:flex tab:items-center tab:justify-center tab:bg-bg tab:p-8">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-white tab:min-h-0 tab:max-w-[960px] tab:flex-row tab:overflow-hidden tab:rounded-3xl tab:border tab:border-line tab:shadow-xl">
        <aside
          aria-hidden="true"
          className="hidden flex-col justify-between gap-8 bg-gt p-10 text-white tab:flex tab:w-[40%]"
        >
          <div className="flex justify-center rounded-2xl bg-white p-3">
            <img
              src="/icons/logo-480.webp"
              alt=""
              width={200}
              height={96}
              className="h-24 w-[200px] object-contain"
            />
          </div>
          <div className="flex flex-col gap-3">
            <b className="font-brand text-[26px] leading-tight text-sun">The power of nature</b>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px] text-[#D7E6D2]">
              <li>✓ Earn with your team</li>
              <li>✓ Watch 4 videos a day</li>
              <li>✓ Ayurvedic shop and free doctor advice</li>
            </ul>
          </div>
          <small className="text-xs text-[#8FB08A]">© Treeway</small>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col tab:max-h-[calc(100dvh-4rem)] tab:overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
