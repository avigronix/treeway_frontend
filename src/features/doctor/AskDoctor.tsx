import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { doctorApi, doctorKeys, type MemberDoctorRequest, type Prescription } from '@/api/doctor';
import {
  Button,
  Card,
  Chip,
  ErrorBox,
  FilePicker,
  Money,
  Note,
  SkeletonList,
  TextAreaField,
  TextField,
} from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { MemberPage } from '@/features/member/MemberPage';
import { cart, useMemberCart } from '@/features/shop/cart';
import { ageError } from './doctorText';
import { HealthFile } from './HealthFile';

// D5 "Ask a doctor": the problem + the age (years, 1-120; no date of birth since 16 Oct) + up to 5 photos /
// reports; my requests with the prescription (BAMS no., medicines, advice) and "Order this medicine" (its shop
// products go to the cart, linked to it).
const MAX_FILES = 5;

function OrderMedicine({ p }: { p: Prescription }) {
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  const [note, setNote] = useState<string | null>(null);
  const [go, busy] = useSingleFlight(async () => {
    setError(null);
    setNote(null);
    try {
      const c = await doctorApi.cart(p.id);
      const ok = c.items.filter((i) => i.in_stock);
      if (!ok.length) {
        setNote('These medicines are not in stock in the shop right now.');
        return;
      }
      cart.fromPrescription(
        c.prescription_id,
        ok.map((i) => ({ id: i.product_id, name: i.name, mrp: i.mrp, image: null, qty: i.qty })),
      );
      navigate('/shop/checkout');
    } catch (e) {
      setError(e);
    }
  });
  if (!p.medicines.some((m) => m.in_shop)) return null;
  return (
    <>
      <Button size="md" busy={busy} onClick={go}>
        Order this medicine
      </Button>
      {note && <Note tone="warn">{note}</Note>}
      {error ? <ErrorBox error={error} /> : null}
    </>
  );
}

function RequestCard({ r }: { r: MemberDoctorRequest }) {
  return (
    <Card className="gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <b className="line-clamp-2 text-sm">{r.problem}</b>
          <small className="text-xs text-mut">{formatDay(r.created_at)}</small>
        </span>
        {r.status === 'answered' ? <Chip tone="ok">Medicine written</Chip> : <Chip tone="wait">Waiting</Chip>}
      </div>
      {r.files.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {r.files.map((f, i) => (
            <HealthFile key={f} path={f} label={`Your file ${i + 1}`} />
          ))}
        </div>
      )}
      {r.status === 'waiting' && <span className="text-xs text-mut">The doctor has not seen it yet.</span>}
      {r.prescriptions.map((p) => (
        <div key={p.id} className="flex flex-col gap-1.5 rounded-xl bg-tint p-3 text-[13px]">
          <b>
            {p.doctor_name} (BAMS) · Reg. no. {p.bams_reg_no}
          </b>
          {p.medicines.length > 0 && (
            <ul className="m-0 flex list-disc flex-col gap-0.5 pl-4">
              {p.medicines.map((m, i) => (
                <li key={i}>
                  {m.name} · {m.dosage} · {m.days} days
                  {m.in_shop && m.mrp != null ? (
                    <small className="text-mut">
                      {' '}
                      (shop <Money value={m.mrp} />
                      {m.in_stock ? '' : ', out of stock'})
                    </small>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {p.advice && <span className="whitespace-pre-wrap">{p.advice}</span>}
          <small className="text-mut">{formatDay(p.created_at)}</small>
          <OrderMedicine p={p} />
        </div>
      ))}
    </Card>
  );
}

export default function AskDoctor() {
  useMemberCart(); // the member's own cart: "Order this medicine" fills it
  const qc = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: doctorKeys.mine,
    queryFn: ({ pageParam, signal }) => doctorApi.myRequests(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  const first = list.data?.pages[0];
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const full = !!first && first.open >= first.max_open;
  const [problem, setProblem] = useState('');
  const [problemErr, setProblemErr] = useState<string | null>(null);
  const [age, setAge] = useState('');
  const [ageErr, setAgeErr] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);

  const [send, sending] = useSingleFlight(async () => {
    setError(null);
    setDone(null);
    const t = problem.trim();
    if (t.length < 10 || t.length > 2000) {
      setProblemErr('Tell the doctor about the problem (10 to 2000 letters).');
      return;
    }
    setProblemErr(null);
    const years = ageError(age);
    setAgeErr(years);
    if (years) return;
    try {
      const r = await doctorApi.ask(t, Number(age.trim()), files);
      setProblem(''); // the age stays: the next question is usually for the same person
      setFiles([]);
      setDone(`Sent to the doctor. ${r.reply_note}`);
    } catch (e) {
      setError(e);
    } finally {
      await qc.invalidateQueries({ queryKey: doctorKeys.mine });
    }
  });

  return (
    <MemberPage
      narrow
      title="Ask a doctor"
      subtitle="Ayurvedic doctor · completely free"
      back="/more"
      className="gap-3"
    >
      <Card className="gap-2.5">
        <b className="text-sm">Tell us your problem</b>
        {full ? (
          <Note>
            You already have {first.max_open} questions waiting for the doctor. You can ask again after a
            reply.
          </Note>
        ) : (
          <>
            <TextAreaField
              label="Your problem"
              placeholder="For example: headache for 3 days, worse in the evening"
              value={problem}
              onChange={(e) => (setProblem(e.target.value), setDone(null))}
              error={problemErr}
            />
            <TextField
              label="Age (years)"
              inputMode="numeric"
              maxLength={3}
              fieldClassName="max-w-[140px]"
              value={age}
              onChange={(e) => (setAge(e.target.value.replace(/\D/g, '')), setAgeErr(null))}
              error={ageErr}
            />
            {files.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">✓ {f.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={sending}
                      onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {files.length < MAX_FILES && (
              <FilePicker
                key={files.length}
                label={`Report or photo ${files.length + 1} (optional)`}
                file={null}
                error={fileErr}
                disabled={sending}
                onChange={(f, problemText) => {
                  setFileErr(problemText);
                  if (f && !problemText) setFiles((x) => [...x, f].slice(0, MAX_FILES));
                }}
              />
            )}
            {error ? <ErrorBox error={error} /> : null}
            <Button busy={sending} onClick={send}>
              Send to doctor
            </Button>
          </>
        )}
        {done && (
          <Note role="status" tone="info">
            {done}
          </Note>
        )}
        {first && <span className="text-xs text-mut">{first.reply_note}</span>}
      </Card>
      <h2 className="m-0 text-[15px] font-bold">My requests</h2>
      {list.isError ? (
        <ErrorBox error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <SkeletonList rows={2} />
      ) : rows.length === 0 ? (
        <Note>No questions yet.</Note>
      ) : (
        rows.map((r) => <RequestCard key={r.id} r={r} />)
      )}
      {list.hasNextPage && (
        <Button variant="ghost" size="md" busy={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
          Show more
        </Button>
      )}
    </MemberPage>
  );
}
