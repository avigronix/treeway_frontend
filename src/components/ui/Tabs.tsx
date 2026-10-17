import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

export interface TabItem<V extends string> {
  value: V;
  label: ReactNode;
  count?: number;
}

/** Segmented tabs (theme .tabs). Arrow keys move between tabs. */
export function Tabs<V extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: ReadonlyArray<TabItem<V>>;
  value: V;
  onChange: (v: V) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKey(e: KeyboardEvent, i: number) {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + items.length) % items.length;
    const item = items[next];
    if (!item) return;
    onChange(item.value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx('flex flex-none gap-1 rounded-xl bg-tabs p-1', className)}
    >
      {items.map((t, i) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cx(
              'hit44 flex h-10 flex-1 cursor-pointer items-center justify-center gap-1 rounded-[9px] border-0 text-sm font-semibold',
              on ? 'bg-white text-gt shadow-[0_1px_2px_rgba(20,54,27,.12)]' : 'bg-transparent text-tabink',
            )}
          >
            {t.label}
            {/* The hidden ", " keeps a screen reader from reading "Ready 3" as "Ready3". */}
            {t.count !== undefined && <span className="sr-only">, </span>}
            {t.count !== undefined && <span className="num">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Filter pills (theme .pills / .pill). One can be on at a time. */
export function Pills<V extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: ReadonlyArray<TabItem<V>>;
  value: V;
  onChange: (v: V) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cx('flex flex-wrap gap-2', className)}>
      {items.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(t.value)}
            className={cx(
              'hit44 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold',
              on ? 'border-g bg-g text-white' : 'border-field bg-white text-ink',
            )}
          >
            {t.label}
            {/* The hidden ", " keeps a screen reader from reading "Super 3" + "2" as "Super 32". */}
            {t.count !== undefined && <span className="sr-only">, </span>}
            {t.count !== undefined && (
              <em
                className={cx(
                  'num rounded-full px-1.5 text-[11.5px] not-italic',
                  on ? 'bg-white/20' : 'bg-black/10',
                )}
              >
                {t.count}
              </em>
            )}
          </button>
        );
      })}
    </div>
  );
}
