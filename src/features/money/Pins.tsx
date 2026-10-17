import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { memberApi } from '@/api/member';
import { pinsApi, type MyPinsPage, type PinTab } from '@/api/pins';
import { refreshMoney } from '@/api/queryClient';
import {
  ButtonLink,
  Button,
  Card,
  Chip,
  CopyButton,
  Empty,
  ErrorBox,
  Note,
  Sheet,
  SkeletonList,
  Tabs,
  TextField,
} from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { useDebounced } from '@/lib/useDebounced';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { CODE_RE } from '@/lib/validators';
import { MemberPage } from '@/features/member/MemberPage';
import { usePins } from './data';

// C7 "My PINs": one PIN activates one ID and never expires. Activate an inactive ID in my team, send PINs to any
// member, and the 4 tabs Ready / Received / Sent / Used. The server picks the PIN (never the same one twice).

const DAY_MS = 86_400_000;
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS));

function useLookup(code: string) {
  const c = useDebounced(code.trim().toUpperCase(), 350);
  const valid = CODE_RE.test(c);
  const q = useQuery({
    queryKey: ['pins', 'lookup', c],
    queryFn: ({ signal }) => pinsApi.lookup(c, signal),
    enabled: valid,
    retry: false,
    staleTime: 30_000,
  });
  return { code: c, valid, ...q };
}

function ActivateBox({ ready }: { ready: number }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  const l = useLookup(code);
  const inactiveTeam = useQuery({
    queryKey: ['team', 'members', 'inactive-for-pin'],
    queryFn: ({ signal }) => memberApi.teamMembers({ status: 'inactive', page: 1, limit: 20 }, signal),
  });
  const m = l.data;
  const ok = !!m && m.my_level !== null && m.status === 'inactive';

  const [go, busy] = useSingleFlight(async () => {
    if (!m) return;
    setError(null);
    try {
      const r = await pinsApi.activate(l.code);
      setOpen(false);
      setCode('');
      setDone(`${m.full_name}'s ID is active now (PIN ${r.pin}).`);
    } catch (e) {
      setOpen(false);
      setError(e); // also on no answer: the lists below are refreshed; check them before trying again
    } finally {
      await Promise.all([refreshMoney(qc), qc.invalidateQueries({ queryKey: ['team'] }), l.refetch()]);
    }
  });

  return (
    <Card className="gap-2.5">
      <h2 className="m-0 text-[14.5px] font-bold">Activate an ID with a PIN</h2>
      <TextField
        label="Member ID (not active yet)"
        placeholder="TW1234567"
        autoCapitalize="characters"
        autoComplete="off"
        value={code}
        disabled={ready === 0}
        onChange={(e) => (setCode(e.target.value), setDone(null), setError(null))}
      />
      {l.valid && l.isError && <span className="text-xs font-semibold text-b">No member with this ID.</span>}
      {m &&
        (m.my_level === null ? (
          <span className="text-xs font-semibold text-b">
            {m.full_name} is not in your team. You can activate only an ID in your team.
          </span>
        ) : m.status !== 'inactive' ? (
          <span className="text-xs font-semibold text-b">
            {m.full_name}'s ID is already {m.status}.
          </span>
        ) : (
          <span className="text-xs">
            <b>{m.full_name}</b> · your team · inactive since {daysSince(m.created_at)} day
            {daysSince(m.created_at) === 1 ? '' : 's'} · uses 1 PIN
          </span>
        ))}
      {inactiveTeam.data && inactiveTeam.data.rows.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {inactiveTeam.data.rows.map((t) => (
            <Button
              key={t.user_code}
              size="sm"
              variant="ghost"
              disabled={ready === 0}
              onClick={() => setCode(t.user_code)}
            >
              {t.full_name.split(' ')[0]} · {t.user_code}
            </Button>
          ))}
        </div>
      )}
      {error ? <ErrorBox error={error} /> : null}
      {done && (
        <Note role="status" tone="info">
          {done}
        </Note>
      )}
      <Button disabled={!ok || ready === 0} onClick={() => setOpen(true)}>
        Activate
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Use 1 PIN?" locked={busy}>
        <Note tone="warn">
          Activate <b>{m?.full_name}</b> ({l.code}) with 1 of your {ready} ready PIN{ready === 1 ? '' : 's'}.
          This cannot be undone.
        </Note>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
            Back
          </Button>
          <Button busy={busy} onClick={go}>
            Activate
          </Button>
        </div>
      </Sheet>
    </Card>
  );
}

function SendBox({ ready }: { ready: number }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [qtyText, setQtyText] = useState('1');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  const l = useLookup(code);
  const m = l.data;
  const qty = /^\d{1,3}$/.test(qtyText) ? Number(qtyText) : NaN;
  const qtyErr =
    qtyText && !(qty >= 1) ? 'At least 1 PIN.' : qty > ready ? `You have only ${ready} ready PINs.` : null;
  const ok = !!m && m.status !== 'blocked' && m.status !== 'removed' && qty >= 1 && qty <= ready;

  const [go, busy] = useSingleFlight(async () => {
    if (!m) return;
    setError(null);
    try {
      await pinsApi.transfer(l.code, qty);
      setOpen(false);
      setCode('');
      setQtyText('1');
      setDone(`${qty} PIN${qty === 1 ? '' : 's'} sent to ${m.full_name}.`);
    } catch (e) {
      setOpen(false);
      setError(e);
    } finally {
      await refreshMoney(qc);
    }
  });

  return (
    <Card className="gap-2.5">
      <h2 className="m-0 text-[14.5px] font-bold">Send PINs to a member</h2>
      <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
        <TextField
          label="Member ID"
          placeholder="TW1234567"
          autoCapitalize="characters"
          autoComplete="off"
          value={code}
          disabled={ready === 0}
          onChange={(e) => (setCode(e.target.value), setDone(null), setError(null))}
        />
        <TextField
          label="How many"
          inputMode="numeric"
          value={qtyText}
          disabled={ready === 0}
          onChange={(e) => setQtyText(e.target.value.replace(/\D/g, '').slice(0, 3))}
          error={qtyErr}
        />
      </div>
      {l.valid && l.isError && <span className="text-xs font-semibold text-b">No member with this ID.</span>}
      {m && (
        <span className="text-xs">
          <b>{m.full_name}</b>
          {m.status === 'blocked'
            ? ' · this ID is blocked'
            : m.my_level !== null
              ? ` · your team (Level ${m.my_level})`
              : ''}
        </span>
      )}
      {error ? <ErrorBox error={error} /> : null}
      {done && (
        <Note role="status" tone="info">
          {done}
        </Note>
      )}
      <Button disabled={!ok} onClick={() => setOpen(true)}>
        Send
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Send PINs?" locked={busy}>
        <Note tone="warn">
          Send <b>{qty}</b> PIN{qty === 1 ? '' : 's'} to <b>{m?.full_name}</b> ({l.code}). They become theirs.
        </Note>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
            Back
          </Button>
          <Button busy={busy} onClick={go}>
            Send
          </Button>
        </div>
      </Sheet>
    </Card>
  );
}

function PinRows({ tab, page }: { tab: PinTab; page: MyPinsPage }) {
  if (page.rows.length === 0)
    return (
      <Empty
        title={
          {
            ready: 'No ready PIN',
            received: 'No PIN received',
            sent: 'No PIN sent',
            used: 'No PIN used yet',
          }[tab]
        }
      />
    );
  return (
    <Card flat>
      <ul className="m-0 list-none p-0">
        {page.rows.map((r) => {
          const p = r as Record<string, string | null>;
          const line =
            tab === 'ready'
              ? `${p.source === 'admin' ? 'Given by the company' : 'Bought'} ${formatDay(p.created_at!)}`
              : tab === 'received'
                ? `Received from ${p.from_name} (${p.from_code}) · ${formatDay(p.created_at!)}`
                : tab === 'sent'
                  ? `Sent to ${p.to_name} (${p.to_code}) · ${formatDay(p.created_at!)}`
                  : `Activated ${p.activated_name} (${p.activated_code}) · ${formatDay(p.used_at!)}`;
          return (
            <li
              key={`${p.code}-${line}`}
              className="flex min-h-[58px] items-center justify-between gap-2.5 border-b border-line2 px-3.5 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <b className="num tracking-[.03em]">{p.code}</b>
                <span className="text-[12.5px] text-mut">{line}</span>
              </div>
              {tab === 'ready' ? (
                <CopyButton text={p.code!} label="Copy" />
              ) : (tab === 'received' || tab === 'sent') && p.status === 'used' ? (
                <Chip tone="muted">Used</Chip>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default function Pins() {
  const [tab, setTab] = useState<PinTab>('ready');
  const ready = usePins('ready');
  const list = usePins(tab);
  const c = (list.data ?? ready.data)?.counts;
  const readyCount = ready.data?.counts.ready ?? 0;

  return (
    <MemberPage
      title="My PINs"
      subtitle="One PIN activates one ID · never expires"
      back="/more"
      right={
        <ButtonLink to="/pins/buy" size="sm">
          Buy PINs
        </ButtonLink>
      }
    >
      {ready.isError && <ErrorBox error={ready.error} onRetry={() => ready.refetch()} />}
      {ready.data && readyCount === 0 && (
        <Note>
          You have no ready PIN. <Link to="/pins/buy">Buy PINs</Link> to activate an ID or to send.
        </Note>
      )}
      <ActivateBox ready={readyCount} />
      <SendBox ready={readyCount} />
      <Tabs
        label="PINs"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'ready', label: 'Ready', count: c?.ready },
          { value: 'received', label: 'Received', count: c?.received },
          { value: 'sent', label: 'Sent', count: c?.sent },
          { value: 'used', label: 'Used', count: c?.used },
        ]}
      />
      {list.isError ? (
        <ErrorBox error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <SkeletonList rows={3} />
      ) : (
        <PinRows tab={tab} page={list.data} />
      )}
      <span className="text-xs text-mut">
        Received = PINs others sent you · Sent = PINs you gave · Used = IDs activated
        {c ? ` · ${formatCount(c.ready)} ready` : ''}
      </span>
    </MemberPage>
  );
}
