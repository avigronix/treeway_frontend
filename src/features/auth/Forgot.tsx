import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usersApi } from '@/api/users';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Card, ErrorBox, OtpInput, PasswordField, Step, TextField, Timeline } from '@/components/ui';
import { mmss, useCountdown } from '@/lib/useCountdown';
import { useSingleFlight } from '@/lib/useSingleFlight';
import * as v from '@/lib/validators';
import { AuthPage } from './AuthShell';

export default function Forgot() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<{ code: string; email: string } | null>(null);
  const [otp, setOtp] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwErr, setPwErr] = useState<{ pw?: string; pw2?: string }>({});
  const [error, setError] = useState<unknown>(null);
  const [wait, startWait] = useCountdown();

  const [sendOtp, sending] = useSingleFlight(async () => {
    setError(null);
    const parsed = v.memberCode.safeParse(sentTo?.code ?? code);
    if (!parsed.success) {
      setCodeErr(parsed.error.issues[0]?.message ?? 'Enter your member ID.');
      return;
    }
    setCodeErr(null);
    try {
      const res = await usersApi.forgotOtp(parsed.data);
      setSentTo({ code: parsed.data, email: res.email });
      startWait();
    } catch (e) {
      setError(e);
    }
  });

  const [reset, resetting] = useSingleFlight(async () => {
    if (!sentTo) return;
    setError(null);
    const p = v.password.safeParse(pw);
    const errs = {
      pw: p.success ? undefined : p.error.issues[0]?.message,
      pw2: pw === pw2 ? undefined : 'Passwords do not match.',
    };
    setPwErr(errs);
    if (errs.pw || errs.pw2) return;
    try {
      await usersApi.forgotReset(sentTo.code, otp, pw);
      navigate('/login', {
        replace: true,
        state: { msg: 'Password changed. Please log in with the new password.' },
      });
    } catch (e) {
      setError(e);
    }
  });

  return (
    <AuthPage>
      <TopBar back="/login" title="Forgot password" subtitle="3 easy steps" />
      <form
        noValidate
        className="flex flex-1 flex-col gap-3.5 bg-bg px-4 py-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void (sentTo ? reset() : sendOtp());
        }}
      >
        <Card className="gap-3.5">
          <Timeline>
            <Step n={1} state={sentTo ? 'done' : 'now'}>
              <b className="text-[13px]">Your ID</b>
              {sentTo ? (
                <span className="text-xs text-mut">
                  {sentTo.code} · OTP sent to {sentTo.email}
                </span>
              ) : (
                <TextField
                  label="Member ID"
                  placeholder="TW1234567"
                  autoCapitalize="characters"
                  autoComplete="username"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  error={codeErr}
                />
              )}
            </Step>
            <Step n={2} state={sentTo ? 'now' : 'todo'}>
              <b className={sentTo ? 'text-[13px]' : 'text-[13px] text-mut'}>
                Enter the 6-digit OTP from your email
              </b>
              {sentTo && (
                <>
                  <OtpInput value={otp} onChange={setOtp} focusOnMount />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-mut">OTP works for 5 minutes</span>
                    <Button
                      variant="light"
                      size="sm"
                      className="text-[13px] font-semibold text-mut"
                      disabled={wait > 0}
                      busy={sending}
                      onClick={() => sendOtp()}
                    >
                      {wait > 0 ? `Send again (${mmss(wait)})` : 'Send again'}
                    </Button>
                  </div>
                </>
              )}
            </Step>
            <Step n={3} state="todo">
              <b className={otp.length === 6 ? 'text-[13px]' : 'text-[13px] text-mut'}>New password</b>
              {sentTo && (
                <>
                  <PasswordField
                    label="New password"
                    autoComplete="new-password"
                    help="At least 8 characters, with letters and numbers"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    error={pwErr.pw}
                  />
                  <PasswordField
                    label="Type it again"
                    autoComplete="new-password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    error={pwErr.pw2}
                  />
                </>
              )}
            </Step>
          </Timeline>
        </Card>
        {error ? <ErrorBox error={error} /> : null}
        {sentTo ? (
          <Button type="submit" busy={resetting} disabled={otp.length !== 6} className="mt-auto">
            Change password
          </Button>
        ) : (
          <Button type="submit" busy={sending} className="mt-auto">
            Send OTP
          </Button>
        )}
      </form>
    </AuthPage>
  );
}
