import { Link } from 'react-router';
import { uploadUrl, type Banner } from '@/api/content';
import { cx } from '@/lib/cx';
import { useLiveBanners } from './useBanners';

// Live banners (Home: "everyone", Login page: "login"). Nothing shows while loading, on error or when
// there is none: a banner is never worth an error box.

const STRIP_PIC =
  'aspect-[2/1] max-h-[220px] w-full rounded-2xl border border-line bg-track object-cover tab:aspect-[4/1]';

/** `className` replaces the strip's look (the popup shows a taller 2:1 picture everywhere). */
function Pic({ b, className = STRIP_PIC }: { b: Banner; className?: string }) {
  return <img src={uploadUrl(b.image)} alt={b.title} loading="lazy" className={className} />;
}

/** The banners side by side (swipe when more than one). A tap follows the admin's link. */
export function BannerList({
  list,
  className,
  picClassName,
  onOpen,
}: {
  list: Banner[];
  className?: string;
  picClassName?: string;
  /** Called when a banner link is tapped (the modal closes itself). */
  onOpen?: () => void;
}) {
  return (
    <ul
      aria-label="Offers and news"
      className={cx('m-0 flex list-none snap-x snap-mandatory gap-2.5 overflow-x-auto p-0', className)}
    >
      {list.map((b) => (
        <li key={b.id} className={cx('snap-start', list.length > 1 ? 'w-[85%] flex-none' : 'w-full')}>
          {!b.link_url ? (
            <Pic b={b} className={picClassName} />
          ) : b.link_url.startsWith('/') ? (
            <Link to={b.link_url} aria-label={b.title} onClick={onOpen}>
              <Pic b={b} className={picClassName} />
            </Link>
          ) : (
            <a
              href={b.link_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={b.title}
              onClick={onOpen}
            >
              <Pic b={b} className={picClassName} />
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
