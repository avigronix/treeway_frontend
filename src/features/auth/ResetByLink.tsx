import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '@/api/client';
import { usersApi } from '@/api/users';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Card, ErrorBox, Note, PasswordField } from '@/components/ui';
import { useSingleFlight } from '@/lib/useSingleFlight';
import * as v from '@/lib/validators';
import { AuthPage } from './AuthShell';

/** The link from "Send password reset" (admin, 16 Oct): set a new password. Works once, for 24 hours. */
export default function ResetByLink() {
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [errs, setErrs] = useState<{ pw?: string; pw2?: string }>({});
  const [error, setError] = useState<unknown>(null);
  const [dead, setDead] = useState(token.length < 20);

  const [save, saving] = useSingleFlight(async () => {
    setError(null);
    const p = v.password.safeParse(pw);
    const e = {
      pw: p.success ? undefined : p.error.issues[0]?.message,
      pw2: pw === pw2 ? undefined : 'Passwords do not match.',
    };
    setErrs(e);
    if (e.pw || e.pw2) return;
    try {
      await usersApi.resetByLink(token, pw);
      navigate('/login', {
        replace: true,
        state: { msg: 'Password changed. Please log in with the new password.' },
      });
    } catch (err) {
      if (err instanceof ApiError && err.error === 'LinkExpired') setDead(true);
      else setError(err);
    }
  });

  return (
    <AuthPage>
      <TopBar back="/login" title="Set a new password" />
      <form
        noValidate
        className="flex flex-1 flex-col gap-3.5 bg-bg px-4 py-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!dead) void save();
        }}
      >
        {dead ? (
          <>
            <Note tone="warn">
              This link has expired or was already used. Ask Treeway support for a new one.
            </Note>
            <Link to="/forgot" className="text-sm font-bold">
              Or use Forgot password with your member ID ›
            </Link>
          </>
        ) : (
          <>
            <Card className="gap-3">
              <PasswordField
                label="New password"
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
              Save new password
            </Button>
          </>
        )}
      </form>
    </AuthPage>
  );
}
