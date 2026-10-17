import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { complaintsApi, type ComplaintBody, type ComplaintDetail } from '@/api/complaints';
import { useMe } from '@/auth/session';
import {
  Button,
  Card,
  ErrorBox,
  FilePicker,
  Note,
  Pills,
  SelectField,
  SkeletonList,
  TextAreaField,
  TextField,
} from '@/components/ui';
import { istDayKey } from '@/lib/dates';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { MemberPage } from '@/features/member/MemberPage';

// E2 "New complaint", 4 steps: 1 what happened · 2 proof (photos / PDF, up to 5) · 3 the person who did it
// (optional) · 4 your details. A draft is saved on "Next" of step 1, so proof can be attached to it; "Save draft"
// works on every step and a draft opens again from the list (?draft=<id>).

type Txt = Record<string, string>;
const MAX_FILES = 5;
const STEPS = ['What happened', 'Proof', 'Person who did it', 'Your details'];

function Form({ draft }: { draft: ComplaintDetail | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useMe().data;
  const cats = useQuery({
    queryKey: ['complaints', 'categories'],
    queryFn: ({ signal }) => complaintsApi.categories(signal),
  });
  const [id, setId] = useState<number | null>(draft?.id ?? null);
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState(draft ? String(draft.category_id) : '');
  const [inc, setInc] = useState<Txt>(() => {
    const i = { ...(draft?.incident as Record<string, unknown>) };
    // The API keeps "reporting late?" as true / false; the form as 'yes' / 'no' ('' = not answered).
    if (typeof i.late === 'boolean') i.late = i.late ? 'yes' : 'no';
    return Object.fromEntries(
      Object.entries(i).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)]),
    );
  });
  const [sus, setSus] = useState<Txt>(() => ({ ...(draft?.suspect as Txt) }));
  const [you, setYou] = useState<Txt>(() => ({ name: me?.full_name ?? '', ...(draft?.complainant as Txt) }));
  const [share, setShare] = useState(draft?.share_with_agencies ?? false);
  const [files, setFiles] = useState<string[]>(draft?.evidence ?? []);
  const [errs, setErrs] = useState<Txt>({});
  const [error, setError] = useState<unknown>(null);
  const [note, setNote] = useState<string | null>(null);

  const body = (submit: boolean): ComplaintBody => ({
    category_id: Number(cat),
    incident: { ...inc, late: inc.late ? inc.late === 'yes' : null },
    suspect: sus,
    complainant: you,
    share_with_agencies: share,
    submit,
  });
  const check1 = () => {
    const e: Txt = {};
    if (!cat) e.cat = 'Choose the type of complaint.';
    if ((inc.detail ?? '').trim().length < 10) e.detail = 'Tell us what happened (at least 10 letters).';
    if (inc.amount && !/^\d{1,9}(\.\d{1,2})?$/.test(inc.amount))
      e.amount = 'Enter the amount in ₹, or leave it empty.';
    setErrs(e);
    return !Object.keys(e).length;
  };

  /** Saves (creating the draft the first time). Returns the id, or null on error. */
  const save = async (submit: boolean): Promise<number | null> => {
    setError(null);
    try {
      if (id === null) {
        const r = await complaintsApi.create(body(submit));
        setId(r.id);
        return r.id;
      }
      await complaintsApi.saveDraft(id, body(submit));
      return id;
    } catch (e) {
      setError(e);
      return null;
    } finally {
      await qc.invalidateQueries({ queryKey: ['complaints'] });
    }
  };

  const [next, going] = useSingleFlight(async () => {
    setNote(null);
    if (step === 0 && !check1()) return;
    if (step === 3) {
      if ((you.name ?? '').trim().length < 2) {
        setErrs({ name: 'Enter your name.' });
        return;
      }
      if (!check1()) return setStep(0);
      const cid = await save(true);
      if (cid !== null)
        navigate(`/complaints/${cid}`, {
          replace: true,
          state: { msg: 'Complaint sent. Our team answers here.' },
        });
      return;
    }
    if ((await save(false)) !== null) setStep(step + 1);
  });

  const [saveDraft, saving] = useSingleFlight(async () => {
    setNote(null);
    if (!cat) return setErrs({ cat: 'Choose the type of complaint first.' });
    if ((await save(false)) !== null) setNote('Draft saved. You can finish it later from My complaints.');
  });

  const [upload, uploading] = useSingleFlight(async (f: File) => {
    if (id === null) return;
    setError(null);
    try {
      const r = await complaintsApi.addEvidence(id, f);
      setFiles((x) => [...x, r.path]);
    } catch (e) {
      setError(e);
    }
  });

  const set = (fn: (u: (x: Txt) => Txt) => void, k: string) => (e: { target: { value: string } }) =>
    fn((x) => ({ ...x, [k]: e.target.value }));

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold">
          Step {step + 1} of 4 · {STEPS[step]}
        </span>
        <Button size="sm" variant="ghost" busy={saving} onClick={saveDraft}>
          Save draft
        </Button>
      </div>
      <Card className="gap-3">
        {step === 0 && (
          <>
            <SelectField
              label="Type of complaint"
              placeholder="Choose"
              options={(cats.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              error={errs.cat}
            />
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label="Date it happened"
                type="date"
                max={istDayKey()}
                value={inc.date ?? ''}
                onChange={set(setInc, 'date')}
              />
              <TextField label="Time" type="time" value={inc.time ?? ''} onChange={set(setInc, 'time')} />
            </div>
            <span className="text-[13px] font-semibold text-lab">Are you reporting it late?</span>
            <Pills
              label="Reporting late"
              value={inc.late ?? ''}
              onChange={(v) => setInc((x) => ({ ...x, late: v }))}
              items={[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
            <TextField
              label="Where did it happen? (ID, link or number)"
              placeholder="For example: UPI ID, website link, mobile number"
              value={inc.where ?? ''}
              onChange={set(setInc, 'where')}
            />
            <TextField
              label="Money lost (₹), if any"
              inputMode="decimal"
              value={inc.amount ?? ''}
              onChange={set(setInc, 'amount')}
              error={errs.amount}
            />
            <TextAreaField
              label="Tell us everything"
              value={inc.detail ?? ''}
              onChange={set(setInc, 'detail')}
              error={errs.detail}
            />
          </>
        )}
        {step === 1 && (
          <>
            <span className="text-sm">Screenshots, photos or a PDF (up to {MAX_FILES}).</span>
            {files.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
                {files.map((p, i) => (
                  <li key={p}>✓ Proof {i + 1} added</li>
                ))}
              </ul>
            )}
            {files.length < MAX_FILES ? (
              <FilePicker
                label={`Add proof ${files.length + 1}`}
                file={null}
                disabled={uploading}
                error={null}
                onChange={(f, problem) => (problem ? setError(new Error(problem)) : f && upload(f))}
              />
            ) : (
              <Note>{MAX_FILES} files added. That is the most.</Note>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={share}
                onChange={(e) => setShare(e.target.checked)}
                className="size-5"
              />
              Share with agencies (cyber cell / police) if needed
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <Note>Optional. Fill what you know.</Note>
            <TextField label="Name" value={sus.name ?? ''} onChange={set(setSus, 'name')} />
            <TextField
              label="Mobile"
              inputMode="tel"
              value={sus.mobile ?? ''}
              onChange={set(setSus, 'mobile')}
            />
            <TextField label="Email" value={sus.email ?? ''} onChange={set(setSus, 'email')} />
            <TextField
              label="Relation with you"
              value={sus.relation ?? ''}
              onChange={set(setSus, 'relation')}
            />
          </>
        )}
        {step === 3 && (
          <>
            <TextField
              label="Your name"
              value={you.name ?? ''}
              onChange={set(setYou, 'name')}
              error={errs.name}
            />
            <TextField
              label="Father's / husband's name"
              value={you.father ?? ''}
              onChange={set(setYou, 'father')}
            />
            <TextAreaField
              label="Address"
              value={you.address ?? ''}
              onChange={set(setYou, 'address')}
              className="h-[72px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Work" value={you.work ?? ''} onChange={set(setYou, 'work')} />
              <TextField
                label="Police station"
                value={you.police_station ?? ''}
                onChange={set(setYou, 'police_station')}
              />
            </div>
          </>
        )}
      </Card>
      {error ? <ErrorBox error={error} /> : null}
      {note && (
        <Note role="status" tone="info">
          {note}
        </Note>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="ghost" disabled={step === 0 || going} onClick={() => setStep((s) => s - 1)}>
          Back
        </Button>
        <Button busy={going} onClick={next}>
          {step === 3 ? 'Submit complaint' : 'Next'}
        </Button>
      </div>
    </>
  );
}

export default function ComplaintNew() {
  const [params] = useSearchParams();
  const draftId = Number(params.get('draft')) || null;
  const d = useQuery({
    queryKey: ['complaints', 'detail', draftId],
    queryFn: ({ signal }) => complaintsApi.detail(draftId!, signal),
    enabled: !!draftId,
  });
  return (
    <MemberPage narrow title="New complaint" subtitle="Our team reads every complaint" back="/complaints">
      {draftId && d.isError ? (
        <ErrorBox error={d.error} onRetry={() => d.refetch()} />
      ) : draftId && !d.data ? (
        <SkeletonList rows={4} />
      ) : (
        <Form key={draftId ?? 'new'} draft={d.data ?? null} />
      )}
    </MemberPage>
  );
}
