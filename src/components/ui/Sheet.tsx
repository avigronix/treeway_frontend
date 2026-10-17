import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet (theme .sheet). Esc or a tap on the dark area closes it, unless `locked`
 * (use `locked` while a money request is running). Focus stays inside and goes back when it closes.
 */
export function Sheet({
  open,
  onClose,
  title,
  locked = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  locked?: boolean;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef({ onClose, locked });

  useEffect(() => {
    closeRef.current = { onClose, locked };
  });

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !closeRef.current.locked) {
        e.stopPropagation();
        closeRef.current.onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (!firstEl || !lastEl) return;
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div aria-hidden="true" className="absolute inset-0 bg-scrim" onClick={() => !locked && onClose()} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        // Phone: a bottom sheet. Tablet / laptop: a dialog in the middle of the screen.
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] max-w-[480px] flex-col gap-3 overflow-y-auto rounded-t-[22px] [&>*]:shrink-0 bg-white px-4 pt-2.5 pb-[calc(26px+env(safe-area-inset-bottom))] outline-none tab:top-1/2 tab:bottom-auto tab:max-h-[85dvh] tab:w-[calc(100%-48px)] tab:max-w-[560px] tab:-translate-y-1/2 tab:rounded-2xl tab:px-6 tab:pt-5 tab:pb-6 tab:shadow-2xl"
      >
        <span
          aria-hidden="true"
          className="mb-1.5 h-[5px] w-11 self-center rounded-full bg-line tab:hidden"
        />
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="m-0 text-base font-bold tab:text-lg">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            disabled={locked}
            onClick={onClose}
            className="hidden size-9 flex-none cursor-pointer items-center justify-center rounded-lg border border-line bg-white text-lg text-mut hover:bg-tint disabled:cursor-not-allowed disabled:opacity-50 tab:inline-flex"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
