import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doctorApi, type DoctorInboxRow } from '@/api/doctor';
import { endSession, useMe } from '@/auth/session';
import { Button, Card, Chip, Empty, ErrorBox, Note, SkeletonList, Tabs } from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { cx } from '@/lib/cx';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/layout/icons';
import { useIsTablet, useIsWide } from '@/lib/useMediaQuery';
import { DoctorRequest } from './DoctorRequest';

// Doctor's own simple area (role DOCTOR): "My requests" from GET /doctor/inbox; tap one to open it and write
// the prescription (?id= keeps it open on reload and Back).

type Status = 'waiting' | 'answered';

function Row({ r, onOpen }: { r: DoctorInboxRow; onOpen: () => void }) {
  const late = r.status === 'waiting' && (r.waiting_hours ?? 0) >= 24;
  return (
    <li className="border-b border-line2 last:border-b-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full cursor-pointer flex-col gap-1 bg-transparent px-3.5 py-3 text-left"
      >
        <div className="flex w-full items-center justify-between gap-2.5">
          <b className="text-[14.5px]">
            {r.member_name}
            {r.age ? ` · ${r.age} years` : ''}
          </b>
          {r.status === 'waiting' ? (
            <Chip tone={late ? 'bad' : 'wait'}>{late ? `Waiting ${r.waiting_hours} h` : 'Waiting'}</Chip>
          ) : (
            <Chip tone="ok">Answered</Chip>
          )}
        </div>
        <span className="text-[13px]">"{r.problem}"</span>
        <span className="text-xs text-mut">
          {[r.state, formatWhen(r.created_at), r.files.length ? `${r.files.length} photo or report` : null]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </button>
    </li>
  );
}

export default function DoctorHome() {
  const me = useMe().data;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('waiting');
  const [params, setParams] = useSearchParams();
  const openId = Number(params.get('id')) || null;
  const inbox = useQuery({
    queryKey: ['doctor', 'inbox', status],
    queryFn: ({ signal }) => doctorApi.inbox(status, signal),
    refetchInterval: 60_000,
  });
  const counts = inbox.data?.counts;

  const list = (
    <>
      <Tabs
        label="Requests"
        value={status}
        onChange={setStatus}
        items={[
          { value: 'waiting', label: 'Waiting', count: counts?.waiting },
          { value: 'answered', label: 'Answered' },
        ]}
      />
      {counts && (
        <span className="text-[13px] text-mut">Answered this month: {counts.answered_this_month}</span>
      )}
      {inbox.isError ? (
        <ErrorBox error={inbox.error} onRetry={() => inbox.refetch()} />
      ) : !inbox.data ? (
        <SkeletonList rows={4} />
      ) : inbox.data.rows.length === 0 ? (
        <Empty title={status === 'waiting' ? 'No request is waiting' : 'No answered request yet'} />
      ) : (
        <Card flat>
          <ul className={cx('m-0 list-none p-0')}>
            {inbox.data.rows.map((r) => (
              <Row key={r.id} r={r} onOpen={() => setParams({ id: String(r.id) })} />
            ))}
          </ul>
        </Card>
      )}
      <Note>You see only the name, age, state, problem and files. Tap a request to write the medicine.</Note>
    </>
  );
  const tablet = useIsTablet();
  const wide = useIsWide();
  const logout = () => {
    endSession(qc);
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      label="Doctor menu"
      groups={[{ items: [{ to: '/doctor', label: 'Doctor requests', icon: Icon.doctor }] }]}
      crumbs={
        openId
          ? [{ label: 'Doctor requests', to: '/doctor' }, { label: `Request #${openId}` }]
          : [{ label: 'Doctor requests' }]
      }
      user={{ name: me?.full_name ?? '', role: me ? `Doctor · ${me.user_code}` : 'Doctor', onLogout: logout }}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col tab:min-h-0 tab:max-w-[1248px]">
        {tablet ? (
          <h1 className="m-0 px-6 pt-6 text-[26px] leading-[1.2] font-bold">Doctor requests</h1>
        ) : (
          <header className="flex min-h-[62px] items-center gap-2 border-b border-line bg-white px-3 py-2">
            <img
              src="/icons/logo-header.webp"
              alt="Treeway"
              width={60}
              height={40}
              className="h-10 w-[60px] object-contain"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <h1 className="m-0 truncate text-lg leading-[1.25] font-bold">Doctor requests</h1>
              <small className="truncate text-[12.5px] text-mut">
                {me ? `${me.full_name} · ${me.user_code}` : ' '}
              </small>
            </div>
            <Button size="sm" variant="ghost" onClick={logout}>
              Log out
            </Button>
          </header>
        )}
        <main className="flex flex-1 flex-col gap-3 px-4 py-3.5 tab:px-6 tab:pt-5 tab:pb-10">
          {openId ? (
            <div className="wide:grid wide:grid-cols-[minmax(0,380px)_minmax(0,1fr)] wide:items-start wide:gap-6">
              {wide && <div className="flex flex-col gap-3">{list}</div>}
              <div className="flex min-w-0 flex-col gap-3">
                <DoctorRequest key={openId} id={openId} onBack={() => setParams({})} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 tab:max-w-[760px]">{list}</div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
