import { useState } from 'react';
import { Link } from 'react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { complaintsApi, type ComplaintRow } from '@/api/complaints';
import { Button, ButtonLink, Card, Chip, Empty, ErrorBox, Pills, SkeletonList } from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { MemberPage } from '@/features/member/MemberPage';
import { label, tone } from './complaintText';

// E1 "My complaints": counts, the list (newest first), new messages per complaint, drafts to finish.

const FILTERS = [
  { value: 'all', label: 'All', statuses: undefined },
  { value: 'In Process', label: 'In progress', statuses: 'In Process' },
  { value: 'Resolved', label: 'Solved', statuses: 'Resolved' },
  { value: 'Draft', label: 'Draft', statuses: 'Draft' },
] as const;

function Row({ c }: { c: ComplaintRow }) {
  const to = c.status === 'Draft' ? `/complaints/new?draft=${c.id}` : `/complaints/${c.id}`;
  return (
    <li className="border-b border-line2 last:border-b-0">
      <Link
        to={to}
        className="flex min-h-[64px] items-center justify-between gap-2.5 px-3.5 py-3 text-ink no-underline"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <b className="truncate text-[14.5px]">{c.category}</b>
          <span className="text-[12.5px] text-mut">
            {c.complaint_no} ·{' '}
            {c.status === 'Draft' ? 'not finished · tap to complete' : formatDay(c.created_at)}
            {c.unread > 0 && (
              <b className="text-g">
                {' '}
                · {c.unread} new message{c.unread === 1 ? '' : 's'}
              </b>
            )}
          </span>
        </div>
        <Chip tone={tone(c.status)}>{label(c.status)}</Chip>
      </Link>
    </li>
  );
}

export default function Complaints() {
  const [f, setF] = useState<(typeof FILTERS)[number]['value']>('all');
  const status = FILTERS.find((x) => x.value === f)!.statuses;
  const m = useQuery({
    queryKey: ['complaints', 'matrix'],
    queryFn: ({ signal }) => complaintsApi.matrix(signal),
  });
  const q = useInfiniteQuery({
    queryKey: ['complaints', 'list', status ?? 'all'],
    queryFn: ({ pageParam, signal }) => complaintsApi.list({ status, cursor: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    refetchInterval: 30_000,
  });
  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];
  const c = m.data;

  return (
    <MemberPage title="My complaints" subtitle="Raise a complaint and track it" back="/more">
      {c && (
        <div className="grid grid-cols-4 gap-2 text-center">
          {(
            [
              ['Submitted', c.Submitted],
              ['In progress', c['In Process']],
              ['Solved', (c.Resolved ?? 0) + (c.Closed ?? 0)],
              ['Draft', c.Draft],
            ] as const
          ).map(([k, n]) => (
            <Card key={k} className="items-center gap-0 p-2">
              <b className="num text-lg">{n ?? 0}</b>
              <span className="text-[11.5px] text-mut">{k}</span>
            </Card>
          ))}
        </div>
      )}
      <ButtonLink to="/complaints/new">+ Raise a new complaint</ButtonLink>
      <Pills
        label="Show"
        value={f}
        onChange={setF}
        items={FILTERS.map((x) => ({ value: x.value, label: x.label }))}
      />
      {q.isError ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <SkeletonList rows={4} />
      ) : rows.length === 0 ? (
        <Empty
          title="No complaint here"
          text="If something went wrong, raise a complaint. Our team answers in the chat."
        />
      ) : (
        <Card flat>
          <ul className="m-0 list-none p-0">
            {rows.map((r) => (
              <Row key={r.id} c={r} />
            ))}
          </ul>
        </Card>
      )}
      {q.hasNextPage && (
        <Button variant="ghost" size="md" busy={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
          Show more
        </Button>
      )}
    </MemberPage>
  );
}
