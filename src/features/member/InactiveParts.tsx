import { Link } from 'react-router';
import { ButtonLink, Card, Chip, CopyButton } from '@/components/ui';
import { latestRequest, useActivationRequests } from '@/features/activation/useActivation';
import { MemberPage } from './MemberPage';

/** On top of every member page while the ID is not active: what to do next, one tap away. */
export function ActivateBanner() {
  const requests = useActivationRequests();
  const last = latestRequest(requests.data?.rows);
  const pending = last?.status === 'pending';
  const rejected = last?.status === 'rejected';
  return (
    <div
      role="region"
      aria-label="Your ID is not active"
      className="flex items-center justify-between gap-3 bg-goldbg px-4 py-2.5 text-goldink"
    >
      <span className="min-w-0 text-[13px] leading-snug">
        <b>
          {pending
            ? 'Payment sent: we are checking it.'
            : rejected
              ? 'Your payment was not approved.'
              : 'Your ID is not active yet.'}
        </b>{' '}
        {pending ? 'You can look around meanwhile.' : 'You can look around; activate to start earning.'}
      </span>
      <Link
        to="/activate"
        className="hit44 flex-none rounded-[10px] bg-g px-3 py-2 text-[13px] font-bold whitespace-nowrap text-white no-underline"
      >
        {pending ? 'See status' : rejected ? 'Send again' : 'Activate ID'}
      </Link>
    </div>
  );
}

/** Instead of a page that needs an active ID. */
export function ActivateFirst() {
  return (
    <MemberPage title="Activate your ID first" back="/" narrow>
      <Card className="items-center gap-2.5 p-5 text-center">
        <Chip tone="wait">Not active</Chip>
        <h2 className="m-0 text-[17px] font-bold">This needs an active ID</h2>
        <p className="m-0 text-[14px] text-mut">
          Videos, withdrawals, funds, PINs, sending money, shop orders and the doctor start after your ID is
          active. Until then you can look around.
        </p>
        <ButtonLink to="/activate" className="mt-1 w-full">
          Activate my ID
        </ButtonLink>
        <ButtonLink to="/" variant="ghost" className="w-full">
          Back to Home
        </ButtonLink>
      </Card>
    </MemberPage>
  );
}

/** Home of an inactive ID: the new ID, its status and the next step (Vinay 20 Oct). */
export function IdStatusCard({ code }: { code: string }) {
  const requests = useActivationRequests();
  const last = latestRequest(requests.data?.rows);
  const pending = last?.status === 'pending';
  const rejected = last?.status === 'rejected';
  return (
    <Card className="gap-3 border-gold" role="region" aria-label="My ID status">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-col">
          <span className="text-[13px] text-mut">Your ID</span>
          <b className="num text-[24px] tracking-[.04em] text-g">{code}</b>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Chip tone={rejected ? 'bad' : 'wait'}>
            {pending ? 'Payment being checked' : rejected ? 'Payment not approved' : 'Not active'}
          </Chip>
          <CopyButton text={code} label="Copy ID" />
        </div>
      </div>
      <ol className="m-0 flex flex-col gap-1 pl-5 text-[13px]">
        <li>Free account created ✓</li>
        <li className={pending ? 'text-mut' : 'font-bold'}>
          {pending
            ? 'Payment sent: our team is checking it with the bank'
            : rejected
              ? 'Your payment was not approved: see the reason and send it again'
              : 'Activate: pay by UPI / bank, or use a PIN from your sponsor'}
        </li>
        <li className="text-mut">ID active: income, daily videos and your referral link start</li>
      </ol>
      <ButtonLink to="/activate" variant={pending ? 'gold' : 'primary'}>
        {pending ? 'See activation status' : 'Activate my ID'}
      </ButtonLink>
    </Card>
  );
}
