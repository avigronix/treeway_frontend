import { useNavigate } from 'react-router';
import { useEndSession, useMe } from '@/auth/session';
import { AppLoading } from '@/app/AppLoading';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Card, KeyValue } from '@/components/ui';
import { formatFullDate } from '@/lib/dates';

/** Profile-lite for an inactive ID: read only, plus Log out. */
export default function MyDetails() {
  const me = useMe();
  const endSession = useEndSession();
  const navigate = useNavigate();
  if (!me.data) return <AppLoading />;
  const m = me.data;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg tab:my-8 tab:min-h-0 tab:max-w-[600px] tab:overflow-hidden tab:rounded-3xl tab:border tab:border-line tab:shadow-xl">
      <TopBar back="/activate" title="My details" subtitle={`${m.user_code} · not active yet`} />
      <main className="flex flex-1 flex-col gap-3 px-4 py-3.5">
        <Card>
          <KeyValue k="Name">{m.full_name}</KeyValue>
          <KeyValue k="Member ID">{m.user_code}</KeyValue>
          <KeyValue k="Mobile">{m.mobile}</KeyValue>
          <KeyValue k="Email">{m.email}</KeyValue>
          {m.sponsor_name && (
            <KeyValue k="Sponsor">
              {m.sponsor_name} ({m.sponsor_code})
            </KeyValue>
          )}
          <KeyValue k="Joined">{formatFullDate(m.created_at)}</KeyValue>
        </Card>
        <Button
          variant="danger"
          className="mt-auto"
          onClick={() => {
            endSession();
            navigate('/login', { replace: true });
          }}
        >
          Log out
        </Button>
      </main>
    </div>
  );
}
