import { Link } from 'react-router';
import { ButtonLink, Card, Chip } from '@/components/ui';
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
        to={pending ? '/activate/pending' : '/activate'}
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
