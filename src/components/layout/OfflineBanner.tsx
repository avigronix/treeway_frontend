import { useOnline } from '@/lib/useOnline';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-40 bg-wbg px-4 py-2 text-center text-[13px] font-semibold text-w"
    >
      You are offline. Amounts may be old. Connect to the internet to see fresh data.
    </div>
  );
}
