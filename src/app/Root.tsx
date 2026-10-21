import { useEffect } from 'react';
import { Outlet, useNavigate, useRouteError, isRouteErrorResponse } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { onAuthEvent } from '@/auth/token';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { UpdateToast } from '@/components/layout/UpdateToast';
import { isStaleChunkError, reloadOnceForNewVersion } from '@/lib/swUpdate';
import { ButtonLink, Note } from '@/components/ui';

/** App shell: listens for "log in again" / "blocked" from the API client and moves the member. */
export function Root() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(
    () =>
      onAuthEvent((e) => {
        qc.clear(); // never keep one member's data after their session ends
        if (e.type === 'logout') navigate('/login', { replace: true, state: { msg: e.msg } });
        else navigate('/blocked', { replace: true, state: { msg: e.msg } });
      }),
    [navigate, qc],
  );

  return (
    <>
      <OfflineBanner />
      <Outlet />
      <UpdateToast />
    </>
  );
}

export function RouteError() {
  const err = useRouteError();
  const notFound = isRouteErrorResponse(err) && err.status === 404;
  // A new release removed this page's old code file: reload once to get the new app.
  if (isStaleChunkError(err) && reloadOnceForNewVersion()) return null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-3 px-4">
      <h1 className="m-0 text-[22px] font-bold">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
      <Note tone={notFound ? 'info' : 'bad'}>
        {notFound
          ? 'This page does not exist.'
          : 'Please reload the page. If it happens again, contact support.'}
      </Note>
      <ButtonLink to="/" reloadDocument={!notFound}>
        Go to Home
      </ButtonLink>
    </main>
  );
}
