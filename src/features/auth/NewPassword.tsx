import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users';
import { endSession, startSession, useMe } from '@/auth/session';
import { useToken } from '@/auth/token';
import { AppLoading } from '@/app/AppLoading';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Card, ErrorBox, Note, PasswordField } from '@/components/ui';
import { useSingleFlight } from '@/lib/useSingleFlight';
import * as v from '@/lib/validators';
import { AuthPage } from './AuthShell';

// Treeway support set this member's password (Vinay, 28 Oct): the member must choose their own before anything
// else (the server answers 403 "NewPassword" to every other screen until then). The text never says support
// changed it (Vinay, 28 Oct: no notice to the member).

const firstError = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? undefined : r.error?.issues[0]?.message;

export default function NewPassword() {
  const token = useToken();
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [given, setGiven] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [errs, setErrs] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<unknown>(null);

  const [save, saving] = useSingleFlight(async () => {
    setError(null);
    const e = {
      given: given ? undefined : 'Enter your current password.',
      pw: firstError(v.password.safeParse(pw)) ?? (pw === given ? 'Choose a different password.' : undefined),
      pw2: pw === pw2 ? undefined : 'Passwords do not match.',
    };
    setErrs(e);
    if (Object.values(e).some(Boolean)) return;
    try {
      const r = await usersApi.changePassword(given, pw);
      startSession(qc, r.token); // fresh start: nothing cached from before
      navigate('/', { replace: true });
    } catch (err) {
      setError(err);
    }
  });

  if (!token) return <Navigate to="/login" replace />;
  if (me.isPending) return <AppLoading />;
  if (me.data && !me.data.must_change_password) return <Navigate to="/" replace />;

  return (
    <AuthPage>
      <TopBar title="Set your own password" />
      <form
        noValidate
        className="flex flex-1 flex-col gap-3.5 bg-bg px-4 py-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Note>
          Choose your own password for your ID{me.data ? ` ${me.data.user_code}` : ''}. Only you should know
          it.
        </Note>
        <Card className="gap-3">
          <PasswordField
            label="Current password"
            autoComplete="current-password"
            value={given}
            onChange={(e) => setGiven(e.target.value)}
            error={errs.given}
          />
          <PasswordField
            label="Your new password"
            autoComplete="new-password"
            help="At least 8 characters, with letters and numbers"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            error={errs.pw}
          />
          <PasswordField
            label="Type it again"
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            error={errs.pw2}
          />
        </Card>
        {error ? <ErrorBox error={error} /> : null}
        <Button type="submit" busy={saving} className="mt-auto">
          Save my password
        </Button>
        <Button
          variant="ghost"
          disabled={saving}
          onClick={() => {
            endSession(qc);
            navigate('/login', { replace: true });
          }}
        >
          Log out
        </Button>
      </form>
    </AuthPage>
  );
}
