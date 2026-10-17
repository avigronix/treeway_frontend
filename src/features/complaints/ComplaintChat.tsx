import { useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { complaintsApi } from '@/api/complaints';
import { Button, Card, Chip, ErrorBox, Note, SkeletonList } from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { cx } from '@/lib/cx';
import { MemberPage } from '@/features/member/MemberPage';
import { ChatThread } from './ChatThread';
import { chatOpen, label, timeline, tone } from './complaintText';

// E3 "Complaint chat": the complaint's status, a short summary and the chat with the support team.

export default function ComplaintChat() {
  const { id: idText = '' } = useParams();
  const id = Number(idText);
  const qc = useQueryClient();
  const sent = (useLocation().state as { msg?: string } | null)?.msg;
  const c = useQuery({
    queryKey: ['complaints', 'detail', id],
    queryFn: ({ signal }) => complaintsApi.detail(id, signal),
  });
  const [error, setError] = useState<unknown>(null);

  const refresh = () =>
    Promise.all([
      c.refetch(),
      qc.invalidateQueries({ queryKey: ['complaints', 'list'] }),
      qc.invalidateQueries({ queryKey: ['complaints', 'messages', id] }),
      qc.invalidateQueries({ queryKey: ['complaints', 'matrix'] }),
    ]);

  const [close, closing] = useSingleFlight(async () => {
    setError(null);
    try {
      await complaintsApi.setStatus(id, 'Closed');
    } catch (e) {
      setError(e);
    } finally {
      await refresh();
    }
  });

  const d = c.data;
  const inc = (d?.incident ?? {}) as Record<string, unknown>;
  const sus = (d?.suspect ?? {}) as Record<string, unknown>;

  return (
    <MemberPage
      narrow
      title={d?.category ?? 'Complaint'}
      subtitle={d ? `${d.complaint_no} · ${formatDay(d.created_at)}` : ' '}
      back="/complaints"
      right={d ? <Chip tone={tone(d.status)}>{label(d.status)}</Chip> : undefined}
    >
      {sent && (
        <Note role="status" tone="info">
          {sent}
        </Note>
      )}
      {c.isError ? (
        <ErrorBox error={c.error} onRetry={() => c.refetch()} />
      ) : !d ? (
        <SkeletonList rows={4} />
      ) : (
        <>
          {d.status !== 'Rejected' && (
            <ol className="m-0 flex list-none items-center justify-between gap-2 p-0 text-[12.5px]">
              {timeline(d.status).map((t) => (
                <li key={t.label} className={cx('font-semibold', t.state === 'todo' ? 'text-mut' : 'text-g')}>
                  {t.state === 'todo' ? '○' : '●'} {t.label}
                </li>
              ))}
            </ol>
          )}
          <Card className="gap-1">
            <span className="text-[13px]">
              {[
                inc.amount ? formatMoney(Number(inc.amount)) : null,
                `${d.evidence.length} proof${d.evidence.length === 1 ? '' : 's'}`,
                sus.mobile ? `suspect: ${String(sus.mobile)}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {typeof inc.detail === 'string' && <span className="text-xs text-mut">{inc.detail}</span>}
          </Card>
          {d.status === 'Rejected' && (
            <Note tone="bad">
              Rejected{d.remarks ? `: ${d.remarks}` : ''}. You can raise a new complaint if needed.
            </Note>
          )}
          {d.status === 'Resolved' && (
            <Card className="gap-2">
              <span className="text-sm">Our team marked this as solved. Is your problem solved?</span>
              <Button size="md" busy={closing} onClick={close}>
                Yes, close it
              </Button>
              <span className="text-xs text-mut">Not solved? Write below; our team reads it.</span>
            </Card>
          )}
          {error ? <ErrorBox error={error} /> : null}
          <ChatThread
            id={id}
            open={chatOpen(d.status)}
            emptyText="No messages yet. Our team will write here."
            onChange={refresh}
          />
        </>
      )}
    </MemberPage>
  );
}
