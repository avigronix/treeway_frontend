import { useLocation, useNavigate } from 'react-router';
import { MSG } from '@/api/client';
import { useEndSession } from '@/auth/session';
import { Button, Note } from '@/components/ui';
import { AuthPage } from './AuthShell';
import { useCompany } from './usePublic';

/** Shown when the API says 403 "Blocked" (the token is already cleared by the API client). */
export default function Blocked() {
  const { state } = useLocation() as { state: { msg?: string } | null };
  const company = useCompany();
  const endSession = useEndSession();
  const navigate = useNavigate();
  const phone = company.data?.phone;

  return (
    <AuthPage>
      <main className="flex flex-1 flex-col justify-center gap-3.5 px-[22px] py-6">
        <img
          src="/icons/logo-header.webp"
          alt="Treeway"
          width={120}
          height={80}
          className="h-20 w-[120px] object-contain"
        />
        <h1 className="m-0 text-[22px] font-bold">Your ID is blocked</h1>
        <Note tone="bad" role="alert">
          {state?.msg || MSG.blocked}
        </Note>
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="inline-flex h-[52px] items-center justify-center rounded-xl bg-g text-base font-bold text-white no-underline"
          >
            Call support · {phone}
          </a>
        ) : null}
        <Button
          variant="ghost"
          onClick={() => {
            endSession();
            navigate('/login', { replace: true });
          }}
        >
          Back to login
        </Button>
      </main>
    </AuthPage>
  );
}
