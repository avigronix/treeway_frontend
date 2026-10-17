import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { isOtpNeeded, usersApi, type LoginOtpNeeded } from '@/api/users';
import { startSession } from '@/auth/session';
import {
  Button,
  ButtonLink,
  Divider,
  ErrorBox,
  Note,
  OtpInput,
  PasswordField,
  TextField,
} from '@/components/ui';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { AuthPage } from './AuthShell';
import { BannerStrip } from '@/features/content/BannerStrip';
import { useCompany } from './usePublic';

const schema = z.object({
  login_id: z
    .string()
    .trim()
    .min(3, 'Enter your ID or mobile number.')
    .max(20, 'Enter your ID or mobile number.'),
  password: z.string().min(1, 'Enter your password.').max(64, 'Password is too long.'),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const location = useLocation();
  const state = (location.state ?? {}) as { msg?: string; from?: string };
  const company = useCompany();

  const [serverError, setServerError] = useState<unknown>(null);
  const [otpStep, setOtpStep] = useState<LoginOtpNeeded | null>(null);
  const [otp, setOtp] = useState('');

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { login_id: '', password: '' },
  });
  const errors = form.formState.errors;

  function enter(token: string) {
    startSession(qc, token);
    // The guards send each person to their own home (activation, member, admin, doctor).
    navigate(state.from && state.from !== '/login' ? state.from : '/', { replace: true });
  }

  /** A blocked or removed ID: 403 with error "Blocked" (login and login OTP). Shows the blocked screen. */
  function toBlocked(e: unknown): boolean {
    if (!(e instanceof ApiError && e.status === 403 && e.error === 'Blocked')) return false;
    navigate('/blocked', { replace: true, state: { msg: e.message } });
    return true;
  }

  const [submit, busy] = useSingleFlight(async (values: Form) => {
    setServerError(null);
    try {
      const res = await usersApi.login(values.login_id, values.password);
      if (isOtpNeeded(res)) setOtpStep(res);
      else enter(res.token);
    } catch (e) {
      if (!toBlocked(e)) setServerError(e);
    }
  });

  const [verify, verifying] = useSingleFlight(async () => {
    if (!otpStep) return;
    setServerError(null);
    try {
      const res = await usersApi.loginOtp(otpStep.login_ticket, otp);
      enter(res.token);
    } catch (e) {
      if (!toBlocked(e)) setServerError(e);
    }
  });

  const help = company.data?.phone;

  return (
    <AuthPage>
      <div className="flex flex-col items-center gap-2 border-b border-line bg-bg px-6 pt-9 pb-7">
        <img
          src="/icons/logo-480.webp"
          alt="Treeway - The Power of Nature"
          width={240}
          height={160}
          className="h-40 w-60 object-contain"
        />
      </div>

      {otpStep ? (
        <form
          className="flex flex-1 flex-col gap-3.5 px-[22px] py-6"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[22px] font-bold">Enter OTP</h1>
            <span className="text-[13px] text-mut">We sent a 6-digit OTP to {otpStep.email}</span>
          </div>
          <OtpInput value={otp} onChange={setOtp} focusOnMount />
          <span className="text-xs text-mut">OTP works for 5 minutes</span>
          {serverError ? <ErrorBox error={serverError} /> : null}
          <Button type="submit" busy={verifying} disabled={otp.length !== 6}>
            Log in
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setOtpStep(null);
              setOtp('');
              setServerError(null);
            }}
          >
            Back
          </Button>
        </form>
      ) : (
        <form
          noValidate
          className="flex flex-1 flex-col gap-3.5 px-[22px] py-6"
          onSubmit={form.handleSubmit((v) => void submit(v))}
        >
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[22px] font-bold">Welcome back</h1>
            <span className="text-[13px] text-mut">Log in with your ID or mobile number</span>
          </div>
          {state.msg && <Note tone="warn">{state.msg}</Note>}
          <BannerStrip audience="login" />
          <TextField
            label="ID or mobile number"
            placeholder="For example TW482915"
            autoComplete="username"
            autoCapitalize="characters"
            error={errors.login_id?.message}
            {...form.register('login_id')}
          />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...form.register('password')}
          />
          <div className="text-right">
            <Link to="/forgot" className="text-[13px] font-bold">
              Forgot password?
            </Link>
          </div>
          {serverError ? <ErrorBox error={serverError} /> : null}
          <Button type="submit" busy={busy}>
            Log in
          </Button>
          <div className="flex items-center gap-3">
            <Divider className="flex-1" />
            <span className="text-xs text-mut">New here?</span>
            <Divider className="flex-1" />
          </div>
          <ButtonLink to="/register" variant="ghost">
            Create a free account
          </ButtonLink>
          <Link to="/contact" className="text-center text-[13px] font-bold">
            Questions? Contact us
          </Link>
          <Note className="mt-auto text-center">
            Tip: tap "Add to Home screen" in your browser to use Treeway like an app.
            {help ? (
              <>
                {' '}
                Help: <b>{help}</b>
              </>
            ) : null}
          </Note>
        </form>
      )}
    </AuthPage>
  );
}
