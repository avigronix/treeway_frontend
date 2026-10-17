import { useEffect, useId, useMemo, useRef } from 'react';
import { checkUploadFile } from '@/lib/upload';
import { cx } from '@/lib/cx';

function sizeText(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Receipt / screenshot picker. Checks jpg/png/webp/pdf and 5 MB here too, and shows a preview.
 * `onChange(file, error)`: error is the message to show when the file is not allowed (file is then null).
 */
export function FilePicker({
  label,
  file,
  onChange,
  error,
  disabled,
  imagesOnly = false,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null, error: string | null) => void;
  error?: string | null;
  disabled?: boolean;
  /** Public pictures (company QR, banners): JPG / PNG / WEBP only. */
  imagesOnly?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const preview = useMemo(
    () => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  return (
    <div className="flex min-w-0 flex-col gap-[5px]">
      <label htmlFor={id} className="text-[13px] font-semibold text-lab">
        {label}
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept={
          imagesOnly ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf'
        }
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = ''; // picking the same file again still fires onChange
          if (!f) return;
          const problem = checkUploadFile(f, imagesOnly);
          onChange(problem ? null : f, problem);
        }}
      />
      {file ? (
        <div className="flex items-center justify-between gap-2.5 rounded-xl border border-line bg-white p-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {preview ? (
              <img
                src={preview}
                alt={imagesOnly ? 'Chosen picture' : 'Your receipt'}
                className="size-12 flex-none rounded-[10px] object-cover"
              />
            ) : (
              <span className="flex size-12 flex-none items-center justify-center rounded-[10px] bg-track text-xs font-bold text-mut">
                PDF
              </span>
            )}
            <div className="flex min-w-0 flex-col">
              <b className="truncate text-[13px]">{file.name}</b>
              <span className="text-xs text-mut">Added · {sizeText(file.size)}</span>
            </div>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => input.current?.click()}
            className="hit44 h-9 flex-none cursor-pointer rounded-[10px] border-[1.5px] border-g bg-white px-3.5 text-sm font-bold text-g"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className={cx(
            'flex h-[72px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] border-dashed bg-white text-g',
            error ? 'border-red' : 'border-g',
          )}
        >
          <b className="text-[15px]">{imagesOnly ? '+ Add picture' : '+ Add photo or PDF'}</b>
          <span className="text-xs text-mut">
            {imagesOnly ? 'JPG, PNG or WEBP' : 'JPG, PNG, WEBP or PDF'} · up to 5 MB
          </span>
        </button>
      )}
      {error && (
        <span id={`${id}-err`} role="alert" className="text-[12.5px] font-semibold text-b">
          {error}
        </span>
      )}
    </div>
  );
}
