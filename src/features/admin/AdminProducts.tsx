import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { uploadUrl } from '@/api/content';
import { shopAdminApi, type AdminProduct } from '@/api/shop';
import {
  Button,
  Chip,
  ErrorBox,
  FilePicker,
  Money,
  Note,
  Sheet,
  SkeletonList,
  TextAreaField,
  TextField,
  Empty,
} from '@/components/ui';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { useAdminRefresh } from './adminData';
import { Panel } from './AdminParts';
import { checkProduct } from './adminText';

// AdminShop "Products": add / edit, photos (keep, remove, add), stock + / −, on / off.

function ProductSheet({ p, onClose }: { p: AdminProduct | null; onClose: (msg?: string) => void }) {
  const refresh = useAdminRefresh();
  const [name, setName] = useState(p?.name ?? '');
  const [description, setDescription] = useState(p?.description ?? '');
  const [category, setCategory] = useState(p?.category ?? '');
  const [mrp, setMrp] = useState(p ? String(p.mrp) : '');
  const [stock, setStock] = useState(p ? '0' : '');
  const [active, setActive] = useState(p?.is_active ?? true);
  const [keep, setKeep] = useState<string[]>(p?.images ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [errs, setErrs] = useState<Partial<ReturnType<typeof checkProduct>>>({});
  const [error, setError] = useState<unknown>(null);

  const [save, saving] = useSingleFlight(async () => {
    const e = checkProduct({ name, mrp, stock }, !p, p?.stock ?? 0);
    setErrs(e);
    if (Object.values(e).some(Boolean)) return;
    setError(null);
    try {
      if (!p) {
        await shopAdminApi.addProduct(
          {
            name: name.trim(),
            description: description.trim(),
            category: category.trim(),
            mrp: mrp.trim(),
            is_active: active,
            stock: Number(stock),
          },
          files,
        );
        onClose('Product added.');
        return;
      }
      const changed: Parameters<typeof shopAdminApi.editProduct>[1] = {};
      if (name.trim() !== p.name) changed.name = name.trim();
      if (description.trim() !== p.description) changed.description = description.trim();
      if (category.trim() !== p.category) changed.category = category.trim();
      if (Number(mrp) !== p.mrp) changed.mrp = mrp.trim();
      if (active !== p.is_active) changed.is_active = active;
      if (Number(stock)) changed.stock_add = Number(stock);
      if (keep.length !== p.images.length) changed.keep_images = keep;
      if (!Object.keys(changed).length && !files.length) return onClose('Nothing changed.');
      await shopAdminApi.editProduct(p.id, changed, files);
      onClose('Product saved.');
    } catch (err) {
      setError(err);
    } finally {
      await refresh();
    }
  });

  return (
    <Sheet open onClose={() => onClose()} title={p ? 'Edit product' : 'New product'} locked={saving}>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errs.name} />
      <TextField
        label="Category"
        placeholder="Health, Personal care, Home…"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />
      <TextField
        label="MRP (₹)"
        inputMode="decimal"
        value={mrp}
        onChange={(e) => setMrp(e.target.value)}
        error={errs.mrp}
      />
      <TextField
        label={p ? `Add to stock (now ${p.stock}; use − to take away)` : 'Stock'}
        inputMode="numeric"
        value={stock}
        onChange={(e) => setStock(e.target.value.replace(/[^\d-]/g, ''))}
        error={errs.stock}
      />
      <TextAreaField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Members can buy it
      </label>
      {keep.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keep.map((img) => (
            <span key={img} className="flex flex-col items-center gap-1">
              <img
                src={uploadUrl(img)}
                alt=""
                className="h-16 w-16 rounded-lg border border-line object-cover"
              />
              <Button size="sm" variant="ghost" onClick={() => setKeep((k) => k.filter((x) => x !== img))}>
                Remove
              </Button>
            </span>
          ))}
        </div>
      )}
      {files.map((f, i) => (
        <span key={`${f.name}-${i}`} className="text-[13px]">
          ✓ {f.name}
        </span>
      ))}
      <FilePicker
        key={files.length}
        label="Add a photo"
        file={null}
        imagesOnly
        error={fileErr}
        disabled={saving}
        onChange={(f, problem) => {
          setFileErr(problem);
          if (f && !problem) setFiles((x) => [...x, f]);
        }}
      />
      {error ? <ErrorBox error={error} /> : null}
      <Button busy={saving} onClick={save}>
        {p ? 'Save product' : 'Add product'}
      </Button>
    </Sheet>
  );
}

export function ProductsPanel() {
  const list = useQuery({
    queryKey: ['admin', 'shop', 'products'],
    queryFn: ({ signal }) => shopAdminApi.products(signal),
  });
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Panel
      title="Products"
      right={
        <Button size="sm" variant="dash" onClick={() => (setEditing('new'), setMsg(null))}>
          + New product
        </Button>
      }
    >
      {msg && (
        <Note role="status" tone="info">
          {msg}
        </Note>
      )}
      {list.isError ? (
        <ErrorBox error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <SkeletonList rows={3} />
      ) : list.data.rows.length === 0 ? (
        <Empty title="No products yet." />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {list.data.rows.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-[12px] border border-line p-2.5"
            >
              {p.images[0] ? (
                <img
                  src={uploadUrl(p.images[0])}
                  alt=""
                  className="h-12 w-12 flex-none rounded-lg object-cover"
                />
              ) : (
                <span className="h-12 w-12 flex-none rounded-lg bg-track" />
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="truncate">{p.name}</b>
                <small className="text-[12.5px] text-mut">
                  <Money value={p.mrp} /> · stock {p.stock}
                  {p.category ? ` · ${p.category}` : ''}
                </small>
              </span>
              {!p.is_active ? (
                <Chip tone="muted">Off</Chip>
              ) : p.stock === 0 ? (
                <Chip tone="bad">Sold out</Chip>
              ) : p.low_stock ? (
                <Chip tone="wait">Low stock</Chip>
              ) : (
                <Chip tone="ok">Live</Chip>
              )}
              <Button size="sm" variant="ghost" onClick={() => (setEditing(p), setMsg(null))}>
                Edit
              </Button>
            </li>
          ))}
        </ul>
      )}
      <span className="text-xs text-mut">
        Members can spend up to the order limit (Settings → Shop) per order.
      </span>
      {editing && (
        <ProductSheet
          p={editing === 'new' ? null : editing}
          onClose={(m) => {
            setEditing(null);
            if (m) setMsg(m);
          }}
        />
      )}
    </Panel>
  );
}
