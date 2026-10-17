import { useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { refreshMoney } from '@/api/queryClient';
import { walletApi, type MyWithdrawal } from '@/api/wallet';
import { useMe } from '@/auth/session';
import {
  Button,
  Card,
  Chip,
  Empty,
  ErrorBox,
  Hero,
  Money,
  Note,
  Pills,
  SkeletonList,
  TextField,
} from '@/components/ui';
import { formatDay, formatWhen } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useCountdown } from '@/lib/useCountdown';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { useConfig } from '@/features/auth/usePublic';
import { useWalletSummary } from '@/features/member/data';
import { WalletAmount } from '@/features/member/HomeParts';
import { MemberPage } from '@/features/member/MemberPage';
import { useWithdrawals } from './data';
import { amountText, bankHoldHoursLeft, checkAmount } from './moneyForm';
import { OtpSheet } from './OtpSheet';

// C4 "Withdraw money" + C5 "Withdraw OTP". Email OTP, then the money is held at once; the team pays it to the
// bank and the UTR shows here. A lost answer refreshes the list (never sends again by itself).

const QUICK = [500, 1000, 2000];

function Row({ w }: { w: MyWithdrawal }) {
  return (
    <li className="flex min-h-[58px] items-center justify-between gap-2.5 border-b border-line2 px-3.5 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <b className="num">
          <Money value={w.amount} />
        </b>
        <span className="text-[12.5px] text-mut">
          {w.status === 'paid'
            ? `${formatDay(w.reviewed_at ?? w.created_at)}${w.utr ? ` · UTR ${w.utr}` : ''}`
            : w.status === 'rejected'
              ? `${w.admin_remark ?? 'Rejected'} · money back in wallet`
              : `${formatWhen(w.created_at)} · team is checking`}
        </span>
      </div>
      {w.status === 'paid' ? (
        <Chip tone="ok">Paid</Chip>
      ) : w.status === 'rejected' ? (
        <Chip tone="bad">Rejected</Chip>
      ) : (
        <Chip tone="wait">Waiting</Chip>
      )}
    </li>
  );
}

export default function Withdraw() {
  const qc = useQueryClient();
  const me = useMe().data;
  const w = useWalletSummary();
  const config = useConfig().data;
  const list = useWithdrawals();
  const [text, setText] = useState('');
  const [amountErr, setAmountErr] = useState<string | null>(null);
  const [otpTo, setOtpTo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [otpError, setOtpError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  const [wait, startWait] = useCountdown();

  const balance = w.data?.income;
  const min = config?.min_withdraw;
  const pending = list.data?.rows.find((r) => r.status === 'pending');
  const noBank = me && (!me.pan || !me.bank_account || !me.bank_ifsc);
  const holdHours = bankHoldHoursLeft(me?.bank_updated_at);
  const blocked = !!pending || !!noBank || holdHours > 0;
  const check = checkAmount(text, { min, balance });

  const refresh = () => Promise.all([refreshMoney(qc), list.refetch()]);

  const [askOtp, asking] = useSingleFlight(async () => {
    setError(null);
    setDone(null);
    setAmountErr(check.ok ? null : check.error);
    if (!check.ok) return;
    try {
      const r = await walletApi.withdrawOtp();
      setOtp('');
      setOtpError(null);
      setOtpTo(r.email);
      startWait();
    } catch (e) {
      setError(e);
      await refresh();
    }
  });

  const [resend, resending] = useSingleFlight(async () => {
    setOtpError(null);
    try {
      await walletApi.withdrawOtp();
      startWait();
    } catch (e) {
      setOtpError(e);
    }
  });

  const [confirm, confirming] = useSingleFlight(async () => {
    if (!check.ok) return;
    setOtpError(null);
    const before = new Set(list.data?.rows.map((r) => r.id));
    try {
      await walletApi.withdraw(check.amount, otp);
      setOtpTo(null);
      setText('');
      setDone(
        `${formatMoney(check.amount)} is on hold now. Our team pays it to your bank; the UTR shows below.`,
      );
      await refresh();
    } catch (e) {
      // No answer / already waiting: it may have worked. Look at the server, never send it again by itself.
      const fresh = (await list.refetch()).data?.rows ?? [];
      const made = fresh.find((r) => r.status === 'pending' && !before.has(r.id));
      await refreshMoney(qc);
      if (made && e instanceof ApiError && (e.isNoAnswer || e.status === 409)) {
        setOtpTo(null);
        setText('');
        setDone(`${formatMoney(made.amount)} is on hold now. Our team pays it to your bank.`);
        return;
      }
      setOtpError(e);
    }
  });

  return (
    <MemberPage
      narrow
      title="Withdraw money"
      subtitle="To your bank · our team checks and pays"
      back="/wallet"
    >
      {w.isError && <ErrorBox error={w.error} onRetry={() => w.refetch()} />}
      <Hero>
        <span className="text-[13.5px] text-[#D6E8D0]">Income Wallet</span>
        <span className="text-[34px] leading-[1.1] font-bold">
          <WalletAmount value={balance} />
        </span>
      </Hero>

      {done && (
        <Note role="status" tone="info">
          {done}
        </Note>
      )}
      {noBank ? (
        <Note tone="warn">
          Add your PAN and bank details first. <Link to="/profile">Profile and bank ›</Link>
        </Note>
      ) : pending ? (
        <Note tone="warn">
          You already have a withdrawal waiting (<Money value={pending.amount} />
          ). You can ask for a new one when it is paid or rejected.
        </Note>
      ) : holdHours > 0 ? (
        <Note tone="warn">
          Bank details were changed recently. You can withdraw in about {holdHours} hour
          {holdHours === 1 ? '' : 's'}.
        </Note>
      ) : null}

      <Card className="gap-3">
        <TextField
          label={`How much? ${min !== undefined ? `Minimum ${formatMoney(min)}` : ''}`}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          disabled={blocked}
          onChange={(e) => {
            setText(e.target.value);
            setAmountErr(null);
            setDone(null);
          }}
          error={amountErr}
        />
        <Pills
          label="Quick amounts"
          value=""
          onChange={(v) => {
            setText(v);
            setAmountErr(null);
          }}
          items={[
            ...QUICK.filter((q) => balance === undefined || q <= balance).map((q) => ({
              value: String(q),
              label: formatMoney(q),
            })),
            ...(balance && balance > 0
              ? [{ value: amountText(balance), label: `All ${formatMoney(balance)}` }]
              : []),
          ]}
        />
        {me?.bank_account && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-bg p-2.5 text-sm">
            <span className="min-w-0">
              <b>{me.bank_account}</b>
              <span className="block text-xs text-mut">
                {me.bank_holder} · {me.pan ? 'PAN added' : 'PAN missing'}
              </span>
            </span>
            <Link to="/profile" className="text-[13px] font-bold">
              Change
            </Link>
          </div>
        )}
        {check.ok && <span className="text-sm">You will get {formatMoney(check.amount)}</span>}
        <span className="text-xs text-mut">
          The 10% cut (tax, service and Single Leg) was already taken when you earned it.
        </span>
        {error ? <ErrorBox error={error} /> : null}
        <Button busy={asking} disabled={blocked} onClick={askOtp}>
          Send OTP
        </Button>
      </Card>

      <ol className="m-0 grid list-none grid-cols-3 gap-2 p-0 text-center text-xs text-mut">
        <li>1. OTP, money on hold</li>
        <li>2. Team pays to your bank</li>
        <li>3. UTR shows here</li>
      </ol>

      <h2 className="m-0 text-[14.5px] font-bold">Your withdrawals</h2>
      {list.isError ? (
        <ErrorBox error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <SkeletonList rows={3} />
      ) : list.data.rows.length === 0 ? (
        <Empty title="No withdrawal yet" />
      ) : (
        <Card flat>
          <ul className="m-0 list-none p-0">
            {list.data.rows.map((r) => (
              <Row key={r.id} w={r} />
            ))}
          </ul>
        </Card>
      )}

      <OtpSheet
        open={!!otpTo}
        title="Enter OTP"
        email={otpTo}
        otp={otp}
        setOtp={setOtp}
        wait={wait}
        onResend={resend}
        resending={resending}
        onConfirm={confirm}
        busy={confirming}
        confirmLabel="Confirm"
        error={otpError}
        onClose={() => setOtpTo(null)}
      >
        {check.ok && (
          <div className="flex flex-col gap-1.5 rounded-xl bg-bg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-mut">Amount</span>
              <b>{formatMoney(check.amount)}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-mut">Bank</span>
              <b>{me?.bank_account}</b>
            </div>
            <span className="text-xs text-mut">
              {formatMoney(check.amount)} goes on hold now. If it is rejected, it comes back to your wallet.
            </span>
          </div>
        )}
      </OtpSheet>
    </MemberPage>
  );
}
