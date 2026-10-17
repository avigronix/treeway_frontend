import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { usersApi } from '@/api/users';
import { startSession } from '@/auth/session';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Card, ErrorBox, OtpInput } from '@/components/ui';
import { mmss, RESEND_GAP } from '@/lib/useCountdown';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { AuthPage } from './AuthShell';
import { clearPending, savePending, type PendingSignup } from './signupPending';

/** Seconds before "Send again" works, from when the last OTP was sent (still right after a reload). */
function useSecondsLeft(sentAt: number) {
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, Math.ceil((sentAt + RESEND_GAP * 1000 - now) / 1000));
  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [left]);
  return left;
}

/** Why the sign-up must start again from the form (the form shows it). */
export type Restart = { reason: 'expired' | 'mobile'; message: string };

/**
 * Sign-up step 2 (Q3, 16 Oct): the 6-digit OTP from the email makes the ID and logs in.
 * "Change email" goes back to the form (a new sign-up); an expired sign-up or a mobile taken meanwhile too.
 */
export function SignupOtpStep({
  pending,
  onChangeEmail,
  onRestart,
}: {
  pending: PendingSignup;
  onChangeEmail: () => void;
  onRestart: (r: Restart) => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [p, setP] = useState(pending);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<unknown>(null);
  const wait = useSecondsLeft(p.sentAt);

  const restartFor = (e: unknown): boolean => {
    if (!(e instanceof ApiError)) return false;
    if (e.error === 'SignupExpired') {
      clearPending();
      onRestart({ reason: 'expired', message: e.message });
      return true;
    }
    if (e.status === 409) {
      clearPending();
      onRestart({ reason: 'mobile', message: e.message });
      return true;
    }
    return false;
  };

  const [verify, verifying] = useSingleFlight(async () => {
    setError(null);
    try {
      const r = await usersApi.registerVerify(p.ticket, otp);
      clearPending();
      startSession(qc, r.token);
      navigate('/activate', { replace: true });
    } catch (e) {
      if (!restartFor(e)) setError(e);
    }
  });

  const [resend, resending] = useSingleFlight(async () => {
    setError(null);
    try {
      const r = await usersApi.registerResend(p.ticket);
      const now = Date.now();
      const next = { ...p, sentAt: now, expiresAt: now + r.expires_in * 1000 };
      savePending(next);
      setP(next);
      setOtp('');
    } catch (e) {
      if (!restartFor(e)) setError(e);
    }
  });

  return (
    <AuthPage>
      <TopBar back="/login" title="Check your email" subtitle="Last step · then your ID is ready" />
      <form
        noValidate
        className="flex flex-1 flex-col gap-3.5 bg-bg px-4 py-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (otp.length === 6) void verify();
        }}
      >
        <Card className="gap-3">
          <span className="text-[13.5px]">
            We sent a 6-digit OTP to <b>{p.maskedEmail}</b>. Type it here to create your ID.
          </span>
          <OtpInput value={otp} onChange={setOtp} label="OTP from your email" focusOnMount />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-mut">OTP works for 5 minutes. Look in Spam too.</span>
            <Button
              variant="light"
              size="sm"
              className="text-[13px] font-semibold text-mut"
              disabled={wait > 0}
              busy={resending}
              onClick={() => resend()}
            >
              {wait > 0 ? `Send again (${mmss(wait)})` : 'Send again'}
            </Button>
          </div>
        </Card>
        {error ? <ErrorBox error={error} /> : null}
        <div className="mt-auto flex flex-col gap-2">
          <Button type="submit" busy={verifying} disabled={otp.length !== 6}>
            Create my ID
          </Button>
          <Button variant="ghost" disabled={verifying} onClick={onChangeEmail}>
            Change email
          </Button>
        </div>
      </form>
    </AuthPage>
  );
}
