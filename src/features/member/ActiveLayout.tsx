import { Outlet, useLocation, useNavigate } from 'react-router';
import { useMe } from '@/auth/session';
import { VideoLockModal, VideosDoneModal } from '@/features/videos/VideoModals';
import { useVideoLock } from '@/features/videos/useVideoLock';
import { ActivateBanner, ActivateFirst } from './InactiveParts';
import { isLockedForInactive } from './inactiveLock';

/** Every member page. An ACTIVE member gets the locked daily videos over the app until today's are done.
 * An INACTIVE member (Vinay 20 Oct) may look around: a banner on top, and pages that need an active ID show
 * "Activate your ID first". (The server says locked = false for an inactive ID, so no video lock either.) */
export default function ActiveLayout() {
  const me = useMe().data;
  if (me?.status === 'inactive') return <InactiveLayout />;
  return <LockedVideosLayout />;
}

function InactiveLayout() {
  const { pathname } = useLocation();
  return (
    <>
      {/* Home and "My ID Activation" show the full status themselves. */}
      {pathname === '/' || pathname.startsWith('/activate') ? null : <ActivateBanner />}
      {isLockedForInactive(pathname) ? <ActivateFirst /> : <Outlet />}
    </>
  );
}

function LockedVideosLayout() {
  const lock = useVideoLock();
  const navigate = useNavigate();
  const today = lock.today.data;
  const locked = lock.show || !!lock.done;

  return (
    <>
      {/* While locked, the app behind cannot be used (inert) or read out (aria-hidden). */}
      <div inert={locked || undefined} aria-hidden={locked || undefined}>
        <Outlet />
      </div>
      {lock.done ? (
        <VideosDoneModal
          result={lock.done}
          today={today}
          onClose={() => {
            lock.close();
            navigate('/', { replace: true });
          }}
        />
      ) : lock.show && today ? (
        <VideoLockModal today={today} answeredAt={lock.today.dataUpdatedAt} onAllDone={lock.finish} />
      ) : null}
    </>
  );
}
