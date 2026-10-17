import { useInfiniteQuery } from '@tanstack/react-query';
import { adminApi, adminKeys } from '@/api/admin';
import { Button, ErrorBox, SkeletonList, Empty } from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { AdminTitle, Panel, Table, td } from './AdminParts';

// System → Audit log: every admin action with the admin's name and time (newest first). Read only.

const LABEL: Record<string, string> = {
  payment_approve: 'Approved a payment',
  payment_reject: 'Rejected a payment',
  withdrawal_paid: 'Paid a withdrawal',
  withdrawal_reject: 'Rejected a withdrawal',
  wallet_debit: 'Deducted from a wallet (hidden)',
  reverse_entry: 'Reverse entry',
  pins_issue: 'Issued PINs',
  setting_update: 'Changed a setting',
  videos_set: 'Saved daily videos',
  member_block: 'Blocked a member',
  member_unblock: 'Unblocked a member',
  admin_create: 'Added an admin',
  admin_block: 'Blocked an admin',
  admin_unblock: 'Unblocked an admin',
  approval_cancelled: 'Waiting approval cancelled (2-admin off)',
};

/** The words that matter in one audit row: reason, comment, UTR. Amounts in `detail` are in paise. */
function detailText(action: string, d: Record<string, unknown>): string {
  const parts: string[] = [];
  const str = (k: string) => (typeof d[k] === 'string' && d[k] ? String(d[k]) : null);
  if (typeof d.amount === 'number' && action !== 'approval_cancelled')
    parts.push(`₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(d.amount / 100)}`);
  if (str('wallet')) parts.push(`${str('wallet')} wallet`);
  for (const k of ['utr', 'remark', 'comment', 'reason']) {
    const s = str(k);
    if (s) parts.push(k === 'utr' ? `UTR ${s}` : `"${s}"`);
  }
  return parts.join(' · ');
}

export default function AdminAudit() {
  const q = useInfiniteQuery({
    queryKey: adminKeys.audit,
    queryFn: ({ pageParam, signal }) => adminApi.audit(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];

  return (
    <>
      <AdminTitle
        title="Audit log"
        sub="Every admin action, with who did it and when. Nothing here can be changed."
      />
      <Panel>
        {q.isError ? (
          <ErrorBox error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data ? (
          <SkeletonList rows={6} />
        ) : rows.length === 0 ? (
          <Empty title="Nothing yet." />
        ) : (
          <Table head={['When', 'Admin', 'What', 'On', 'Details']} min={720}>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={td}>{formatWhen(r.created_at)}</td>
                <td className={td}>{r.admin_name}</td>
                <td className={td}>{LABEL[r.action] ?? r.action.replace(/_/g, ' ')}</td>
                <td className={td}>{r.target ?? '–'}</td>
                <td className={td}>{detailText(r.action, r.detail)}</td>
              </tr>
            ))}
          </Table>
        )}
        {q.hasNextPage && (
          <Button variant="ghost" size="md" busy={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
            Show more
          </Button>
        )}
      </Panel>
    </>
  );
}
