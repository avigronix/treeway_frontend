import { Outlet, useNavigate } from 'react-router';
import { VideoLockModal, VideosDoneModal } from '@/features/videos/VideoModals';
import { useVideoLock } from '@/features/videos/useVideoLock';

/** Every page of an ACTIVE member. Shows the locked daily videos over the app until today's are done. */
export default function ActiveLayout() {
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
