import { AdminTitle } from './AdminParts';
import { BannersPanel, ContactPanel } from './AdminBanners';
import { VideosPanel } from './AdminVideos';

// J3 "Videos and banners". Daily videos first (members cannot earn the ₹20 without them), then the
// Home / login banners and the Contact us messages.
export default function AdminContent() {
  return (
    <>
      <AdminTitle
        title="Videos, banners and messages"
        sub="Daily videos for the login window, Home banners and Contact us messages"
      />
      <VideosPanel />
      <BannersPanel />
      <ContactPanel />
    </>
  );
}
