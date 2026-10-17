import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { uploadUrl } from '@/api/content';
import { shopApi, shopKeys, type Product } from '@/api/shop';
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  ErrorBox,
  Money,
  Note,
  Pills,
  SkeletonList,
  TextField,
} from '@/components/ui';
import { useDebounced } from '@/lib/useDebounced';
import { useConfig } from '@/features/auth/usePublic';
import { useWalletSummary } from '@/features/member/data';
import { MemberPage } from '@/features/member/MemberPage';
import { cart, cartCount, cartTotal, useMemberCart } from './cart';

// D2 "Shop": products bought with the Product Wallet (a shortfall comes from the Fund / Income Wallet).

function ProductCard({ p, qty }: { p: Product; qty: number }) {
  const img = p.images[0];
  return (
    <Card className="gap-2 p-2.5">
      {img ? (
        <img
          src={uploadUrl(img)}
          alt={p.name}
          loading="lazy"
          className="aspect-square w-full rounded-xl bg-track object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-track text-xs text-mut">
          No photo
        </div>
      )}
      <b className="line-clamp-2 text-sm">{p.name}</b>
      <span className="text-[13px]">
        <Money value={p.mrp} /> <small className="text-mut">MRP</small>
      </span>
      {!p.in_stock ? (
        <Chip tone="muted" className="self-start">
          Out of stock
        </Chip>
      ) : qty > 0 ? (
        <div className="flex items-center justify-between gap-1">
          <Button
            size="sm"
            variant="ghost"
            aria-label={`One less ${p.name}`}
            onClick={() => cart.setQty(p.id, qty - 1)}
          >
            −
          </Button>
          <b aria-label={`${p.name} in cart`}>{qty}</b>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`One more ${p.name}`}
            onClick={() => cart.setQty(p.id, qty + 1)}
          >
            +
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={() => cart.add({ id: p.id, name: p.name, mrp: p.mrp, image: img ?? null })}
        >
          Add to cart
        </Button>
      )}
    </Card>
  );
}

export default function Shop() {
  const lines = useMemberCart();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const q = useDebounced(search.trim(), 400);
  const product = useWalletSummary().data?.product;
  const max = useConfig().data?.shop.order_max;
  const cats = useQuery({
    queryKey: shopKeys.categories,
    queryFn: ({ signal }) => shopApi.categories(signal),
  });
  const list = useQuery({
    queryKey: shopKeys.products({ q, cat }),
    queryFn: ({ signal }) => shopApi.products({ search: q || undefined, category: cat || undefined }, signal),
    placeholderData: (p) => p,
  });
  const total = cartTotal(lines); // shown only; the server prices the order again
  const count = cartCount(lines);

  return (
    <MemberPage title="Shop" subtitle="Buy with your Product Wallet" back="/" className="gap-3 pb-28">
      <Card className="flex-row items-center justify-between gap-2 py-3">
        <span className="text-[13px] text-mut">Product Wallet</span>
        <b>{product === undefined ? '…' : <Money value={product} />}</b>
      </Card>
      <div className="flex items-end gap-2">
        <TextField
          label="Search products"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fieldClassName="flex-1"
        />
        <Link to="/shop/orders" className="pb-3 text-[13px] font-bold">
          My orders
        </Link>
      </div>
      {cats.data && cats.data.length > 0 && (
        <Pills
          label="Category"
          value={cat}
          onChange={setCat}
          items={[{ value: '', label: 'All' }, ...cats.data.map((c) => ({ value: c, label: c }))]}
        />
      )}
      {list.isError ? (
        <ErrorBox error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <SkeletonList rows={4} />
      ) : list.data.rows.length === 0 ? (
        <Note>{q || cat ? 'No product found.' : 'No products yet. Please check again soon.'}</Note>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 desk:grid-cols-4">
          {list.data.rows.map((p) => (
            <ProductCard key={p.id} p={p} qty={lines.find((l) => l.id === p.id)?.qty ?? 0} />
          ))}
        </div>
      )}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[64px] z-20 mx-auto flex max-w-[480px] items-center justify-between gap-3 border-t border-line bg-white px-4 py-3 tab:inset-x-auto tab:right-6 tab:bottom-6 tab:w-[440px] tab:rounded-2xl tab:border tab:shadow-xl">
          <span className="flex flex-col text-[13px]">
            <b>
              Cart: {count} item{count === 1 ? '' : 's'} · <Money value={total} />
            </b>
            {max !== undefined && (
              <small className={total > max ? 'font-bold text-b' : 'text-mut'}>
                Up to <Money value={max} /> per order · delivery extra
              </small>
            )}
          </span>
          <ButtonLink to="/shop/checkout" size="sm">
            Next ›
          </ButtonLink>
        </div>
      )}
    </MemberPage>
  );
}
