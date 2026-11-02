import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Sheet, TextField } from '@/components/ui';
import { cx } from '@/lib/cx';

// Small pieces shared by the Cash Book screens: the ⋮ menu, name and delete sheets.

/** "⋮" with a small list of actions. Escape or a tap outside closes it. */
export function Kebab({
  label,
  items,
}: {
  label: string;
  items: { label: string; onPick: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  return (
    <div ref={box} className="relative flex-none">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xl font-bold text-mut hover:bg-tint"
      >
        ⋮
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-40 mt-1 flex w-44 flex-col rounded-xl border border-line bg-white p-1.5 shadow-lg"
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onPick();
              }}
              className={cx(
                'min-h-10 cursor-pointer rounded-lg border-0 bg-transparent px-3 text-left text-sm hover:bg-tint',
                it.danger ? 'text-red' : 'text-ink',
              )}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** New / rename a business or a book. `onSave` returns true when the server took it. */
export function NameSheet({
  title,
  label,
  initial = '',
  onSave,
  onClose,
}: {
  title: string;
  label: string;
  initial?: string;
  onSave: (name: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const v = name.trim();
    if (!v) return setError('Please enter a name.');
    if (v.length > 100) return setError('Use at most 100 letters.');
    setBusy(true);
    const ok = await onSave(v);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Sheet open title={title} onClose={onClose} locked={busy}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextField
          label={label}
          value={name}
          maxLength={100}
          autoComplete="off"
          error={error}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
        <Button type="submit" size="md" busy={busy}>
          Save
        </Button>
      </form>
    </Sheet>
  );
}

/** "Delete …?" with Cancel / Delete. */
export function ConfirmSheet({
  title,
  text,
  onConfirm,
  onClose,
}: {
  title: string;
  text: ReactNode;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open title={title} onClose={onClose} locked={busy}>
      <p className="m-0 text-sm text-lab">{text}</p>
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="ghost" size="md" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          size="md"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await onConfirm();
            setBusy(false);
            if (ok) onClose();
          }}
        >
          Delete
        </Button>
      </div>
    </Sheet>
  );
}
