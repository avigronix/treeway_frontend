import { useEffect, useId, useRef, useState } from 'react';
import { cx } from '@/lib/cx';

/**
 * 6-digit OTP (theme .otp). One real input drawn as 6 boxes, so paste and
 * phone autofill (`one-time-code`) work. Only digits are kept.
 * `focusOnMount`: right after "Send OTP" the member's next step is typing it, so focus moves there.
 */
export function OtpInput({
  value,
  onChange,
  label = 'OTP',
  error,
  focusOnMount,
  disabled,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  error?: string | null;
  focusOnMount?: boolean;
  disabled?: boolean;
  length?: number;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);
  const digits = value.slice(0, length).split('');

  return (
    <div className="flex flex-col gap-[5px]">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div
          aria-hidden="true"
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
        >
          {Array.from({ length }, (_, i) => {
            const filled = i < digits.length;
            const current = focused && i === Math.min(digits.length, length - 1);
            return (
              <span
                key={i}
                className={cx(
                  'num flex h-[54px] items-center justify-center rounded-xl border-[1.5px] text-[22px] font-bold',
                  error ? 'border-red' : filled || current ? 'border-g bg-tint' : 'border-field bg-white',
                  current && 'outline-3 outline-offset-1 outline-gold',
                )}
              >
                {digits[i] ?? ''}
              </span>
            );
          })}
        </div>
      </div>
      {error && (
        <span id={`${id}-err`} role="alert" className="text-[12.5px] font-semibold text-b">
          {error}
        </span>
      )}
    </div>
  );
}
