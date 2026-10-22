import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Banner } from '@/api/content';
import { BannerList } from './BannerStrip';

// Dashboard banner over today's video (Vinay 22 Oct): while the locked video shows, the admin's live Home
// banners open in a popup on top of it. Closing it changes nothing in the video: the video modal stays
// mounted underneath (only `inert` while the banner is open). No video = the normal banner strip on Home.

const FOCUSABLE = 'a[href],button:not([disabled])';

export function BannerModal({ list, onClose }: { list: Banner[]; onClose: () => void }) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !box.current) return;
      const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Back to the video (its dialog box) so the keyboard and screen readers land there.
      before?.focus();
    };
  }, []);

  return createPortal(
    // Above the video modal (z-50) and the app.
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-[rgba(10,20,13,.6)]" onClick={onClose} />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[calc(100dvh-32px)] w-full max-w-[420px] flex-col gap-3 overflow-y-auto rounded-[22px] bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,.35)] tab:max-w-[640px] tab:p-5"
      >
        <div className="flex items-center justify-between gap-2.5">
          <h2 id={titleId} className="m-0 text-[17px] font-bold">
            Offers and news
          </h2>
          <button
            ref={closeBtn}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-track text-[26px] leading-none text-ink"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <BannerList
          list={list}
          picClassName="aspect-[2/1] w-full rounded-2xl border border-line bg-track object-cover"
          onOpen={onClose}
        />
        {list.length > 1 && (
          <span className="text-center text-xs text-mut">Swipe to see all {list.length}</span>
        )}
      </div>
    </div>,
    document.body,
  );
}
