import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { qk } from '@/api/keys';
import { pinsApi } from '@/api/pins';
import { refreshMoney } from '@/api/queryClient';
import { walletApi } from '@/api/wallet';
import { useMe } from '@/auth/session';
import { AppLoading } from '@/app/AppLoading';
import { TopBar } from '@/components/layout/TopBar';
import {
  Button,
  Card,
  Chip,
  CopyButton,
  ErrorBox,
  FilePicker,
  Money,
  Note,
  Sheet,
  Skeleton,
  TextField,
} from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { useSingleFlight } from '@/lib/useSingleFlight';
import * as v from '@/lib/validators';
import { useCompany, useConfig } from '@/features/auth/usePublic';
import { PayDetails } from '@/features/money/PayDetails';
import { latestRequest, useActivationRequests } from './useActivation';

/** "Have a PIN?" A PIN must already be in this member's account (sent by the sponsor). Vinay, 15 Oct. */
function PinSheet({ open, onClose, userCode }: { open: boolean; onClose: () => void; userCode: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  const ready = useQuery({
    queryKey: qk.pins('ready'),
    queryFn: ({ signal }) => pinsApi.list('ready', signal),
    enabled: open,
    staleTime: 0,
  });

  const [activate, busy] = useSingleFlight(async () => {
    setError(null);
    try {
      await pinsApi.activate(userCode);
      await Promise.all([refreshMoney(qc), qc.invalidateQueries({ queryKey: qk.me })]);
      navigate('/', { replace: true });
    } catch (e) {
      // No answer: the ID may be active already. Refresh, never send a second PIN blindly.
      await Promise.all([qc.invalidateQueries({ queryKey: qk.me }), ready.refetch()]);
      setError(e);
    }
  });

  const count = ready.data?.total ?? 0;
  return (
    <Sheet open={open} onClose={onClose} title="Activate with a PIN" locked={busy}>
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
    </Sheet>
  );
}

export default function Activate() {
  const me = useMe();
  const config = useConfig();
  const company = useCompany();
  const requests = useActivationRequests();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [utr, setUtr] = useState('');
  const [utrErr, setUtrErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pinOpen, setPinOpen] = useState(false);

  const [send, sending] = useSingleFlight(async () => {
    setError(null);
    const u = v.utr.safeParse(utr);
    setUtrErr(u.success ? null : (u.error.issues[0]?.message ?? 'Enter the UTR.'));
    if (!file) setFileErr('Add the payment receipt or screenshot.');
    if (!u.success || !file) return;
    try {
      await walletApi.paymentRequest({ purpose: 'activation', utr: u.data, receipt: file });
      await qc.invalidateQueries({ queryKey: qk.paymentRequests('activation') });
      navigate('/activate/pending', { replace: true });
    } catch (e) {
      const res = await requests.refetch();
      const last = latestRequest(res.data?.rows);
      // Already waiting (409), or it reached the server but the answer was lost: show the status page.
      if (last?.status === 'pending' && e instanceof ApiError && (e.status === 409 || e.isNoAnswer)) {
        navigate('/activate/pending', { replace: true });
        return;
      }
      setError(e);
    }
  });

  if (me.isPending || requests.isPending) return <AppLoading />;
  if (!me.data) return <AppLoading />;
  const last = latestRequest(requests.data?.rows);
  if (last?.status === 'pending') return <Navigate to="/activate/pending" replace />;

  const amount = config.data?.activation_amount;
  const removeOn = me.data.remove_on;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg tab:my-8 tab:min-h-0 tab:max-w-[600px] tab:overflow-hidden tab:rounded-3xl tab:border tab:border-line tab:shadow-xl">
      <TopBar
        title="Activate your ID"
        subtitle={`${me.data.user_code} · free account ready`}
        right={<Chip tone="wait">Not active</Chip>}
      />
      <Note tone="warn" className="mx-4 mt-3">
        Activate within {config.data?.inactive_remove_days ?? 30} days
        {removeOn ? ` (by ${formatDay(removeOn)})` : ''}, or this ID will be removed. Income, videos and your
        referral link start after activation.
      </Note>
      <form
        noValidate
        className="flex flex-1 flex-col gap-[11px] px-4 py-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {last?.status === 'rejected' && (
          <Note tone="bad" role="alert">
            <b>Your last payment was not approved.</b>
            {last.admin_remark ? ` Reason: ${last.admin_remark}.` : ''} Please send the correct UTR and
            receipt again.
          </Note>
        )}
        <button
          type="button"
          onClick={() => setPinOpen(true)}
          className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border-0 bg-goldbg px-3 py-2.5 text-goldink"
        >
          <span className="text-[13px] font-bold">Have a PIN? Use it instead</span>
          <span aria-hidden="true" className="text-xl">
            ›
          </span>
        </button>

        <Card>
          <div className="flex items-center justify-between gap-2.5">
            <h2 className="m-0 text-[14.5px] font-bold">
              First, pay {amount !== undefined ? <Money value={amount} /> : '…'}
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
          Your ID turns on when our team sees {amount !== undefined ? <Money value={amount} /> : 'the money'}{' '}
          in the bank.
        </span>
        {error ? <ErrorBox error={error} /> : null}
        <Button type="submit" busy={sending} className="mt-auto">
          Send for activation
        </Button>
        <Link to="/activate/details" className="self-center py-2 text-[13px] font-bold">
          My details and log out
        </Link>
      </form>
      <PinSheet open={pinOpen} onClose={() => setPinOpen(false)} userCode={me.data.user_code} />
    </div>
  );
}
