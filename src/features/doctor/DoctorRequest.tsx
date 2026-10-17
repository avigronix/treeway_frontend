import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doctorApi, doctorKeys } from '@/api/doctor';
import { Button, Card, Chip, ErrorBox, Note, SkeletonList, TextAreaField, TextField } from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { useDebounced } from '@/lib/useDebounced';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { HealthFile } from './HealthFile';
import { checkPrescription, type MedLine } from './doctorText';

// The doctor opens one request: name, age, state, problem, files (nothing else of the member), the old
// prescriptions, and writes a new one (shop medicines or written names, dosage, days, advice). A sent
// prescription is never changed: a second one is a new prescription.

const emptyLine = (): MedLine => ({ product_id: null, name: '', dosage: '', days: '' });

function MedicineRow({
  m,
  n,
  errs,
  onChange,
  onRemove,
}: {
  m: MedLine;
  n: number;
  errs?: Partial<Record<keyof MedLine, string>>;
  onChange: (m: MedLine) => void;
  onRemove: () => void;
}) {
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const found = useQuery({
    queryKey: ['doctor', 'products', q],
    queryFn: ({ signal }) => doctorApi.products(q, signal),
    enabled: q.length >= 2 && !m.product_id,
  });
  return (
    <fieldset className="m-0 flex flex-col gap-2 rounded-xl border border-line p-3">
      <legend className="px-1 text-[13px] font-bold">Medicine {n}</legend>
      {m.product_id ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>
            <Chip tone="ok">Shop</Chip> {m.name}
          </span>
          <Button size="sm" variant="ghost" onClick={() => onChange({ ...m, product_id: null, name: '' })}>
            Change
          </Button>
        </div>
      ) : (
        <>
          <TextField
            label="Medicine name (or search the shop)"
            value={m.name || search}
            onChange={(e) => (setSearch(e.target.value), onChange({ ...m, name: e.target.value }))}
            error={errs?.name}
          />
          {found.data && found.data.rows.length > 0 && (
            <ul
              className="m-0 flex list-none flex-col gap-1 p-0"
              aria-label={`Shop matches for medicine ${n}`}
            >
              {found.data.rows.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => (setSearch(''), onChange({ ...m, product_id: p.id, name: p.name }))}
                  >
                    {p.name}
                    {p.in_stock ? '' : ' (out of stock)'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <TextField
        label="How to take it"
        placeholder="morning and evening, after food"
        value={m.dosage}
        onChange={(e) => onChange({ ...m, dosage: e.target.value })}
        error={errs?.dosage}
      />
      <TextField
        label="Days"
        inputMode="numeric"
        value={m.days}
        onChange={(e) => onChange({ ...m, days: e.target.value.replace(/\D/g, '') })}
        error={errs?.days}
      />
      <Button size="sm" variant="danger" onClick={onRemove}>
        Remove medicine {n}
      </Button>
    </fieldset>
  );
}

export function DoctorRequest({ id, onBack }: { id: number; onBack: () => void }) {
  const qc = useQueryClient();
  const r = useQuery({
    queryKey: doctorKeys.request(id),
    queryFn: ({ signal }) => doctorApi.request(id, signal),
  });
  const [lines, setLines] = useState<MedLine[]>([]);
  const [advice, setAdvice] = useState('');
  const [errs, setErrs] = useState<ReturnType<typeof checkPrescription> | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);

  const next = () => {
    const e = checkPrescription(lines, advice);
    setErrs(e);
    if (e.ok) setConfirm(true);
  };

  const [send, sending] = useSingleFlight(async () => {
    setError(null);
    try {
      await doctorApi.prescribe(id, {
        advice: advice.trim() || null,
        medicines: lines.map((m) => ({
          product_id: m.product_id,
          name: m.product_id ? null : m.name.trim(),
          dosage: m.dosage.trim(),
          days: Number(m.days),
        })),
      });
      setLines([]);
      setAdvice('');
      setConfirm(false);
      setDone('Prescription sent to the member.');
    } catch (e) {
      setConfirm(false);
      setError(e);
    } finally {
      await Promise.all([
        qc.invalidateQueries({ queryKey: doctorKeys.request(id) }),
        qc.invalidateQueries({ queryKey: ['doctor', 'inbox'] }),
      ]);
    }
  });

  if (r.isError)
    return (
      <div className="flex flex-col gap-3">
        <Button size="sm" variant="ghost" className="self-start" onClick={onBack}>
          ‹ All requests
        </Button>
        <ErrorBox error={r.error} onRetry={() => r.refetch()} />
      </div>
    );
  if (!r.data) return <SkeletonList rows={4} />;
  const d = r.data;
  return (
    <div className="flex flex-col gap-3">
      <Button size="sm" variant="ghost" className="self-start" onClick={onBack}>
        ‹ All requests
      </Button>
      <Card className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <b>
            {d.member_name}
            {d.age ? ` · ${d.age} years` : ''}
            {d.state ? ` · ${d.state}` : ''}
          </b>
          {d.status === 'waiting' ? <Chip tone="wait">Waiting</Chip> : <Chip tone="ok">Answered</Chip>}
        </div>
        <span className="text-xs text-mut">{formatWhen(d.created_at)}</span>
        <p className="m-0 text-sm whitespace-pre-wrap">"{d.problem}"</p>
        {d.files.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {d.files.map((f, i) => (
              <HealthFile key={f} path={f} label={`Member's file ${i + 1}`} />
            ))}
          </div>
        )}
      </Card>
      {d.prescriptions.map((p) => (
        <Card key={p.id} className="gap-1 text-[13px]">
          <b>
            Sent {formatWhen(p.created_at)} · Reg. no. {p.bams_reg_no}
          </b>
          {p.medicines.map((m, i) => (
            <span key={i}>
              {m.name} · {m.dosage} · {m.days} days
            </span>
          ))}
          {p.advice && <span className="whitespace-pre-wrap text-mut">{p.advice}</span>}
        </Card>
      ))}
      {done && (
        <Note role="status" tone="info">
          {done}
        </Note>
      )}
      <Card className="gap-2.5">
        <b className="text-sm">{d.prescriptions.length ? 'Write another prescription' : 'Write medicine'}</b>
        {lines.map((m, i) => (
          <MedicineRow
            key={i}
            n={i + 1}
            m={m}
            errs={errs?.lines[i]}
            onChange={(x) => (setLines((ls) => ls.map((l, j) => (j === i ? x : l))), setConfirm(false))}
            onRemove={() => (setLines((ls) => ls.filter((_, j) => j !== i)), setConfirm(false))}
          />
        ))}
        {lines.length < 20 && (
          <Button size="sm" variant="dash" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
            + Add medicine
          </Button>
        )}
        <TextAreaField
          label="Advice and things to avoid"
          value={advice}
          onChange={(e) => (setAdvice(e.target.value), setConfirm(false))}
        />
        {errs?.form && <Note tone="warn">{errs.form}</Note>}
        {error ? <ErrorBox error={error} /> : null}
        {!confirm ? (
          <Button onClick={next}>Send prescription</Button>
        ) : (
          <>
            <Note tone="warn">
              Send it to {d.member_name}? A sent prescription cannot be changed (you can write a new one).
            </Note>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="ghost" disabled={sending} onClick={() => setConfirm(false)}>
                Back
              </Button>
              <Button busy={sending} onClick={send}>
                Yes, send
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
