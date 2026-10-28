import { useState } from 'react';
import { adminApi, type AdminMemberDetail } from '@/api/admin';
import {
  Button,
  ErrorBox,
  Note,
  OtpInput,
  PasswordField,
  Sheet,
  TextAreaField,
  TextField,
} from '@/components/ui';
import { mmss, useCountdown } from '@/lib/useCountdown';
import { useSingleFlight } from '@/lib/useSingleFlight';
import * as v from '@/lib/validators';
import { useAdminRefresh } from './adminData';

// H2 "Edit mobile / email" and "Send password reset" (Vinay, 16 Oct). The server keeps the audit log, mails the
// old email, confirms a new email with an OTP sent to it, and ends all the member's sessions. The admin never sees
// a password or the reset link.

const remarkError = (r: string) => (r.trim().length < 3 ? 'Write the reason (at least 3 letters).' : null);

export function EditContactButton({ d }: { d: AdminMemberDetail }) {
  const refresh = useAdminRefresh();
  const m = d.member;
  const [open, setOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpFor, setOtpFor] = useState<{ email: string; masked: string } | null>(null);
  const [errs, setErrs] = useState<{ remark?: string | null; mobile?: string; email?: string }>({});
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  const [wait, startWait] = useCountdown();

  const reset = () => {
    setMobile('');
    setEmail('');
    setOtp('');
    setOtpFor(null);
    setRemark('');
    setErrs({});
    setError(null);
  };

  const [saveMobile, savingMobile] = useSingleFlight(async () => {
    setError(null);
    const p = v.mobile.safeParse(mobile.trim());
    const e = { remark: remarkError(remark), mobile: p.success ? undefined : p.error.issues[0]?.message };
    setErrs(e);
    if (e.remark || e.mobile) return;
    try {
      await adminApi.changeMemberMobile(m.user_code, mobile.trim(), remark.trim());
      setDone(`Mobile changed to ${mobile.trim()}. The member was logged out and their email was told.`);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err);
    } finally {
      await refresh();
    }
  });

  const [sendOtp, sending] = useSingleFlight(async () => {
    setError(null);
    const p = v.email.safeParse(email.trim());
    setErrs((x) => ({ ...x, email: p.success ? undefined : p.error.issues[0]?.message }));
    if (!p.success) return;
    try {
      const r = await adminApi.memberEmailOtp(m.user_code, p.data);
      setOtpFor({ email: p.data, masked: r.email });
      setOtp('');
      startWait();
    } catch (err) {
      setError(err);
    }
  });

  const [saveEmail, savingEmail] = useSingleFlight(async () => {
    if (!otpFor) return;
    setError(null);
    const r = remarkError(remark);
    setErrs((x) => ({ ...x, remark: r }));
    if (r) return;
    try {
      await adminApi.changeMemberEmail(m.user_code, otpFor.email, otp, remark.trim());
      setDone(`Email changed to ${otpFor.email}. The member was logged out and the old email was told.`);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err);
    } finally {
      await refresh();
    }
  });

  const busy = savingMobile || sending || savingEmail;
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => (setOpen(true), setDone(null))}>
        Edit mobile / email
      </Button>
      {done && (
        <Note role="status" tone="info" className="basis-full">
          {done}
        </Note>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={`Edit ${m.full_name}`} locked={busy}>
        <Note>
          Every change is saved with your name, ends all the member's sessions, and a notice goes to the
          member's email.
        </Note>
        <TextAreaField
          label="Reason (saved with your name)"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          error={errs.remark}
        />
        <section className="flex flex-col gap-2 border-t border-line2 pt-3">
          <b className="text-sm">Mobile number</b>
          <span className="text-[13px] text-mut">Now: {m.mobile}</span>
          <TextField
            label="New mobile number"
            inputMode="numeric"
            maxLength={10}
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
            error={errs.mobile}
          />
          <Button size="md" busy={savingMobile} disabled={busy && !savingMobile} onClick={saveMobile}>
            Save mobile
          </Button>
        </section>
        <section className="flex flex-col gap-2 border-t border-line2 pt-3">
          <b className="text-sm">Email</b>
          <span className="text-[13px] text-mut">Now: {m.email}</span>
          <TextField
            label="New email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => (setEmail(e.target.value), otpFor && setOtpFor(null))}
            error={errs.email}
          />
          <Button
            size="md"
            variant="ghost"
            busy={sending}
            disabled={wait > 0 || (busy && !sending)}
            onClick={sendOtp}
          >
            {wait > 0
              ? `Send OTP again (${mmss(wait)})`
              : otpFor
                ? 'Send OTP again'
                : 'Send OTP to the new email'}
          </Button>
          {otpFor && (
            <>
              <span className="text-[13px]">
                Ask the member for the OTP sent to <b>{otpFor.masked}</b>.
              </span>
              <OtpInput value={otp} onChange={setOtp} label="OTP from the new email" />
              <Button size="md" busy={savingEmail} disabled={otp.length !== 6} onClick={saveEmail}>
                Save email
              </Button>
            </>
          )}
        </section>
        {error ? <ErrorBox error={error} /> : null}
      </Sheet>
    </>
  );
}

export function ResetPasswordButton({ d }: { d: AdminMemberDetail }) {
  const m = d.member;
  const [open, setOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [remarkErr, setRemarkErr] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);

  const [go, busy] = useSingleFlight(async () => {
    setError(null);
    const r = remarkError(remark);
    setRemarkErr(r);
    if (r) return;
    try {
      const res = await adminApi.sendPasswordReset(m.user_code, remark.trim());
      setDone(
        `A link to set a new password went to ${res.email} (works once, for 24 hours). The member was logged out everywhere.`,
      );
      setOpen(false);
      setRemark('');
    } catch (e) {
      setError(e);
    }
  });

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => (setOpen(true), setDone(null))}>
        Send password reset
      </Button>
      {done && (
        <Note role="status" tone="info" className="basis-full">
          {done}
        </Note>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Send password reset" locked={busy}>
        <Note>
          {m.full_name} gets a link at their email ({m.email}) to set a new password. You never see the link
          or the password. The member is logged out everywhere now.
        </Note>
        <TextAreaField
          label="Reason (saved with your name)"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          error={remarkErr}
        />
        {error ? <ErrorBox error={error} /> : null}
        <Button busy={busy} onClick={go}>
          Send the link
        </Button>
      </Sheet>
    </>
  );
}

/** Any admin sets the member's password, no OTP (Vinay 28 Oct): for a member who cannot use the email link. The
 * admin tells the member by phone; the member must choose their own at the next login. The reason is saved with
 * the admin's name; the password is never saved in the log. */
export function SetPasswordButton({ d }: { d: AdminMemberDetail }) {
  const m = d.member;
  const refresh = useAdminRefresh();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [remark, setRemark] = useState('');
  const [errs, setErrs] = useState<Record<string, string | null | undefined>>({});
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);

  const check = () => {
    const p = v.password.safeParse(pw);
    const e = {
      pw: p.success ? undefined : p.error.issues[0]?.message,
      pw2: pw === pw2 ? undefined : 'Passwords do not match.',
      remark: remarkError(remark),
    };
    setErrs(e);
    return !Object.values(e).some(Boolean);
  };
  const close = () => {
    setOpen(false);
    setConfirm(false);
    setPw('');
    setPw2('');
    setError(null);
  };

  const [go, busy] = useSingleFlight(async () => {
    setError(null);
    try {
      await adminApi.setMemberPassword(m.user_code, pw, remark.trim());
      setDone(
        `New password set for ${m.user_code}. Tell ${m.full_name} by phone; they must choose their own at the next login.`,
      );
      setRemark('');
      close();
    } catch (e) {
      setConfirm(false);
      setError(e);
    } finally {
      await refresh();
    }
  });

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => (setOpen(true), setDone(null))}>
        Set new password
      </Button>
      {done && (
        <Note role="status" tone="info" className="basis-full">
          {done}
        </Note>
      )}
      <Sheet open={open} onClose={close} title="Set a new password" locked={busy}>
        {!confirm ? (
          <>
            <Note tone="warn">
              No OTP is asked. Use this only when {m.full_name} called you and cannot use the email link. They
              are logged out everywhere and must choose their own password at the next login.
            </Note>
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
            <TextAreaField
              label="Reason (saved with your name)"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              error={errs.remark}
            />
            {error ? <ErrorBox error={error} /> : null}
            <Button onClick={() => check() && setConfirm(true)}>Next</Button>
          </>
        ) : (
          <>
            <Note tone="warn">
              Set this password for {m.full_name} ({m.user_code})? Reason: "{remark.trim()}". Tell them the
              password by phone only.
            </Note>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>
                Back
              </Button>
              <Button variant="danger" busy={busy} onClick={go}>
                Set password
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
