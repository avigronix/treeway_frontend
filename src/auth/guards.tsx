import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { AppLoading } from '@/app/AppLoading';
import { ErrorBox } from '@/components/ui';
import { accessOf, canOpen, homeOf, type Area } from './access';
import { useMe } from './session';
import { authReason, useToken } from './token';

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-3 px-4">
      {children}
    </main>
  );
}

/** Login, register, forgot: a logged-in person is sent to their own home. */
export function GuestOnly() {
  const token = useToken();
  const me = useMe();
  if (!token) return <Outlet />;
  if (me.data) return <Navigate to={homeOf(accessOf(me.data))} replace />;
  if (me.isError) return <Outlet />; // a dead token is cleared by the API client; let them log in
  return <AppLoading />;
}

/** Logged in AND allowed in this area; anyone else goes to their own home (or to Login). */
export function RequireArea({ area }: { area: Area }) {
  const token = useToken();
  const me = useMe();
  const location = useLocation();

  if (!token) {
    // Session ended by the server (401 / 403 Blocked): go where the reason says, with its message.
    const reason = authReason();
    if (reason?.type === 'blocked') return <Navigate to="/blocked" replace state={{ msg: reason.msg }} />;
    return <Navigate to="/login" replace state={{ from: location.pathname, msg: reason?.msg }} />;
  }
  if (me.isPending) return <AppLoading />;
  if (me.isError) {
    return (
      <Shell>
        <ErrorBox error={me.error} onRetry={() => me.refetch()} />
      </Shell>
    );
  }
  const access = accessOf(me.data);
  if (!canOpen(access, area)) return <Navigate to={homeOf(access)} replace />;
  return <Outlet />;
}
