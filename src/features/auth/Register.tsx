import { useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { usersApi } from '@/api/users';
import { TopBar } from '@/components/layout/TopBar';
import { Button, ErrorBox, Note, PasswordField, SelectField, TextField } from '@/components/ui';
import { INDIAN_STATES } from '@/lib/states';
import { useDebounced } from '@/lib/useDebounced';
import { usePow } from '@/lib/usePow';
import { useSingleFlight } from '@/lib/useSingleFlight';
import * as v from '@/lib/validators';
import { AuthPage } from './AuthShell';
import { SignupOtpStep, type Restart } from './SignupOtp';
import { clearPending, loadPending, savePending, type PendingSignup } from './signupPending';

const schema = z
  .object({
    sponsor_code: v.memberCode,
    full_name: v.fullName,
    mobile: v.mobile,
    email: v.email,
    password: v.password,
    confirm_password: z.string(),
    // Both required (Q2, Vinay 16 Oct): the admin filters and the delivery charge use the state.
    state: z.string().min(1, 'Choose your state.'),
    district: z
      .string()
      .trim()
      .min(2, 'Enter your district.')
      .max(60, 'District name is too long.'),
  })
  .refine((f) => f.password === f.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match.',
  });
type Form = z.input<typeof schema>;
type Clean = z.output<typeof schema>;

const STATE_OPTIONS = INDIAN_STATES.map((s) => ({ value: s, label: s }));

/** Live "is this sponsor active?" check. */
function useSponsorCheck(raw: string) {
  const code = useDebounced(raw.trim().toUpperCase());
  const valid = v.CODE_RE.test(code);
  return useQuery({
    queryKey: ['sponsor', code],
    queryFn: ({ signal }) => usersApi.validateSponsor(code, signal),
    enabled: valid,
    retry: false,
    staleTime: 60_000,
  });
}

/** Live "is this mobile free?" check (the server allows 20 a minute, so it is debounced). */
function useMobileCheck(raw: string) {
  const mobile = useDebounced(raw.trim(), 500);
  return useQuery({
    queryKey: ['mobile-check', mobile],
    queryFn: ({ signal }) => usersApi.mobileCheck(mobile, signal),
    enabled: v.MOBILE_RE.test(mobile),
    retry: false,
    staleTime: 60_000,
  });
}

export default function Register() {
  const { code: fromLink } = useParams();
  const [serverError, setServerError] = useState<unknown>(null);
  // A sign-up waiting for its email OTP (also after closing the page and coming back).
  const [pending, setPending] = useState<PendingSignup | null>(() => loadPending());
  const [restart, setRestart] = useState<Restart | null>(null);
  const pow = usePow();
  const honeypot = useRef<HTMLInputElement>(null);

  const form = useForm<Form, unknown, Clean>({
    resolver: zodResolver(schema),
    defaultValues: {
      sponsor_code: (fromLink ?? '').toUpperCase(),
      full_name: '',
      mobile: '',
      email: '',
      state: '',
      district: '',
      ...pending?.fields, // "Change email" after a reload: the form comes back filled (never the password)
      password: '',
      confirm_password: '',
    },
  });
  const errors = form.formState.errors;

  const [sponsorInput, mobileInput] = useWatch({ control: form.control, name: ['sponsor_code', 'mobile'] });
  const sponsor = useSponsorCheck(sponsorInput ?? '');
  const mobile = useMobileCheck(mobileInput ?? '');

  const sponsorOk = sponsor.data?.is_valid ? `${sponsor.data.sponsor_name} · ID is active` : undefined;
  const sponsorErr =
    errors.sponsor_code?.message ??
    (sponsor.error instanceof ApiError && sponsor.error.status === 400 ? sponsor.error.message : undefined);
  const mobileErr =
    errors.mobile?.message ??
    (mobile.data && !mobile.data.available ? 'This number is already used' : undefined);

  const [submit, busy] = useSingleFlight(async (f: Clean) => {
    setServerError(null);
    setRestart(null);
    if (mobile.data && !mobile.data.available) return;
    const send = async () =>
      usersApi.register({
        sponsor_code: f.sponsor_code,
        full_name: f.full_name,
        mobile: f.mobile,
        email: f.email,
        password: f.password,
        confirm_password: f.confirm_password,
        state: f.state,
        district: f.district,
        website: honeypot.current?.value || null,
        ...(await pow.answer()), // the phone's bot check (usually ready long before the button is pressed)
      });
    try {
      let res;
      try {
        res = await send();
      } catch (e) {
        // The bot check was too old or already used: nothing was kept, so one fresh try is safe.
        if (!(e instanceof ApiError && e.error === 'Captcha')) throw e;
        res = await send();
      }
      // No ID yet: the email OTP comes next (Q3, 16 Oct).
      const now = Date.now();
      const p: PendingSignup = {
        ticket: res.signup_ticket,
        maskedEmail: res.email,
        sentAt: now,
        expiresAt: now + res.expires_in * 1000,
        fields: {
          sponsor_code: f.sponsor_code,
          full_name: f.full_name,
          mobile: f.mobile,
          email: f.email,
          state: f.state ?? '',
          district: f.district ?? '',
        },
      };
      savePending(p);
      setPending(p);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        form.setError('mobile', { message: 'This number is already used' });
        return;
      }
      setServerError(e);
    }
  });

  if (pending)
    return (
      <SignupOtpStep
        pending={pending}
        onChangeEmail={() => {
          clearPending(); // the old sign-up is left to expire; a new one starts with the new email
          form.reset({ ...form.getValues(), ...pending.fields, password: '', confirm_password: '' });
          setPending(null);
          setTimeout(() => form.setFocus('email'), 0);
        }}
        onRestart={(r) => {
          form.reset({ ...form.getValues(), ...pending.fields, password: '', confirm_password: '' });
          setPending(null);
          setRestart(r);
          if (r.reason === 'mobile') setTimeout(() => form.setError('mobile', { message: r.message }), 0);
        }}
      />
    );

  return (
    <AuthPage>
      <TopBar back="/login" title="Create a free account" subtitle="No payment now · takes 1 minute" />
      <form
        noValidate
        className="flex flex-1 flex-col gap-[11px] bg-bg px-4 py-3.5"
        onSubmit={form.handleSubmit((f) => void submit(f))}
      >
        <TextField
          label="Sponsor ID"
          placeholder="TW1234567"
          autoCapitalize="characters"
          autoComplete="off"
          error={sponsorErr}
          ok={sponsorErr ? undefined : sponsorOk}
          help={sponsor.isFetching ? 'Checking…' : undefined}
          {...form.register('sponsor_code')}
        />
        <TextField
          label="Full name"
          autoComplete="name"
          error={errors.full_name?.message}
          {...form.register('full_name')}
        />
        <TextField
          label="Mobile number"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          error={mobileErr}
          {...form.register('mobile')}
        />
        <TextField
          label="Email (we send OTP here)"
          type="email"
          inputMode="email"
          autoComplete="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <PasswordField
          label="Create password"
          autoComplete="new-password"
          help="At least 8 characters, with letters and numbers"
          error={errors.password?.message}
          {...form.register('password')}
        />
        <PasswordField
          label="Type the password again"
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          {...form.register('confirm_password')}
        />
        <div className="grid grid-cols-1 gap-[11px] min-[360px]:grid-cols-2">
          <SelectField
            label="State"
            placeholder="Choose"
            options={STATE_OPTIONS}
            error={errors.state?.message}
            {...form.register('state')}
          />
          <TextField
            label="District"
            autoComplete="address-level2"
            error={errors.district?.message}
            {...form.register('district')}
          />
        </div>
        {/* Spam trap: hidden from people and screen readers; bots fill every field. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input
              ref={honeypot}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </label>
        </div>
        {restart?.reason === 'expired' && <Note tone="warn">{restart.message}</Note>}
        {serverError ? <ErrorBox error={serverError} /> : null}
        <Button type="submit" busy={busy} className="mt-auto">
          Create free account
        </Button>
      </form>
    </AuthPage>
  );
}
