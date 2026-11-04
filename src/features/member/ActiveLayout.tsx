import type { ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useMe } from '@/auth/session';
import { BannerModal } from '@/features/content/BannerModal';
import { useBannerPopup } from '@/features/content/useBanners';
import { VideoLockModal, VideosDoneModal } from '@/features/videos/VideoModals';
import { useVideoLock } from '@/features/videos/useVideoLock';
import { ActivateBanner, ActivateFirst } from './InactiveParts';
import { isLockedForInactive } from './inactiveLock';

/** Every member page. Every member gets the locked daily videos over the app until today's are done (an inactive
 * ID too, Vinay 3 Nov: the server says when). An INACTIVE member (Vinay 20 Oct) may look around: a banner on top,
 * and pages that need an active ID show "Activate your ID first". */
export default function ActiveLayout() {
  const inactive = useMe().data?.status === 'inactive';
  // A new layout on activation: the lock must come from a fresh answer (Day 1), never the inactive one.
  return (
    <LockedVideosLayout key={inactive ? 'inactive' : 'active'}>
      {inactive ? <InactivePages /> : <Outlet />}
    </LockedVideosLayout>
  );
}

function InactivePages() {
  const { pathname } = useLocation();
  return (
    <>
      {/* Home and "My ID Activation" show the full status themselves. */}
      {pathname === '/' || pathname.startsWith('/activate') ? null : <ActivateBanner />}
      {isLockedForInactive(pathname) ? <ActivateFirst /> : <Outlet />}
    </>
  );
}

function LockedVideosLayout({ children }: { children: ReactNode }) {
  const lock = useVideoLock();
  const navigate = useNavigate();
  const today = lock.today.data;
  const locked = lock.show || !!lock.done;
  // Today's video is showing: the Home banners pop up over it first (Vinay 22 Oct).
  const banner = useBannerPopup(!lock.done && lock.show && !!today);

  return (
    <>
      {/* While locked, the app behind cannot be used (inert) or read out (aria-hidden). */}
      <div inert={locked || undefined} aria-hidden={locked || undefined}>
        {children}
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
        <VideoLockModal
          today={today}
          answeredAt={lock.today.dataUpdatedAt}
          onAllDone={lock.finish}
          behind={banner.open}
        />
      ) : null}
      {banner.open ? <BannerModal list={banner.list} onClose={banner.close} /> : null}
    </>
  );
}
