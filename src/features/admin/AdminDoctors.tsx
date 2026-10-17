import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Schema } from '@/api/schema';
import {
  Button,
  Chip,
  ErrorBox,
  Note,
  PasswordField,
  SelectField,
  Sheet,
  SkeletonList,
  Tabs,
  TextAreaField,
  TextField,
  Empty,
} from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { usePageClamp } from '@/lib/usePageClamp';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { HealthFile } from '@/features/doctor/HealthFile';
import { AdminTitle, Kpi, Kpis, Pager, Panel, Table, td } from './AdminParts';
import { checkDoctor } from './adminText';

// J2 "Doctor requests": every request (waiting > 24 h apart), move one to another doctor, the doctors
// (add, block / unblock, move a blocked doctor's waiting requests). Doctors see only their own screen.

type Doc = Schema<'AdminDoctor'>;
type Req = Schema<'AdminDoctorRequest-Output'>;
type Tab = 'waiting' | 'overdue' | 'answered';

const doctorsApi = {
  list: (signal?: AbortSignal) => api<Doc[]>('/admin/doctors', { signal }),
  add: (b: Schema<'DoctorCreateModel'>) => api<Schema<'UserCodeOnly'>>('/admin/doctors', { json: b }),
  status: (code: string, action: 'block' | 'unblock', remark: string) =>
    api<unknown>(`/admin/doctors/${code}/status`, { json: { action, remark } }),
  reassign: (code: string, to: string | null, remark: string) =>
    api<Schema<'Moved'>>(`/admin/doctors/${code}/reassign-pending`, { json: { to_doctor: to, remark } }),
  requests: (tab: Tab, page: number, signal?: AbortSignal) =>
    api<Schema<'AdminDoctorPage-Output'>>('/admin/doctor-requests', {
      query: {
        status: tab === 'answered' ? 'answered' : 'waiting',
        overdue: tab === 'overdue' ? 'true' : undefined,
        page,
        limit: 20,
      },
      signal,
    }),
  assign: (id: number, doctor: string, remark: string) =>
    api<unknown>(`/admin/doctor-requests/${id}/assign`, {
      json: { doctor_code: doctor, remark: remark || null },
    }),
};

function useDone() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['admin', 'doctors'] });
}

function AddDoctor({ onDone }: { onDone: (m: string) => void }) {
  const done = useDone();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: '', mobile: '', email: '', password: '', bams_reg_no: '' });
  const [errs, setErrs] = useState<Partial<ReturnType<typeof checkDoctor>>>({});
  const [error, setError] = useState<unknown>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [save, saving] = useSingleFlight(async () => {
    const e = checkDoctor(f);
    setErrs(e);
    if (Object.values(e).some(Boolean)) return;
    setError(null);
    try {
      const r = await doctorsApi.add({
        ...f,
        full_name: f.full_name.trim(),
        email: f.email.trim().toLowerCase(),
        bams_reg_no: f.bams_reg_no.trim(),
      });
      setOpen(false);
      setF({ full_name: '', mobile: '', email: '', password: '', bams_reg_no: '' });
      onDone(`Doctor added: ${r.user_code}. They log in with the mobile, this password and an email OTP.`);
    } catch (err) {
      setError(err);
    } finally {
      await done();
    }
  });
  return (
    <>
      <Button size="sm" variant="dash" onClick={() => setOpen(true)}>
        + Add doctor
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add doctor" locked={saving}>
        <TextField
          label="Full name"
          value={f.full_name}
          onChange={(e) => set('full_name')(e.target.value)}
          error={errs.full_name}
        />
        <TextField
          label="BAMS registration no."
          value={f.bams_reg_no}
          onChange={(e) => set('bams_reg_no')(e.target.value)}
          error={errs.bams_reg_no}
        />
        <TextField
          label="Mobile"
          inputMode="numeric"
          maxLength={10}
          value={f.mobile}
          onChange={(e) => set('mobile')(e.target.value.replace(/\D/g, ''))}
          error={errs.mobile}
        />
        <TextField
          label="Email (for the login OTP)"
          type="email"
          value={f.email}
          onChange={(e) => set('email')(e.target.value)}
          error={errs.email}
        />
        <PasswordField
          label="Password"
          value={f.password}
          onChange={(e) => set('password')(e.target.value)}
          error={errs.password}
        />
        <Note>The registration number is printed on every prescription.</Note>
        {error ? <ErrorBox error={error} /> : null}
        <Button busy={saving} onClick={save}>
          Add doctor
        </Button>
      </Sheet>
    </>
  );
}

function DoctorActions({ d, doctors, onDone }: { d: Doc; doctors: Doc[]; onDone: (m: string) => void }) {
  const done = useDone();
  const [open, setOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [to, setTo] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const others = doctors.filter((x) => x.user_code !== d.user_code && x.status === 'active');
  const [act, busy] = useSingleFlight(async (what: 'block' | 'unblock' | 'move') => {
    setErr(null);
    setError(null);
    if (remark.trim().length < 3) {
      setErr('Write the reason (at least 3 letters).');
      return;
    }
    try {
      if (what === 'move') {
        const r = await doctorsApi.reassign(d.user_code, to || null, remark.trim());
        onDone(`${r.moved} waiting request(s) of ${d.full_name} moved.`);
      } else {
        await doctorsApi.status(d.user_code, what, remark.trim());
        onDone(`${d.full_name} ${what === 'block' ? 'blocked (logged out now)' : 'unblocked'}.`);
      }
      setOpen(false);
      setRemark('');
    } catch (e) {
      setError(e);
    } finally {
      await done();
    }
  });
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Manage
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={d.full_name} locked={busy}>
        <span className="text-[13px] text-mut">
          {d.user_code} · {d.mobile} · {formatCount(d.waiting)} waiting
        </span>
        <TextAreaField label="Reason (required)" value={remark} onChange={(e) => setRemark(e.target.value)} />
        {d.waiting > 0 && (
          <SelectField
            label="Move the waiting requests to"
            placeholder="Spread over the other doctors"
            options={others.map((x) => ({
              value: x.user_code,
              label: `${x.full_name} (${x.waiting} waiting)`,
            }))}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        )}
        {d.status === 'active' && d.waiting > 0 && !to && (
          <span className="text-xs text-mut">
            To spread them, block this doctor first (or choose one doctor).
          </span>
        )}
        {err && <Note tone="bad">{err}</Note>}
        {error ? <ErrorBox error={error} /> : null}
        <div className="flex flex-wrap gap-2">
          {d.status === 'active' ? (
            <Button size="sm" variant="danger" busy={busy} onClick={() => act('block')}>
              Block login
            </Button>
          ) : (
            <Button size="sm" busy={busy} onClick={() => act('unblock')}>
              Unblock
            </Button>
          )}
          {d.waiting > 0 && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => act('move')}>
              Move waiting requests
            </Button>
          )}
        </div>
      </Sheet>
    </>
  );
}

function RequestSheet({ r, doctors, onClose }: { r: Req; doctors: Doc[]; onClose: (m?: string) => void }) {
  const done = useDone();
  const [to, setTo] = useState('');
  const [remark, setRemark] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [move, busy] = useSingleFlight(async () => {
    setError(null);
    if (!to) {
      setErr('Choose the doctor.');
      return;
    }
    setErr(null);
    try {
      await doctorsApi.assign(r.id, to, remark.trim());
      onClose('Request moved to the other doctor.');
    } catch (e) {
      setError(e);
    } finally {
      await done();
    }
  });
  return (
    <Sheet open onClose={() => onClose()} title={`${r.full_name} · ${r.user_code}`} locked={busy}>
      <span className="text-xs text-mut">
        {formatWhen(r.created_at)} · {r.doctor_name ? `with ${r.doctor_name}` : 'no doctor yet'}
      </span>
      <p className="m-0 text-sm whitespace-pre-wrap">"{r.problem}"</p>
      {r.files.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {r.files.map((f, i) => (
            <HealthFile key={f} path={f} label={`File ${i + 1}`} />
          ))}
        </div>
      )}
      {r.prescriptions.map((p) => (
        <div key={p.id} className="flex flex-col gap-0.5 rounded-xl bg-tint p-2.5 text-[13px]">
          <b>
            {p.doctor_name} · Reg. no. {p.bams_reg_no} · {formatWhen(p.created_at)}
          </b>
          {p.medicines.map((m, i) => (
            <span key={i}>
              {m.name} · {m.dosage} · {m.days} days
            </span>
          ))}
          {p.advice && <span className="text-mut">{p.advice}</span>}
        </div>
      ))}
      {r.status === 'waiting' && (
        <>
          <SelectField
            label="Move to doctor"
            placeholder="Choose"
            options={doctors
              .filter((d) => d.status === 'active' && d.user_code !== r.doctor_code)
              .map((d) => ({ value: d.user_code, label: `${d.full_name} (${d.waiting} waiting)` }))}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <TextField label="Note (optional)" value={remark} onChange={(e) => setRemark(e.target.value)} />
          {err && <Note tone="bad">{err}</Note>}
          {error ? <ErrorBox error={error} /> : null}
          <Button size="md" busy={busy} onClick={move}>
            Move request
          </Button>
        </>
      )}
    </Sheet>
  );
}

export default function AdminDoctors() {
  const [tab, setTab] = useState<Tab>('waiting');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Req | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const reqs = useQuery({
    queryKey: ['admin', 'doctors', 'requests', tab, page],
    queryFn: ({ signal }) => doctorsApi.requests(tab, page, signal),
    placeholderData: (p) => p,
    refetchInterval: 60_000,
  });
  usePageClamp(page, reqs.data?.total, 20, setPage);
  const docs = useQuery({
    queryKey: ['admin', 'doctors', 'list'],
    queryFn: ({ signal }) => doctorsApi.list(signal),
  });
  const c = reqs.data?.counts;
  const doctors = docs.data ?? [];

  return (
    <>
      <AdminTitle
        title="Doctor requests"
        sub="Doctors see only their own requests in their own login"
        actions={<AddDoctor onDone={setMsg} />}
      />
      {c && (
        <Kpis>
          <Kpi label="Waiting" value={formatCount(c.waiting)} />
          <Kpi label="Waiting over 24 h" value={formatCount(c.overdue)} alert={c.overdue > 0} />
          <Kpi
            label="No doctor"
            value={formatCount(c.no_doctor)}
            alert={c.no_doctor > 0}
            small={c.no_doctor > 0 ? 'Add or unblock a doctor' : undefined}
          />
          <Kpi label="Answered" value={formatCount(c.answered)} />
        </Kpis>
      )}
      {msg && (
        <Note role="status" tone="info">
          {msg}
        </Note>
      )}
      <Tabs
        label="Requests"
        value={tab}
        onChange={(v) => (setTab(v), setPage(1))}
        className="max-w-[520px]"
        items={[
          { value: 'waiting', label: 'Waiting', count: c?.waiting },
          { value: 'overdue', label: 'Over 24 h', count: c?.overdue },
          { value: 'answered', label: 'Answered' },
        ]}
      />
      <Panel>
        {reqs.isError ? (
          <ErrorBox error={reqs.error} onRetry={() => reqs.refetch()} />
        ) : !reqs.data ? (
          <SkeletonList rows={3} />
        ) : reqs.data.rows.length === 0 ? (
          <Empty title="Nothing here." />
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col p-0">
              {reqs.data.rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-line2 py-2.5 last:border-0"
                >
                  <span className="flex min-w-0 flex-col">
                    <b className="truncate">
                      {r.full_name} · {r.problem.slice(0, 40)}
                    </b>
                    <small className="text-[12.5px] text-mut">
                      {r.user_code} · {formatWhen(r.created_at)}
                      {r.files.length
                        ? ` · ${r.files.length} file${r.files.length === 1 ? '' : 's'}`
                        : ''} · {r.doctor_name ?? 'no doctor'}
                    </small>
                  </span>
                  <span className="flex items-center gap-2">
                    {r.status === 'answered' ? (
                      <Chip tone="ok">Answered</Chip>
                    ) : (
                      <Chip tone="wait">Waiting</Chip>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => (setOpen(r), setMsg(null))}>
                      Open
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
            <Pager page={page} size={20} total={reqs.data.total} onPage={setPage} />
          </>
        )}
      </Panel>
      <Panel title="Doctors">
        {docs.isError ? (
          <ErrorBox error={docs.error} onRetry={() => docs.refetch()} />
        ) : !docs.data ? (
          <SkeletonList rows={2} />
        ) : doctors.length === 0 ? (
          <Note tone="warn">No doctor yet. Members' questions wait until you add one.</Note>
        ) : (
          <Table head={['Doctor', 'Reg. no.', 'Waiting', 'Answered this month', 'Login', '']} min={680}>
            {doctors.map((d) => (
              <tr key={d.user_code}>
                <td className={td}>
                  <b>{d.full_name}</b>
                  <small className="block text-[12.5px] text-mut">
                    {d.user_code} · {d.mobile}
                  </small>
                </td>
                <td className={td}>{d.bams_reg_no}</td>
                <td className={`${td} num`}>{formatCount(d.waiting)}</td>
                <td className={`${td} num`}>{formatCount(d.answered_this_month)}</td>
                <td className={td}>
                  {d.status === 'active' ? <Chip tone="ok">On</Chip> : <Chip tone="bad">Blocked</Chip>}
                </td>
                <td className={td}>
                  <DoctorActions d={d} doctors={doctors} onDone={setMsg} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
      {open && (
        <RequestSheet
          r={open}
          doctors={doctors}
          onClose={(m) => {
            setOpen(null);
            if (m) setMsg(m);
          }}
        />
      )}
    </>
  );
}
