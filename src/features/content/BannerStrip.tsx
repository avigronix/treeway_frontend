import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { contentApi, uploadUrl, type Banner } from '@/api/content';
import { cx } from '@/lib/cx';

// Live banners (Home: "everyone", Login page: "login"). Nothing shows while loading, on error or when
// there is none: a banner is never worth an error box.

function Pic({ b }: { b: Banner }) {
  return (
    <img
      src={uploadUrl(b.image)}
      alt={b.title}
      loading="lazy"
      className="aspect-[2/1] max-h-[220px] w-full rounded-2xl border border-line bg-track object-cover tab:aspect-[4/1]"
    />
  );
}

export function BannerStrip({ audience, className }: { audience: 'everyone' | 'login'; className?: string }) {
  const q = useQuery({
    queryKey: ['banners', audience],
    queryFn: ({ signal }) => contentApi.banners(audience, signal),
    staleTime: 5 * 60_000,
  });
  const list = q.data ?? [];
  if (!list.length) return null;
  return (
    <ul
      aria-label="Offers and news"
      className={cx('m-0 flex list-none snap-x snap-mandatory gap-2.5 overflow-x-auto p-0', className)}
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
