import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { uploadUrl, type Banner } from '@/api/content';
import { cx } from '@/lib/cx';

// Dashboard banner over today's video (Vinay 22 Oct): while the locked video shows, the admin's live Home
// banners open in a popup on top of it. Closing it changes nothing in the video: the video modal stays
// mounted underneath (only `inert` while the banner is open). No video = the normal banner strip on Home.
// Vinay 31 Oct: the popup takes the picture's own size (never cropped, never bigger than the screen). A tap on
// a picture opens it full screen (✕ goes back); only ✕ or a tap outside closes the popup. A banner's link
// is its own "Open" button, so a tap meant to look never leaves the popup.

const FOCUSABLE = 'a[href],button:not([disabled])';

const CLOSE_BTN =
  'flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 text-[26px] leading-none';

function OpenLink({ b, onOpen }: { b: Banner; onOpen: () => void }) {
  const cls = 'self-center rounded-full bg-g px-5 py-2 text-sm font-semibold text-white no-underline';
  const label = `Open ${b.title}`;
  return b.link_url!.startsWith('/') ? (
    <Link to={b.link_url!} aria-label={label} onClick={onOpen} className={cls}>
      Open
    </Link>
  ) : (
    <a
      href={b.link_url!}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onClick={onOpen}
      className={cls}
    >
      Open
    </a>
  );
}

/** Own shape, scaled down only to fit (the next banner peeks out when there are more). Until the picture is in
 * (slow phone) or when it fails, a 2:1 box holds its place, so the popup does not jump or shrink to a dot. */
function PopupPic({ b, many }: { b: Banner; many: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      // A picture already in the cache can finish before React listens for "load".
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0) setLoaded(true);
      }}
      src={uploadUrl(b.image)}
      alt={b.title}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(false)}
      className={cx(
        'block max-h-[calc(100dvh-190px)] rounded-2xl border border-line bg-track object-contain',
        many ? 'max-w-[calc(85vw-48px)] tab:max-w-[580px]' : 'max-w-[calc(100vw-64px)] tab:max-w-[678px]',
        loaded
          ? 'h-auto w-auto'
          : cx(
              'aspect-[2/1] h-auto',
              many ? 'w-[calc(85vw-48px)] tab:w-[580px]' : 'w-[calc(100vw-64px)] tab:w-[678px]',
            ),
      )}
    />
  );
}

export function BannerModal({ list, onClose }: { list: Banner[]; onClose: () => void }) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  const zoomBox = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [zoomed, setZoomed] = useState<Banner | null>(null);
  const zoomFrom = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const zoomedRef = useRef(zoomed);
  useEffect(() => {
    onCloseRef.current = onClose;
    zoomedRef.current = zoomed;
  });

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        // Esc backs out one step: the full-screen picture first, then the popup.
        if (zoomedRef.current) setZoomed(null);
        else onCloseRef.current();
        return;
      }
      const area = zoomedRef.current ? zoomBox.current : box.current;
      if (e.key !== 'Tab' || !area) return;
      const items = [...area.querySelectorAll<HTMLElement>(FOCUSABLE)];
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

  // Full screen: focus its ✕; back in the popup, focus the picture that was tapped.
  useEffect(() => {
    if (zoomed) zoomBox.current?.querySelector<HTMLElement>('button')?.focus();
    else zoomFrom.current?.focus();
  }, [zoomed]);

  const many = list.length > 1;

  return createPortal(
    // Above the video modal (z-50) and the app.
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-[rgba(10,20,13,.6)]" onClick={onClose} />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={zoomed ? true : undefined}
        // As wide as the picture, at least room for the title, never wider/taller than the screen.
        className="relative flex max-h-[calc(100dvh-32px)] w-fit min-w-[min(288px,100%)] max-w-full flex-col gap-3 overflow-y-auto rounded-[22px] bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,.35)] tab:max-w-[720px] tab:p-5"
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
            className={cx(CLOSE_BTN, 'bg-track text-ink')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <ul
          aria-label="Offers and news"
          className="m-0 flex list-none items-start snap-x snap-mandatory gap-2.5 overflow-x-auto p-0"
        >
          {list.map((b) => (
            <li key={b.id} className="flex flex-none snap-start flex-col gap-2">
              <button
                type="button"
                aria-label={`View ${b.title} full screen`}
                onClick={(e) => {
                  zoomFrom.current = e.currentTarget;
                  setZoomed(b);
                }}
                className="cursor-zoom-in border-0 bg-transparent p-0"
              >
                <PopupPic b={b} many={many} />
              </button>
              {b.link_url ? <OpenLink b={b} onOpen={onClose} /> : null}
            </li>
          ))}
        </ul>
        {many && <span className="text-center text-xs text-mut">Swipe to see all {list.length}</span>}
      </div>
      {zoomed ? (
        <div
          ref={zoomBox}
          role="dialog"
          aria-modal="true"
          aria-label={zoomed.title}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 pt-16"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-black/90" onClick={() => setZoomed(null)} />
          {/* As big as the screen allows, whole picture (a tap on it does nothing; ✕ goes back). */}
          <img
            src={uploadUrl(zoomed.image)}
            alt={zoomed.title}
            className="relative block h-full w-full object-contain"
          />
          <button
            type="button"
            aria-label="Close full screen"
            onClick={() => setZoomed(null)}
            className={cx(CLOSE_BTN, 'absolute right-3 top-3 bg-white/15 text-white')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
