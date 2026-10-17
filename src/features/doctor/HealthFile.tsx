import { useFileBlob } from '@/lib/useFileBlob';

/** A health photo / report (private: the member, the assigned doctor and admins). Tap to open it full size. */
export function HealthFile({ path, label }: { path: string; label: string }) {
  const f = useFileBlob(path);
  if (f.error) return <span className="text-xs text-b">{label}: could not be opened.</span>;
  if (!f.url) return <span className="h-20 rounded-lg bg-track" aria-label={`${label}: loading`} />;
  if (f.type === 'application/pdf')
    return (
      <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-bold">
        {label} (PDF)
      </a>
    );
  return (
    <a href={f.url} target="_blank" rel="noopener noreferrer" aria-label={`${label}: open full size`}>
      <img src={f.url} alt={label} className="h-20 w-full rounded-lg border border-line object-cover" />
    </a>
  );
}
