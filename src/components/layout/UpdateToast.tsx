import { Button } from '@/components/ui';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { applyUpdate, useUpdateReady } from '@/lib/swUpdate';

/** Bottom card when a new version of the app is ready. The member chooses when to reload. */
export function UpdateToast() {
  const ready = useUpdateReady();
  const [update, busy] = useSingleFlight(async () => applyUpdate());
  if (!ready) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[76px] z-50 mx-auto flex max-w-[456px] items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-lg desk:bottom-4"
    >
      <span>A new version of Treeway is ready.</span>
      <Button size="sm" variant="light" busy={busy} onClick={update}>
        Update
      </Button>
    </div>
  );
}
