import { useState } from 'react';
import { adminApi } from '@/api/admin';
import {
  Button,
  Chip,
  ErrorBox,
  Money,
  Note,
  Sheet,
  SkeletonList,
  Tabs,
  TextAreaField,
  TextField,
  Empty,
} from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { usePageClamp } from '@/lib/usePageClamp';
import { useDebounced } from '@/lib/useDebounced';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { useAdminPins, useAdminRefresh } from './adminData';
import { AdminTitle, CsvButton, Kpi, Kpis, Pager, Panel, Table, td } from './AdminParts';
import { checkIssue } from './adminText';

// K2 "PINs": every PIN with who bought it, who has it now, where it was used; cash PINs with a reason.
type Status = 'all' | 'ready' | 'used' | 'sent';

function IssueButton() {
  const refresh = useAdminRefresh();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [qty, setQty] = useState('1');
  const [remark, setRemark] = useState('');
  const [errs, setErrs] = useState<Partial<ReturnType<typeof checkIssue>>>({});
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<{ msg: string; codes: string[] } | null>(null);

  const next = () => {
    const e = checkIssue(code, qty, remark);
    setErrs(e);
    if (!e.code && !e.qty && !e.remark) setConfirm(true);
  };

  const [go, busy] = useSingleFlight(async () => {
    setError(null);
    try {
      const env = await adminApi.issuePins({
        user_code: code.trim().toUpperCase(),
        qty: Number(qty),
        remark: remark.trim(),
      });
      const codes = env.status === 202 ? [] : ((env.data as { codes?: string[] }).codes ?? []);
      setDone({
        msg:
          env.status === 202
            ? 'Sent for a second admin to approve (2-admin approval is on).'
            : `${codes.length} PIN(s) given to ${code.trim().toUpperCase()}.`,
        codes,
      });
      setConfirm(false);
      setCode('');
      setQty('1');
      setRemark('');
    } catch (e) {
      setConfirm(false);
      setError(e);
    } finally {
      // A lost answer may still have worked: the list shows what the server has, never send it again by itself.
      await refresh();
    }
  });

  const close = () => {
    setOpen(false);
    setDone(null);
    setConfirm(false);
    setError(null);
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Give PINs for cash
      </Button>
      <Sheet open={open} onClose={close} title="Give PINs for cash" locked={busy}>
        {done ? (
          <>
            <Note role="status" tone="info">
              {done.msg}
            </Note>
            {done.codes.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0 font-mono text-[14px]">
                {done.codes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
            <Button onClick={close}>Done</Button>
          </>
        ) : !confirm ? (
          <>
            <Note>Only when the member paid you in cash. PINs bought online come by themselves.</Note>
            <TextField
              label="Member ID"
              value={code}
              autoCapitalize="characters"
              onChange={(e) => setCode(e.target.value)}
              error={errs.code}
            />
            <TextField
              label="How many PINs"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              error={errs.qty}
            />
            <TextAreaField
              label="Reason (required)"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              error={errs.remark}
            />
            {error ? <ErrorBox error={error} /> : null}
            <Button onClick={next}>Next</Button>
          </>
        ) : (
          <>
            <Note tone="warn">
              Give <b>{qty} PIN(s)</b> to <b>{code.trim().toUpperCase()}</b>? Reason: "{remark.trim()}". It is
              saved with your name and the time.
            </Note>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>
                Back
              </Button>
              <Button busy={busy} onClick={go}>
                Give PINs
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}

export default function AdminPins() {
  const [status, setStatus] = useState<Status>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim(), 400);
  const list = useAdminPins({ status: status === 'all' ? undefined : status, search: q || undefined, page });
  const c = list.data?.counts;
  usePageClamp(page, list.data?.total, 20, setPage);

  return (
    <>
      <AdminTitle
        title="PINs"
        sub='PINs are created by themselves when you approve a "Buy PINs" payment'
        actions={
          <>
            <CsvButton
              name="pins"
              query={{ status: status === 'ready' || status === 'used' ? status : undefined }}
            />
            <IssueButton />
          </>
        }
      />
      {c && (
        <Kpis>
          <Kpi label="PINs sold" value={formatCount(c.sold)} small={<Money value={c.sold_amount} />} />
          <Kpi label="Used" value={formatCount(c.used)} />
          <Kpi
            label="Not used yet"
            value={formatCount(c.ready)}
            small={`With ${formatCount(c.members_holding)} members`}
          />
          <Kpi label="Sent between members" value={formatCount(c.sent_between_members)} />
        </Kpis>
      )}
      <TextField
        label="PIN or member ID"
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        fieldClassName="max-w-[320px]"
      />
      <Tabs
        label="Status"
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        className="max-w-[560px]"
        items={[
          { value: 'all', label: 'All' },
          { value: 'ready', label: 'Not used' },
          { value: 'used', label: 'Used' },
          { value: 'sent', label: 'Sent' },
        ]}
      />
      <Panel>
        {list.isError ? (
          <ErrorBox error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data ? (
          <SkeletonList rows={5} />
        ) : list.data.rows.length === 0 ? (
          <Empty title="No PIN found." />
        ) : (
          <>
            <Table head={['PIN', 'Bought by', 'Now with', 'Status', 'Used for', 'Date']} min={760}>
              {list.data.rows.map((p) => (
                <tr key={p.code}>
                  <td className={`${td} num font-semibold`}>{p.code}</td>
                  <td className={td}>
                    {p.bought_by_name}
                    <small className="block text-[12.5px] text-mut">
                      {p.bought_by_code}
                      {p.source === 'admin' ? ' · cash (admin)' : ''}
                    </small>
                  </td>
                  <td className={td}>
                    {p.owner_name}
                    {p.last_sent_at && (
                      <small className="block text-[12.5px] text-mut">sent {formatDay(p.last_sent_at)}</small>
                    )}
                  </td>
                  <td className={td}>
                    {p.status === 'used' ? (
                      <Chip tone="ok">Used</Chip>
                    ) : p.last_sent_at ? (
                      <Chip tone="gold">Sent</Chip>
                    ) : (
                      <Chip tone="wait">Not used</Chip>
                    )}
                  </td>
                  <td className={td}>{p.used_for_code ?? '–'}</td>
                  <td className={td}>{formatDay(p.used_at ?? p.created_at)}</td>
                </tr>
              ))}
            </Table>
            <Pager page={page} size={20} total={list.data.total} onPage={setPage} />
          </>
        )}
      </Panel>
      <Note>
        Every PIN keeps its full history: who bought it, who it was sent to, and which ID it activated. PINs
        never expire.
      </Note>
    </>
  );
}
