import { Link } from 'react-router';
import { uploadUrl, type Banner } from '@/api/content';
import { cx } from '@/lib/cx';
import { useLiveBanners } from './useBanners';

// Live banners (Home: "everyone", Login page: "login"). Nothing shows while loading, on error or when
// there is none: a banner is never worth an error box. (The popup over today's video is BannerModal.)

// The picture keeps its own shape (never cropped, Vinay 31 Oct): full width, height from the image.
// A very tall picture is capped and shown whole (letterboxed) so it never pushes the page away.
const STRIP_PIC = 'block h-auto max-h-[60dvh] w-full rounded-2xl border border-line bg-track object-contain';

function Pic({ b }: { b: Banner }) {
  return <img src={uploadUrl(b.image)} alt={b.title} loading="lazy" className={STRIP_PIC} />;
}

/** The banners side by side (swipe when more than one). A tap follows the admin's link. */
function BannerList({ list, className }: { list: Banner[]; className?: string }) {
  return (
    <ul
      aria-label="Offers and news"
      className={cx(
        'm-0 flex list-none items-start snap-x snap-mandatory gap-2.5 overflow-x-auto p-0',
        className,
      )}
    >
      {list.map((b) => (
        <li key={b.id} className={cx('snap-start', list.length > 1 ? 'w-[85%] flex-none' : 'w-full')}>
          {!b.link_url ? (
            <Pic b={b} />
          ) : b.link_url.startsWith('/') ? (
            <Link to={b.link_url} aria-label={b.title}>
              <Pic b={b} />
            </Link>
          ) : (
            <a href={b.link_url} target="_blank" rel="noopener noreferrer" aria-label={b.title}>
              <Pic b={b} />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export function BannerStrip({ audience, className }: { audience: 'everyone' | 'login'; className?: string }) {
  const list = useLiveBanners(audience).data ?? [];
  if (!list.length) return null;
  return <BannerList list={list} className={className} />;
}
