import type { ReactNode } from 'react';
import { Button, ErrorBox, OtpInput, Sheet } from '@/components/ui';
import { mmss } from '@/lib/useCountdown';

/** "Enter OTP" step of a money action: masked email, 6 digits, Send again after 60 s, what will happen, Confirm. */
export function OtpSheet({
  open,
  title,
  email,
  otp,
  setOtp,
  wait,
  onResend,
  resending,
  onConfirm,
  busy,
  confirmLabel,
  error,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  email: string | null;
  otp: string;
  setOtp: (v: string) => void;
  wait: number;
  onResend: () => void;
  resending: boolean;
  onConfirm: () => void;
  busy: boolean;
  confirmLabel: string;
  error: unknown;
  onClose: () => void;
  /** the summary: amount, to whom, what is left */
  children?: ReactNode;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} locked={busy}>
      <span className="text-[13px]">We sent a 6-digit OTP to {email}</span>
      <OtpInput value={otp} onChange={setOtp} focusOnMount />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-mut">OTP works for 5 minutes</span>
        <Button
          variant="light"
          size="sm"
          className="text-[13px] font-semibold text-mut"
          disabled={wait > 0 || busy}
          busy={resending}
          onClick={onResend}
        >
          {wait > 0 ? `Send again (${mmss(wait)})` : 'Send again'}
        </Button>
      </div>
      {children}
      {error ? <ErrorBox error={error} /> : null}
      <Button busy={busy} disabled={otp.length !== 6} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </Sheet>
  );
}
