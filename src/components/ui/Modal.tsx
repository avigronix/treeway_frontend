import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/lib/cx';

/**
 * Centre modal over the app (theme .modal-wrap / .modal). It has no close button and Esc does nothing:
 * it is used for the locked login videos. The page behind must be made `inert` by the caller.
 */
export function Modal({
  labelledBy,
  className,
  children,
}: {
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,20,13,.72)] p-4">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cx(
          'flex max-h-[calc(100dvh-32px)] w-full max-w-[440px] flex-col gap-3 overflow-y-auto rounded-[22px] bg-white p-[18px] shadow-[0_24px_60px_rgba(0,0,0,.35)] outline-none',
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
