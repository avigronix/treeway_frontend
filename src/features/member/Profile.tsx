import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/api/keys';
import { usersApi, type Me } from '@/api/users';
import { endSession, useMe } from '@/auth/session';
import { setToken } from '@/auth/token';
import {
  Button,
  Card,
  ErrorBox,
  Note,
  OtpInput,
  PasswordField,
  SelectField,
  Sheet,
  SkeletonList,
  Tabs,
  TextField,
} from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { INDIAN_STATES } from '@/lib/states';
import { useSingleFlight } from '@/lib/useSingleFlight';
import * as v from '@/lib/validators';
import { MemberPage } from './MemberPage';

// Profile and bank: my details (email change needs an OTP), bank + PAN (OTP, then withdrawals pause 24 h),
// password (other devices are logged out), log out everywhere.

type Tab = 'details' | 'bank' | 'password';
const STATE_OPTIONS = INDIAN_STATES.map((s) => ({ value: s, label: s }));
const firstError = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? undefined : r.error?.issues[0]?.message;

function Details({ me }: { me: Me }) {
  const qc = useQueryClient();
  const [name, setName] = useState(me.full_name);
  const [email, setEmail] = useState(me.email);
  const [state, setState] = useState(me.state ?? '');
  const [district, setDistrict] = useState(me.district ?? '');
  const [otpTo, setOtpTo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [errs, setErrs] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  const emailChanged = email.trim().toLowerCase() !== me.email.toLowerCase();

  const [save, saving] = useSingleFlight(async () => {
    setError(null);
    setSaved(false);
    const e = { name: firstError(v.fullName.safeParse(name)), email: firstError(v.email.safeParse(email)) };
    setErrs(e);
    if (e.name || e.email) return;
    try {
      if (emailChanged && !otpTo) {
        // The OTP goes to the CURRENT email, so a stolen login cannot move the account.
        const r = await usersApi.emailChangeOtp();
        setOtpTo(r.email);
        return;
      }
      const body: Record<string, string> = {};
      if (name.trim() !== me.full_name) body.full_name = name.trim();
      if (state !== (me.state ?? '')) body.state = state;
      if (district.trim() !== (me.district ?? '')) body.district = district.trim();
      if (emailChanged) {
        body.email = email.trim().toLowerCase();
        body.otp = otp;
      }
      if (Object.keys(body).length === 0) return;
      await usersApi.updateProfile(body);
      await qc.invalidateQueries({ queryKey: qk.me });
      setOtpTo(null);
      setOtp('');
      setSaved(true);
    } catch (err) {
      setError(err);
    }
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <TextField
        label="Full name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errs.name}
      />
      <TextField
        label="Mobile number"
        value={me.mobile}
        disabled
        help="The mobile number cannot be changed."
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setOtpTo(null);
        }}
        error={errs.email}
        help={emailChanged ? 'To change the email, we send an OTP to your current email.' : undefined}
      />
      {otpTo && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px]">Enter the OTP sent to {otpTo}</span>
          <OtpInput value={otp} onChange={setOtp} focusOnMount />
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <SelectField
          label="State"
          placeholder="Choose"
          options={STATE_OPTIONS}
          value={state}
          onChange={(e) => setState(e.target.value)}
        />
        <TextField label="District" value={district} onChange={(e) => setDistrict(e.target.value)} />
      </div>
      {error ? <ErrorBox error={error} /> : null}
      {saved && <Note role="status">Your details are saved.</Note>}
      <Button type="submit" busy={saving} disabled={!!otpTo && otp.length !== 6}>
        {emailChanged && !otpTo ? 'Send OTP to change email' : 'Save details'}
      </Button>
    </form>
  );
}

function Bank({ me }: { me: Me }) {
  const qc = useQueryClient();
  const [holder, setHolder] = useState(me.bank_holder ?? '');
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState(me.bank_ifsc ?? '');
  const [branch, setBranch] = useState(me.bank_branch ?? '');
  const [pan, setPan] = useState(me.pan ?? '');
  const [errs, setErrs] = useState<Record<string, string | undefined>>({});
  const [otpTo, setOtpTo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  const [askOtp, asking] = useSingleFlight(async () => {
    setError(null);
    setSaved(false);
    const e = {
      holder: firstError(v.fullName.safeParse(holder)),
      account: firstError(v.bankAccount.safeParse(account)),
      ifsc: firstError(v.ifsc.safeParse(ifsc)),
      pan: firstError(v.pan.safeParse(pan)),
    };
    setErrs(e);
    if (Object.values(e).some(Boolean)) return;
    try {
      const r = await usersApi.bankOtp();
      setOtp('');
      setOtpTo(r.email);
    } catch (err) {
      setError(err);
    }
  });

  const [confirm, confirming] = useSingleFlight(async () => {
    setError(null);
    try {
      await usersApi.saveBank({
        bank_holder: holder.trim(),
        bank_account: account.trim(),
        bank_ifsc: ifsc.trim().toUpperCase(),
        bank_branch: branch.trim() || null,
        pan: pan.trim().toUpperCase(),
        otp,
      });
      await qc.invalidateQueries({ queryKey: qk.me });
      setOtpTo(null);
      setAccount('');
      setSaved(true);
    } catch (err) {
      // Wrong / old OTP or no answer: refresh what the server has; never send it again by itself.
      await qc.invalidateQueries({ queryKey: qk.me });
      setError(err);
    }
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void askOtp();
      }}
    >
      <Note>
        Withdrawals go to this account. To change it you need an OTP, and withdrawals pause for 24 hours.
      </Note>
      <TextField
        label="Account holder name"
        value={holder}
        onChange={(e) => setHolder(e.target.value)}
        error={errs.holder}
      />
      <TextField
        label="Account number"
        inputMode="numeric"
        autoComplete="off"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
        error={errs.account}
        help={me.bank_account ? `Now: ${me.bank_account}. Type the full number to save.` : undefined}
      />
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <TextField
          label="IFSC code"
          autoCapitalize="characters"
          value={ifsc}
          onChange={(e) => setIfsc(e.target.value)}
          error={errs.ifsc}
        />
        <TextField label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
      </div>
      <TextField
        label="PAN number (needed for tax)"
        autoCapitalize="characters"
        value={pan}
        onChange={(e) => setPan(e.target.value)}
        error={errs.pan}
      />
      {error && !otpTo ? <ErrorBox error={error} /> : null}
      {saved && <Note role="status">Bank details saved. Withdrawals pause for 24 hours.</Note>}
      <Button type="submit" busy={asking}>
        Save bank details
      </Button>
      <Sheet open={!!otpTo} onClose={() => setOtpTo(null)} title="Enter OTP" locked={confirming}>
        <span className="text-[13px]">We sent a 6-digit OTP to {otpTo}</span>
        <OtpInput value={otp} onChange={setOtp} focusOnMount />
        <span className="text-xs text-mut">OTP works for 5 minutes</span>
        {error ? <ErrorBox error={error} /> : null}
        <Button busy={confirming} disabled={otp.length !== 6} onClick={confirm}>
          Confirm and save
        </Button>
      </Sheet>
    </form>
  );
}

function Password() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [oldPw, setOld] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [errs, setErrs] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  const [change, changing] = useSingleFlight(async () => {
    setError(null);
    setDone(false);
    const e = {
      old: oldPw ? undefined : 'Enter your current password.',
      pw: firstError(v.password.safeParse(pw)),
      pw2: pw === pw2 ? undefined : 'Passwords do not match.',
    };
    setErrs(e);
    if (Object.values(e).some(Boolean)) return;
    try {
      const r = await usersApi.changePassword(oldPw, pw);
      setToken(r.token); // this phone stays logged in; the old token stops working everywhere
      setOld('');
      setPw('');
      setPw2('');
      setDone(true);
    } catch (err) {
      setError(err);
    }
  });

  const [logoutAll, leaving] = useSingleFlight(async () => {
    setError(null);
    try {
      await usersApi.logoutAll();
      endSession(qc);
      navigate('/login', { replace: true, state: { msg: 'You are logged out from all devices.' } });
    } catch (err) {
      setError(err);
    }
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void change();
      }}
    >
      <PasswordField
        label="Current password"
        autoComplete="current-password"
        value={oldPw}
        onChange={(e) => setOld(e.target.value)}
        error={errs.old}
      />
      <PasswordField
        label="New password"
        autoComplete="new-password"
        help="At least 8 characters, with letters and numbers"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        error={errs.pw}
      />
      <PasswordField
        label="Type it again"
        autoComplete="new-password"
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
        error={errs.pw2}
      />
      {error ? <ErrorBox error={error} /> : null}
      {done && <Note role="status">Password changed. Other phones and computers are logged out.</Note>}
      <Button type="submit" busy={changing}>
        Change password
      </Button>
      <Button variant="danger" busy={leaving} onClick={logoutAll}>
        Log out from all devices
      </Button>
    </form>
  );
}

export default function Profile() {
  const me = useMe();
  const [tab, setTab] = useState<Tab>('details');
  const m = me.data;
  const initials = m?.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <MemberPage narrow title="Profile" subtitle="Your details, bank and password" back="/more">
      {!m ? (
        <SkeletonList rows={3} />
      ) : (
        <>
          <Card className="flex-row items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-14 flex-none items-center justify-center rounded-full bg-g text-xl font-bold text-white"
            >
              {initials}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <b className="truncate">{m.full_name}</b>
              <span className="text-xs text-mut">
                {m.user_code} · {m.mobile}
              </span>
              {m.sponsor_name && (
                <span className="text-xs text-mut">
                  Sponsor: {m.sponsor_name} · since {formatDay(m.created_at)}
                </span>
              )}
            </div>
          </Card>
          <Tabs
            label="Profile sections"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'details', label: 'My details' },
              { value: 'bank', label: 'Bank and PAN' },
              { value: 'password', label: 'Password' },
            ]}
          />
          {tab === 'details' ? <Details me={m} /> : tab === 'bank' ? <Bank me={m} /> : <Password />}
        </>
      )}
    </MemberPage>
  );
}
