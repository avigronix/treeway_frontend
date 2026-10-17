import { Skeleton } from '@/components/ui';
import { useFileBlob } from '@/lib/useFileBlob';

/** A member's receipt (private file, fetched with the admin token). Tap to open it full size. */
export function Receipt({ path, label = 'Receipt' }: { path: string; label?: string }) {
  const f = useFileBlob(path);
  if (f.error)
    return <span className="text-[13px] font-semibold text-b">The receipt could not be loaded.</span>;
  if (!f.url) return <Skeleton className="h-60 w-full rounded-[10px]" />; // same height as the picture: nothing jumps
  if (f.type === 'application/pdf') {
    return (
      <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-bold">
        Open {label.toLowerCase()} (PDF)
      </a>
    );
  }
  return (
    <a
      href={f.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}: open full size`}
      className="block"
    >
      <img
        src={f.url}
        alt={label}
        className="h-60 w-full rounded-[10px] border border-line bg-track object-contain"
      />
    </a>
  );
}
