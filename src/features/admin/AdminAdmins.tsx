import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, adminKeys } from '@/api/admin';
import type { Schema } from '@/api/schema';
import { useMe } from '@/auth/session';
import {
  Button,
  Chip,
  ErrorBox,
  Note,
  PasswordField,
  Sheet,
  SkeletonList,
  TextAreaField,
  TextField,
} from '@/components/ui';
import { formatFullDate } from '@/lib/dates';
import { useSingleFlight } from '@/lib/useSingleFlight';
import * as v from '@/lib/validators';
import { AdminTitle, Panel, Table, td } from './AdminParts';

// System → Admins: every admin account. Only the main admin (TW1000000) adds, blocks or unblocks admins;
// the server says 403 to anyone else and never lets the main admin be blocked. A new admin has no join link.

const MAIN_ADMIN = 'TW1000000';
type Account = Schema<'AdminAccount'>;
const firstError = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? undefined : r.error?.issues[0]?.message;

function AddAdmin({ onDone }: { onDone: (msg: string) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: '', mobile: '', email: '', password: '' });
  const [errs, setErrs] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<unknown>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  const [add, adding] = useSingleFlight(async () => {
    setError(null);
    const e = {
      full_name: firstError(v.fullName.safeParse(f.full_name)),
      mobile: firstError(v.mobile.safeParse(f.mobile)),
      email: firstError(v.email.safeParse(f.email)),
      password: firstError(v.password.safeParse(f.password)),
    };
    setErrs(e);
    if (Object.values(e).some(Boolean)) return;
    try {
      const r = await adminApi.createAdmin({
        full_name: f.full_name.trim(),
        mobile: f.mobile.trim(),
        email: f.email.trim().toLowerCase(),
        password: f.password,
      });
      setOpen(false);
      setF({ full_name: '', mobile: '', email: '', password: '' });
      onDone(
        `Admin ${f.full_name.trim()} added: ${r.user_code}. They log in with the mobile, password and an email OTP.`,
      );
    } catch (err) {
      setError(err);
    } finally {
      await qc.invalidateQueries({ queryKey: adminKeys.admins });
    }
  });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Add admin
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add an admin" locked={adding}>
        <Note>
          The new admin can approve payments, pay withdrawals and change settings. Every action is saved with
          their name. Their login needs an OTP sent to this email.
        </Note>
        <TextField label="Full name" value={f.full_name} onChange={set('full_name')} error={errs.full_name} />
        <TextField
          label="Mobile number (for login)"
          inputMode="numeric"
          value={f.mobile}
          onChange={set('mobile')}
          error={errs.mobile}
        />
        <TextField
          label="Email (OTP goes here)"
          type="email"
          autoCapitalize="none"
          value={f.email}
          onChange={set('email')}
          error={errs.email}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          help="At least 8 characters, with letters and numbers"
          value={f.password}
          onChange={set('password')}
          error={errs.password}
        />
        {error ? <ErrorBox error={error} /> : null}
        <Button busy={adding} onClick={add}>
          Add admin
        </Button>
      </Sheet>
    </>
  );
}

function StatusButton({ a, onDone }: { a: Account; onDone: (msg: string) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [reasonErr, setReasonErr] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const blocked = a.status === 'blocked';
  const action = blocked ? 'unblock' : 'block';

  const [go, busy] = useSingleFlight(async () => {
    setError(null);
    setReasonErr(remark.trim().length < 3 ? 'Write the reason (at least 3 letters).' : null);
    if (remark.trim().length < 3) return;
    try {
      await adminApi.setAdminStatus(a.user_code, action, remark.trim());
      setOpen(false);
      setRemark('');
      onDone(
        `${a.full_name}: ${blocked ? 'unblocked, can log in again' : 'blocked, logged out everywhere'}.`,
      );
    } catch (e) {
      setError(e);
    } finally {
      await qc.invalidateQueries({ queryKey: adminKeys.admins });
    }
  });

  return (
    <>
      <Button size="sm" variant={blocked ? 'ghost' : 'danger'} onClick={() => setOpen(true)}>
        {blocked ? 'Unblock' : 'Block'}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`${blocked ? 'Unblock' : 'Block'} ${a.full_name}`}
        locked={busy}
      >
        <Note tone={blocked ? 'info' : 'warn'}>
          {blocked
            ? 'This admin can log in again (with an email OTP).'
            : 'This admin is logged out everywhere at once and cannot log in until you unblock them.'}
        </Note>
        <TextAreaField
          label="Reason (saved with your name)"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          error={reasonErr}
        />
        {error ? <ErrorBox error={error} /> : null}
        <Button variant={blocked ? 'primary' : 'danger'} busy={busy} onClick={go}>
          {blocked ? 'Unblock admin' : 'Block admin'}
        </Button>
      </Sheet>
    </>
  );
}

export default function AdminAdmins() {
  const me = useMe().data;
  const isMain = me?.user_code === MAIN_ADMIN;
  const list = useQuery({ queryKey: adminKeys.admins, queryFn: ({ signal }) => adminApi.admins(signal) });
  const [done, setDone] = useState<string | null>(null);

  return (
    <>
      <AdminTitle
        title="Admins"
        sub="Everyone who can open the admin panel"
        actions={isMain ? <AddAdmin onDone={setDone} /> : undefined}
      />
      {!isMain && me && <Note>Only the main admin ({MAIN_ADMIN}) can add, block or unblock admins.</Note>}
      {done && (
        <Note role="status" tone="info">
          {done}
        </Note>
      )}
      <Panel>
        {list.isError ? (
          <ErrorBox error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data ? (
          <SkeletonList rows={3} />
        ) : (
          <Table head={['Admin', 'Mobile', 'Email', 'Since', 'Status', '']} min={640}>
            {list.data.map((a) => (
              <tr key={a.user_code}>
                <td className={td}>
                  <b>{a.full_name}</b>
                  <small className="block text-[12.5px] text-mut">
                    {a.user_code}
                    {a.user_code === MAIN_ADMIN ? ' · main admin' : ''}
                  </small>
                </td>
                <td className={td}>{a.mobile}</td>
                <td className={td}>{a.email}</td>
                <td className={td}>{formatFullDate(a.created_at)}</td>
                <td className={td}>
                  {a.status === 'blocked' ? <Chip tone="bad">Blocked</Chip> : <Chip tone="ok">Active</Chip>}
                </td>
                <td className={td}>
                  {isMain && a.user_code !== MAIN_ADMIN ? <StatusButton a={a} onDone={setDone} /> : null}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}
