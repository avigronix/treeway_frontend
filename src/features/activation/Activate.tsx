import { useState } from 'react';
import { Navigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { qk } from '@/api/keys';
import { pinsApi } from '@/api/pins';
import { refreshMoney } from '@/api/queryClient';
import { walletApi, type MyPaymentRequest } from '@/api/wallet';
import { useMe } from '@/auth/session';
import {
  Button,
  Card,
  Chip,
  CopyButton,
  ErrorBox,
  FilePicker,
  Money,
  Note,
  Skeleton,
  SkeletonList,
  Step,
  Tabs,
  TextField,
  Timeline,
} from '@/components/ui';
import { formatDay, formatWhen } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useSingleFlight } from '@/lib/useSingleFlight';
import * as v from '@/lib/validators';
import { useCompany, useConfig } from '@/features/auth/usePublic';
import { PayDetails } from '@/features/money/PayDetails';
import { MemberPage } from '@/features/member/MemberPage';
import { latestRequest, useActivationRequests } from './useActivation';

// "My ID Activation" (Vinay 20 Oct): inside the member app, never opened by itself after sign-up. On top the
// ID's status and the next step; below two ways to activate: "Pay ₹987" (UTR + receipt, checked by the team)
// or "Use a PIN" (a ready PIN in this account, sent by the sponsor). While a payment is being checked, only
// its status shows (the server refuses a second one).

const CHECK_EVERY_MS = 60_000;
type Method = 'pay' | 'pin';

function StatusCard({
  code,
  createdAt,
  last,
  removeOn,
  removeDays,
}: {
  code: string;
  createdAt: string;
  last: MyPaymentRequest | undefined;
  removeOn: string | null | undefined;
  removeDays: number;
}) {
  const pending = last?.status === 'pending';
  const rejected = last?.status === 'rejected';
  return (
    <Card className="gap-3.5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-col">
          <span className="text-[13px] text-mut">Your ID</span>
          <b className="num text-[26px] tracking-[.04em] text-g">{code}</b>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Chip tone={rejected ? 'bad' : 'wait'}>
            {pending ? 'Payment being checked' : rejected ? 'Payment not approved' : 'Not active'}
          </Chip>
          <CopyButton text={code} label="Copy ID" />
        </div>
      </div>
      <Timeline>
        <Step n={1} state="done">
          <b className="text-[13px]">Free account created</b>
          <span className="text-xs text-mut">{formatDay(createdAt)}</span>
        </Step>
        <Step n={2} state={rejected ? 'bad' : 'now'}>
          <b className="text-[13px]">
            {pending ? (
              <>
                Checking your <Money value={last.amount} /> payment
              </>
            ) : rejected ? (
              'Payment not approved: send it again'
            ) : (
              'Activate: pay or use a PIN'
            )}
          </b>
          {last && (pending || rejected) ? (
            <span className="text-xs text-mut">
              UTR {last.utr} · {formatWhen(last.created_at)}
            </span>
          ) : null}
          {rejected && last?.admin_remark ? (
            <span className="text-[13px]">Reason: {last.admin_remark}</span>
          ) : null}
        </Step>
        <Step n={3} state="todo">
          <b className="text-[13px] text-mut">ID active</b>
          <span className="text-xs text-mut">Income, daily videos and your referral link start</span>
        </Step>
      </Timeline>
      <Note tone="warn">
        Activate within {removeDays} days{removeOn ? ` (by ${formatDay(removeOn)})` : ''}, or this ID will be
        removed.
      </Note>
    </Card>
  );
}

function PayTab() {
  const qc = useQueryClient();
  const config = useConfig();
  const company = useCompany();
  const requests = useActivationRequests();
  const [utr, setUtr] = useState('');
  const [utrErr, setUtrErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const amount = config.data?.activation_amount;

  const [send, sending] = useSingleFlight(async () => {
    setError(null);
    const u = v.utr.safeParse(utr);
    setUtrErr(u.success ? null : (u.error.issues[0]?.message ?? 'Enter the UTR.'));
    if (!file) setFileErr('Add the payment receipt or screenshot.');
    if (!u.success || !file) return;
    try {
      await walletApi.paymentRequest({ purpose: 'activation', utr: u.data, receipt: file });
      await qc.invalidateQueries({ queryKey: qk.paymentRequests('activation') });
    } catch (e) {
      const res = await requests.refetch();
      // Already waiting (409), or it reached the server but the answer was lost: the status shows it.
      if (
        latestRequest(res.data?.rows)?.status === 'pending' &&
        e instanceof ApiError &&
        (e.status === 409 || e.isNoAnswer)
      )
        return;
      setError(e);
    }
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-[11px]"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <Card>
        <div className="flex items-center justify-between gap-2.5">
          <h2 className="m-0 text-[14.5px] font-bold">
            1. Pay {amount !== undefined ? <Money value={amount} /> : '…'}
          </h2>
          {amount !== undefined ? (
            <span className="text-[22px] font-bold text-g">
              <Money value={amount} />
            </span>
          ) : (
            <Skeleton className="h-6 w-16" />
          )}
        </div>
        {company.data ? (
          <PayDetails company={company.data} />
        ) : company.isError ? (
          <ErrorBox error={company.error} onRetry={() => company.refetch()} />
        ) : (
          <Skeleton className="h-28 w-full" />
        )}
      </Card>
      <h2 className="m-0 text-[14.5px] font-bold">2. Send the payment details</h2>
      <TextField
        label="UTR number of your payment (12 digits)"
        help="You can find it in your UPI app's payment history"
        autoCapitalize="characters"
        autoComplete="off"
        value={utr}
        onChange={(e) => setUtr(e.target.value)}
        error={utrErr}
      />
      <FilePicker
        label="Payment receipt or screenshot"
        file={file}
        error={fileErr}
        disabled={sending}
        onChange={(f, problem) => {
          setFile(f);
          setFileErr(problem);
        }}
      />
      <span className="text-xs text-mut">
        3. Your ID turns on when our team sees {amount !== undefined ? <Money value={amount} /> : 'the money'}{' '}
        in the bank.
      </span>
      {error ? <ErrorBox error={error} /> : null}
      <Button type="submit" busy={sending}>
        Send for activation
      </Button>
    </form>
  );
}

/** A PIN must already be in this member's account (sent by the sponsor). Vinay, 15 Oct. */
function PinTab({ userCode }: { userCode: string }) {
  const qc = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const ready = useQuery({
    queryKey: qk.pins('ready'),
    queryFn: ({ signal }) => pinsApi.list('ready', signal),
    staleTime: 0,
  });

  const [activate, busy] = useSingleFlight(async () => {
    setError(null);
    try {
      await pinsApi.activate(userCode);
      await Promise.all([refreshMoney(qc), qc.invalidateQueries({ queryKey: qk.me })]);
    } catch (e) {
      // No answer: the ID may be active already. Refresh, never send a second PIN blindly.
      await Promise.all([qc.invalidateQueries({ queryKey: qk.me }), ready.refetch()]);
      setError(e);
    }
  });

  const count = ready.data?.total ?? 0;
  return (
    <Card className="gap-3">
      {ready.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : ready.isError ? (
        <ErrorBox error={ready.error} onRetry={() => ready.refetch()} />
      ) : count > 0 ? (
        <>
          <span className="text-sm">
            You have <b>{count}</b> ready PIN{count > 1 ? 's' : ''}. One PIN turns your ID on right now.
          </span>
          {error ? <ErrorBox error={error} /> : null}
          <Button busy={busy} onClick={activate}>
            Use 1 PIN to activate {userCode}
          </Button>
        </>
      ) : (
        <>
          <span className="text-sm">You have no PIN yet.</span>
          <Note>
            Ask your sponsor to send a PIN to your ID <b>{userCode}</b>. Or your sponsor can turn your ID on
            from their "My PINs" page.
          </Note>
          <CopyButton text={userCode} label="Copy my ID" size="md" className="w-full" />
        </>
      )}
    </Card>
  );
}

export default function Activate() {
  // While a payment is being checked, look again every minute; when the ID turns active, go Home.
  const requests = useActivationRequests();
  const last = latestRequest(requests.data?.rows);
  const me = useMe({ refetchInterval: last?.status === 'pending' ? CHECK_EVERY_MS : undefined });
  const config = useConfig();
  const company = useCompany();
  const qc = useQueryClient();
  const [method, setMethod] = useState<Method>('pay');

  if (me.data && me.data.status !== 'inactive') return <Navigate to="/" replace />;
  const help = company.data?.whatsapp_group || (company.data?.phone ? `tel:${company.data.phone}` : '');
  const amount = config.data?.activation_amount;

  return (
    <MemberPage title="My ID Activation" subtitle="Status and how to activate" back="/" narrow>
      {!me.data || requests.isPending ? (
        <SkeletonList rows={3} />
      ) : (
        <>
          {requests.isError ? <ErrorBox error={requests.error} onRetry={() => requests.refetch()} /> : null}
          <StatusCard
            code={me.data.user_code}
            createdAt={me.data.created_at}
            last={last}
            removeOn={me.data.remove_on}
            removeDays={config.data?.inactive_remove_days ?? 30}
          />
          {last?.status === 'pending' ? (
            <div className="flex flex-col gap-2.5">
              <Note>
                Our team checks the payment with the bank. Your ID turns on by itself; nothing more to do. If
                it is not approved, you will see the reason here and can send it again.
              </Note>
              <Button
                variant="ghost"
                onClick={() =>
                  Promise.all([
                    qc.invalidateQueries({ queryKey: qk.me }),
                    qc.invalidateQueries({ queryKey: qk.paymentRequests('activation') }),
                  ])
                }
              >
                Check status again
              </Button>
              {help ? (
                <a
                  href={help}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-xl border-[1.5px] border-g bg-white text-sm font-bold text-g no-underline"
                >
                  Get help
                </a>
              ) : null}
            </div>
          ) : (
            <>
              <Tabs
                label="How to activate"
                value={method}
                onChange={setMethod}
                items={[
                  { value: 'pay', label: amount !== undefined ? `Pay ${formatMoney(amount)}` : 'Pay' },
                  { value: 'pin', label: 'Use a PIN' },
                ]}
              />
              {method === 'pay' ? <PayTab /> : <PinTab userCode={me.data.user_code} />}
            </>
          )}
        </>
      )}
    </MemberPage>
  );
}
