import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { memberApi } from '@/api/member';
import { pinsApi } from '@/api/pins';
import { refreshMoney } from '@/api/queryClient';
import { walletApi } from '@/api/wallet';
import { useMe } from '@/auth/session';
import { Button, Card, Chip, ErrorBox, Note, Sheet, SkeletonList, TextField } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { useCountdown } from '@/lib/useCountdown';
import { useDebounced } from '@/lib/useDebounced';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { CODE_RE } from '@/lib/validators';
import { useConfig } from '@/features/auth/usePublic';
import { useWalletSummary } from '@/features/member/data';
import { HistoryList } from '@/features/member/HistoryList';
import { MemberPage } from '@/features/member/MemberPage';
import { useP2PLimits } from './data';
import { checkAmount, feePreview } from './moneyForm';
import { OtpSheet } from './OtpSheet';

// C6 "Send to a member (P2P)": Income -> Income, to your team or your own sponsor, with an email OTP.
// Fee, limits and "left today" come from the server; the preview is a hint and the server's answer is shown.

/** Who the ID is, and whether P2P to them is allowed (the server checks again). */
function useReceiver(code: string, myCode: string | undefined) {
  const c = useDebounced(code.trim().toUpperCase(), 350);
  const valid = CODE_RE.test(c);
  const q = useQuery({
    queryKey: ['p2p', 'lookup', c],
    queryFn: ({ signal }) => pinsApi.lookup(c, signal),
    enabled: valid && c !== myCode,
    retry: false,
    staleTime: 30_000,
  });
  if (!valid) return { code: c, state: 'none' as const };
  if (c === myCode) return { code: c, state: 'self' as const };
  if (q.isPending) return { code: c, state: 'loading' as const };
  if (q.isError) return { code: c, state: 'notfound' as const };
  const m = q.data!;
  if (m.status !== 'active') return { code: c, state: 'inactive' as const, m };
  if (m.my_level === null && !m.is_my_sponsor) return { code: c, state: 'outside' as const, m };
  return { code: c, state: 'ok' as const, m };
}

function TeamPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (code: string) => void;
}) {
  const t = useQuery({
    queryKey: ['team', 'members', 'p2p-picker'],
    queryFn: ({ signal }) => memberApi.teamMembers({ level: 1, page: 1 }, signal),
    enabled: open,
  });
  return (
    <Sheet open={open} onClose={onClose} title="Pick from my team">
      {t.isError ? (
        <ErrorBox error={t.error} onRetry={() => t.refetch()} />
      ) : !t.data ? (
        <SkeletonList rows={3} />
      ) : t.data.rows.filter((r) => r.status === 'active').length === 0 ? (
        <span className="text-sm text-mut">
          No active member in your level 1 yet. You can type any team ID above.
        </span>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {t.data.rows
            .filter((r) => r.status === 'active')
            .map((r) => (
              <li key={r.user_code}>
                <button
                  type="button"
                  onClick={() => onPick(r.user_code)}
                  className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 border-0 border-b border-line2 bg-transparent px-1 text-left"
                >
                  <b className="text-sm">{r.full_name}</b>
                  <span className="text-xs text-mut">{r.user_code}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </Sheet>
  );
}

export default function P2P() {
  const qc = useQueryClient();
  const me = useMe().data;
  const config = useConfig().data?.p2p;
  const limits = useP2PLimits();
  const balance = useWalletSummary().data?.income;
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [amountErr, setAmountErr] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [otpTo, setOtpTo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [otpError, setOtpError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  const [wait, startWait] = useCountdown();

  const r = useReceiver(to, me?.user_code);
  const left = limits.data?.left_today;
  const max = config && left !== undefined ? Math.min(config.max, left) : config?.max;
  const check = checkAmount(text, { min: config?.min, max, balance });
  const fee = check.ok && config ? feePreview(check.amount, config.fee_percent) : null;
  const name = r.state === 'ok' ? r.m.full_name.split(' ')[0] : '';

  const [askOtp, asking] = useSingleFlight(async () => {
    setError(null);
    setDone(null);
    setAmountErr(check.ok ? null : check.error);
    if (!check.ok || r.state !== 'ok') return;
    try {
      const res = await walletApi.p2pOtp();
      setOtp('');
      setOtpError(null);
      setOtpTo(res.email);
      startWait();
    } catch (e) {
      setError(e);
    }
  });

  const [resend, resending] = useSingleFlight(async () => {
    setOtpError(null);
    try {
      await walletApi.p2pOtp();
      startWait();
    } catch (e) {
      setOtpError(e);
    }
  });

  const [send, sending] = useSingleFlight(async () => {
    if (!check.ok || r.state !== 'ok') return;
    setOtpError(null);
    const sentBefore = limits.data?.sent_today;
    try {
      const res = await walletApi.p2pSend(r.code, check.amount, otp);
      setOtpTo(null);
      setText('');
      setDone(
        `Sent ${formatMoney(res.sent)}. ${r.m.full_name} got ${formatMoney(res.received)} (fee ${formatMoney(res.fee)}).`,
      );
    } catch (e) {
      // No answer: did it go? "Sent today" from the server tells. Never send it again by itself.
      const fresh = (await limits.refetch()).data;
      if (
        e instanceof ApiError &&
        e.isNoAnswer &&
        fresh &&
        sentBefore !== undefined &&
        fresh.sent_today > sentBefore
      ) {
        setOtpTo(null);
        setText('');
        setDone(`Sent. Please check the history below.`);
        return;
      }
      setOtpError(e);
    } finally {
      await refreshMoney(qc);
    }
  });

  const tell = {
    none: null,
    loading: <span className="text-xs text-mut">Checking…</span>,
    self: <span className="text-xs font-semibold text-b">This is your own ID.</span>,
    notfound: <span className="text-xs font-semibold text-b">No active member with this ID.</span>,
    inactive: <span className="text-xs font-semibold text-b">This ID is not active.</span>,
    outside:
      r.state === 'outside' ? (
        <span className="text-xs font-semibold text-b">
          {r.m.full_name} is not in your team. You can send only to your team or your sponsor.
        </span>
      ) : null,
    ok:
      r.state === 'ok' ? (
        <span className="flex flex-wrap items-center gap-1.5 text-xs">
          <b>{r.m.full_name}</b>
          {r.m.is_my_sponsor ? (
            <Chip tone="gold">My sponsor</Chip>
          ) : (
            <Chip tone="ok">in your team (Level {r.m.my_level})</Chip>
          )}
        </span>
      ) : null,
  }[r.state];

  return (
    <MemberPage narrow title="Send to a member (P2P)" subtitle="To your team or your sponsor" back="/wallet">
      {done && (
        <Note role="status" tone="info">
          {done}
        </Note>
      )}
      <Card className="gap-3">
        <div className="flex flex-col gap-1.5">
          <TextField
            label="Send to (member ID)"
            placeholder="TW1234567"
            autoCapitalize="characters"
            autoComplete="off"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setDone(null);
            }}
          />
          {tell}
          <div className="flex flex-wrap gap-2">
            {me?.sponsor_code && (
              <Button size="sm" variant="ghost" onClick={() => setTo(me.sponsor_code!)}>
                My sponsor{me.sponsor_name ? ` · ${me.sponsor_name.split(' ')[0]}` : ''}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setPicker(true)}>
              Pick from my team
            </Button>
          </div>
        </div>
        <TextField
          label={`Amount${config ? ` (${formatMoney(config.min)} to ${formatMoney(config.max)})` : ''}`}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setAmountErr(null);
            setDone(null);
          }}
          error={amountErr}
          help={balance !== undefined ? `From your wallet: ${formatMoney(balance)}` : undefined}
        />
        {fee && config && (
          <div className="flex flex-col gap-1 rounded-xl bg-bg p-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-mut">{config.fee_percent}% fee</span>
              <span>− {formatMoney(fee.fee)}</span>
            </div>
            <div className="flex justify-between">
              <span>{name ? `${name} will get` : 'They will get'}</span>
              <b>{formatMoney(fee.gets)}</b>
            </div>
          </div>
        )}
        {error ? <ErrorBox error={error} /> : null}
        <Button busy={asking} disabled={r.state !== 'ok' || left === 0} onClick={askOtp}>
          Send with OTP
        </Button>
        <Note>
          You cannot send to anyone outside your team.
          {limits.data
            ? ` You can send up to ${formatMoney(limits.data.daily_max)} a day (${formatMoney(limits.data.left_today)} left today).`
            : ''}{' '}
          P2P money cannot be used to activate an ID.
        </Note>
      </Card>

      <h2 className="m-0 text-[14.5px] font-bold">P2P history</h2>
      <HistoryList filter={{ group: 'p2p' }} emptyTitle="No P2P yet" />

      <TeamPicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(c) => {
          setTo(c);
          setPicker(false);
        }}
      />
      <OtpSheet
        open={!!otpTo}
        title="Enter OTP"
        email={otpTo}
        otp={otp}
        setOtp={setOtp}
        wait={wait}
        onResend={resend}
        resending={resending}
        onConfirm={send}
        busy={sending}
        confirmLabel="Send"
        error={otpError}
        onClose={() => setOtpTo(null)}
      >
        {check.ok && r.state === 'ok' && fee && (
          <div className="flex flex-col gap-1.5 rounded-xl bg-bg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-mut">To</span>
              <b>
                {r.m.full_name} ({r.code})
              </b>
            </div>
            <div className="flex justify-between">
              <span className="text-mut">Amount</span>
              <b>{formatMoney(check.amount)}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-mut">They get (about)</span>
              <b>{formatMoney(fee.gets)}</b>
            </div>
          </div>
        )}
      </OtpSheet>
    </MemberPage>
  );
}
