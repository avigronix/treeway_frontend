import { Link, Navigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/api/keys';
import { useMe } from '@/auth/session';
import { AppLoading } from '@/app/AppLoading';
import { TopBar } from '@/components/layout/TopBar';
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  CopyButton,
  ErrorBox,
  Money,
  Note,
  Step,
  Timeline,
} from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { useCompany } from '@/features/auth/usePublic';
import { latestRequest, useActivationRequests } from './useActivation';

const CHECK_EVERY_MS = 60_000;

export default function Pending() {
  // Checks again every minute while the app is open. When the ID turns active, the guard moves the member on.
  const me = useMe({ refetchInterval: CHECK_EVERY_MS });
  const requests = useActivationRequests();
  const company = useCompany();
  const qc = useQueryClient();

  if (me.isPending || requests.isPending) return <AppLoading />;
  if (!me.data) return <AppLoading />;
  const last = latestRequest(requests.data?.rows);
  if (!last && !requests.isError) return <Navigate to="/activate" replace />;

  const rejected = last?.status === 'rejected';
  const code = me.data.user_code;
  const wa = `https://wa.me/?text=${encodeURIComponent(`My Treeway ID: ${code}`)}`;
  const help = company.data?.whatsapp_group || (company.data?.phone ? `tel:${company.data.phone}` : '');

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg tab:my-8 tab:min-h-0 tab:max-w-[600px] tab:overflow-hidden tab:rounded-3xl tab:border tab:border-line tab:shadow-xl">
      <TopBar logo title="Your ID is ready" subtitle="We are checking your payment" />
      <main className="flex flex-1 flex-col gap-3.5 px-4 py-3.5">
        <Card className="items-center gap-1.5 p-5 text-center">
          <span className="text-[13px] text-mut">Your ID</span>
          <b className="num text-[34px] tracking-[.04em] text-g">{code}</b>
          <span className="text-[13px] text-mut">Use this ID and your password to log in</span>
          <div className="mt-1.5 grid w-full grid-cols-2 gap-2.5">
            <CopyButton text={code} label="Copy ID" className="w-full" />
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="hit44 inline-flex h-10 items-center justify-center rounded-[10px] border-[1.5px] border-g bg-white px-3.5 text-sm font-bold text-g no-underline"
            >
              Save on WhatsApp
            </a>
          </div>
        </Card>

        <Card className="gap-4">
          <h2 className="m-0 text-[14.5px] font-bold">When will my ID be active?</h2>
          {requests.isError ? (
            <ErrorBox error={requests.error} onRetry={() => requests.refetch()} />
          ) : (
            <Timeline>
              <Step n={1} state="done">
                <b className="text-[13px]">Free account created</b>
                {me.data.sponsor_name && (
                  <span className="text-xs text-mut">
                    Sponsor: {me.data.sponsor_name} ({me.data.sponsor_code})
                  </span>
                )}
              </Step>
              <Step n={2} state={rejected ? 'bad' : 'now'}>
                <b className="text-[13px]">
                  {rejected ? 'Payment not approved' : 'Checking your '}
                  {!rejected && last ? <Money value={last.amount} /> : null}
                  {!rejected ? ' payment' : ''}
                </b>
                {last && (
                  <span className="text-xs text-mut">
                    UTR {last.utr} · {formatWhen(last.created_at)}
                  </span>
                )}
                {rejected ? (
                  <>
                    <Chip tone="bad" className="self-start">
                      Rejected
                    </Chip>
                    {last?.admin_remark && <span className="text-[13px]">Reason: {last.admin_remark}</span>}
                  </>
                ) : (
                  <Chip tone="wait" className="self-start">
                    Waiting
                  </Chip>
                )}
              </Step>
              <Step n={3} state="todo">
                <b className="text-[13px] text-mut">ID active</b>
                <span className="text-xs text-mut">Income, videos and referral link start</span>
              </Step>
            </Timeline>
          )}
        </Card>

        {rejected ? (
          <Note tone="bad">Send the correct UTR and receipt again. Your ID stays the same.</Note>
        ) : (
          <Note tone="bad">
            <b>If the payment is rejected:</b> you will see the reason here. Send the correct UTR and receipt
            again. Your ID stays the same.
          </Note>
        )}

        <div className="mt-auto flex flex-col gap-2.5">
          {rejected ? (
            <ButtonLink to="/activate">Send UTR again</ButtonLink>
          ) : (
            <Button
              onClick={() =>
                Promise.all([
                  qc.invalidateQueries({ queryKey: qk.me }),
                  qc.invalidateQueries({ queryKey: qk.paymentRequests('activation') }),
                ])
              }
            >
              Check status again
            </Button>
          )}
          {help ? (
            <a
              href={help}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[52px] items-center justify-center rounded-xl border-[1.5px] border-g bg-white text-base font-bold text-g no-underline"
            >
              Get help
            </a>
          ) : null}
          <Link to="/activate/details" className="self-center py-2 text-[13px] font-bold">
            My details and log out
          </Link>
        </div>
      </main>
    </div>
  );
}
