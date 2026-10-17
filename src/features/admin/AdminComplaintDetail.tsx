import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { complaintsApi, type ComplaintStatus } from '@/api/complaints';
import { Button, Chip, ErrorBox, KeyValue, Note, SkeletonList, TextAreaField } from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { cx } from '@/lib/cx';
import { ChatThread } from '@/features/complaints/ChatThread';
import { chatOpen, label, timeline, tone } from '@/features/complaints/complaintText';
import { AdminTitle, Panel } from './AdminParts';
import { Receipt } from './Receipt';
import { nextStatuses } from './adminText';

// I3 "Complaint details": everything the member filled, the proofs, change the status, and the chat.

type Fields = Record<string, unknown>;
const txt = (v: unknown) => (v === undefined || v === null || v === '' ? '–' : String(v));

function Facts({ rows }: { rows: [string, unknown][] }) {
  return (
    <div className="flex flex-col">
      {rows.map(([k, v]) => (
        <KeyValue key={k} k={k}>
          {txt(v)}
        </KeyValue>
      ))}
    </div>
  );
}

function StatusBox({ id, status, remarks }: { id: number; status: string; remarks: string | null }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(remarks ?? '');
  const [noteErr, setNoteErr] = useState<string | undefined>();
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  const moves = nextStatuses(status);

  const [move, moving] = useSingleFlight(async (to: ComplaintStatus) => {
    setError(null);
    setDone(null);
    if (to === 'Rejected' && note.trim().length < 3) {
      setNoteErr('Write why it is rejected. The member sees this.');
      return;
    }
    setNoteErr(undefined);
    try {
      await complaintsApi.setStatus(id, to, note.trim() || undefined);
      setDone(`Status changed to "${label(to)}".`);
    } catch (e) {
      setError(e);
    } finally {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['complaints'] }),
        qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ]);
    }
  });

  return (
    <Panel title="Change status">
      {status !== 'Rejected' && (
        <ol className="m-0 flex list-none flex-wrap items-center gap-3 p-0 text-[13.5px]">
          {timeline(status).map((t) => (
            <li key={t.label} className={cx('font-semibold', t.state === 'todo' ? 'text-mut' : 'text-g')}>
              {t.state === 'done' ? '✓' : t.state === 'now' ? '●' : '○'} {t.label}
            </li>
          ))}
        </ol>
      )}
      {moves.length === 0 ? (
        <span className="text-[13px] text-mut">
          This complaint is {label(status).toLowerCase()}. The status cannot change any more.
        </span>
      ) : (
        <>
          <TextAreaField
            label="Note for the member (needed to reject)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            error={noteErr}
          />
          <div className="flex flex-wrap gap-2">
            {moves.map((m) => (
              <Button
                key={m.to}
                size="sm"
                variant={m.kind === 'main' ? 'primary' : m.kind === 'bad' ? 'danger' : 'ghost'}
                disabled={moving}
                onClick={() => move(m.to)}
              >
                {m.text}
              </Button>
            ))}
          </div>
        </>
      )}
      {done && (
        <Note role="status" tone="info">
          {done}
        </Note>
      )}
      {error ? <ErrorBox error={error} /> : null}
    </Panel>
  );
}

export default function AdminComplaintDetail() {
  const { id: idText = '' } = useParams();
  const id = Number(idText);
  const qc = useQueryClient();
  const c = useQuery({
    queryKey: ['complaints', 'detail', id],
    queryFn: ({ signal }) => complaintsApi.detail(id, signal),
    enabled: Number.isInteger(id) && id > 0,
  });
  const d = c.data;
  const inc = (d?.incident ?? {}) as Fields;
  const sus = (d?.suspect ?? {}) as Fields;
  const you = (d?.complainant ?? {}) as Fields;
  const refresh = () =>
    Promise.all([c.refetch(), qc.invalidateQueries({ queryKey: ['complaints', 'list'] })]);

  if (!Number.isInteger(id) || id <= 0) return <Note tone="bad">This complaint link is wrong.</Note>;

  return (
    <>
      <nav className="text-[13.5px] text-mut">
        <Link to="/admin/complaints">Complaints</Link> › {d?.complaint_no ?? '…'}
      </nav>
      {c.isError ? (
        <ErrorBox error={c.error} onRetry={() => c.refetch()} />
      ) : !d ? (
        <SkeletonList rows={5} />
      ) : (
        <>
          <AdminTitle
            title={[d.category, inc.amount ? `${formatMoney(Number(inc.amount))} lost` : null]
              .filter(Boolean)
              .join(' · ')}
            sub={`${d.complaint_no} · ${d.full_name} (${d.user_code}) · ${d.mobile} · filed on ${formatDay(d.created_at)}`}
            actions={<Chip tone={tone(d.status)}>{label(d.status)}</Chip>}
          />
          <div className="grid grid-cols-1 gap-[18px] desk:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-[18px]">
              <Panel title="What happened">
                <Facts
                  rows={[
                    ['Type', d.category],
                    [
                      'When',
                      [inc.date ? formatDay(String(inc.date)) : null, inc.time].filter(Boolean).join(' · '),
                    ],
                    ['Reported late?', inc.late === true ? 'Yes' : inc.late === false ? 'No' : null],
                    ['ID or link', inc.where],
                    ['Money lost', inc.amount ? formatMoney(Number(inc.amount)) : null],
                  ]}
                />
                {typeof inc.detail === 'string' && (
                  <p className="m-0 text-sm whitespace-pre-wrap">{inc.detail}</p>
                )}
                <span className="text-[13px] text-mut">
                  Share with agencies: <b>{d.share_with_agencies ? 'Yes' : 'No'}</b>
                </span>
                {d.evidence.length === 0 ? (
                  <span className="text-[13px] text-mut">No proof added.</span>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 desk:grid-cols-2">
                    {d.evidence.map((p, i) => (
                      <Receipt key={p} path={p} label={`Proof ${i + 1}`} />
                    ))}
                  </div>
                )}
              </Panel>
              <Panel title="Person who did it">
                <Facts
                  rows={[
                    ['Name', sus.name || 'Not known'],
                    ['Mobile', sus.mobile],
                    ['Email', sus.email],
                    ['Relation', sus.relation],
                  ]}
                />
              </Panel>
              <Panel title="Person filing the complaint">
                <Facts
                  rows={[
                    ['Name', you.name],
                    ["Father's / husband's name", you.father],
                    ['Address', you.address],
                    ['Work', you.work],
                    ['Police station', you.police_station],
                  ]}
                />
              </Panel>
            </div>
            <div className="flex min-w-0 flex-col gap-[18px]">
              <StatusBox key={d.id} id={d.id} status={d.status} remarks={d.remarks} />
              <Panel title="Chat">
                <ChatThread
                  id={d.id}
                  open={chatOpen(d.status)}
                  emptyText="No messages yet. Write to the member here."
                  onChange={refresh}
                  bordered
                />
              </Panel>
            </div>
          </div>
        </>
      )}
    </>
  );
}
