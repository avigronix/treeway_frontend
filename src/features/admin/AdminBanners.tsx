import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { contentApi, uploadUrl, type AdminBanner, type BannerFields, type ContactRow } from '@/api/content';
import {
  Button,
  Chip,
  ErrorBox,
  FilePicker,
  Note,
  SelectField,
  Sheet,
  SkeletonList,
  Tabs,
  TextAreaField,
  TextField,
  Empty,
} from '@/components/ui';
import { formatDay, formatWhen, istDayKey } from '@/lib/dates';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { usePageClamp } from '@/lib/usePageClamp';
import { Pager, Panel } from './AdminParts';
import { bannerState, checkBanner } from './adminText';

// J3 "Home banners" and "Contact us messages" (AdminContent).

type Form = {
  title: string;
  audience: 'everyone' | 'login';
  starts_on: string;
  ends_on: string;
  link_url: string;
  sort_order: string;
  is_active: boolean;
};
const fromBanner = (b: AdminBanner | null): Form => ({
  title: b?.title ?? '',
  audience: b?.audience ?? 'everyone',
  starts_on: b?.starts_on ?? '',
  ends_on: b?.ends_on ?? '',
  link_url: b?.link_url ?? '',
  sort_order: String(b?.sort_order ?? 0),
  is_active: b?.is_active ?? true,
});
const toFields = (f: Form): BannerFields => ({
  title: f.title.trim(),
  audience: f.audience,
  starts_on: f.starts_on,
  ends_on: f.ends_on,
  link_url: f.link_url.trim(),
  sort_order: Number(f.sort_order.trim()),
  is_active: f.is_active,
});

function BannerSheet({ b, onClose }: { b: AdminBanner | null; onClose: (msg?: string) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(fromBanner(b));
  const [image, setImage] = useState<File | null>(null);
  const [imageErr, setImageErr] = useState<string | null>(null);
  const [errs, setErrs] = useState<Partial<ReturnType<typeof checkBanner>>>({});
  const [error, setError] = useState<unknown>(null);
  const set =
    <K extends keyof Form>(k: K) =>
    (v: Form[K]) =>
      setF((x) => ({ ...x, [k]: v }));

  const [save, saving] = useSingleFlight(async () => {
    const e = checkBanner(f, !b, !!image);
    setErrs(e);
    if (Object.values(e).some(Boolean) || imageErr) return;
    setError(null);
    try {
      const all = toFields(f);
      if (b) {
        const old = toFields(fromBanner(b));
        const changed = Object.fromEntries(
          Object.entries(all).filter(([k, v]) => old[k as keyof BannerFields] !== v),
        ) as Partial<BannerFields>;
        if (!Object.keys(changed).length && !image) return onClose('Nothing changed.');
        await contentApi.editBanner(b.id, changed, image);
        onClose('Banner saved.');
      } else {
        await contentApi.addBanner(all, image!);
        onClose('Banner added.');
      }
    } catch (err) {
      setError(err);
    } finally {
      await qc.invalidateQueries({ queryKey: ['admin', 'banners'] });
    }
  });

  return (
    <Sheet open onClose={() => onClose()} title={b ? 'Edit banner' : 'New banner'} locked={saving}>
      <TextField
        label="Title"
        value={f.title}
        onChange={(e) => set('title')(e.target.value)}
        error={errs.title}
      />
      <SelectField
        label="Show on"
        options={[
          { value: 'everyone', label: 'Home (members)' },
          { value: 'login', label: 'Login page (everyone)' },
        ]}
        value={f.audience}
        onChange={(e) => set('audience')(e.target.value as Form['audience'])}
      />
      <div className="grid grid-cols-2 gap-2.5">
        <TextField
          label="From (optional)"
          type="date"
          value={f.starts_on}
          onChange={(e) => set('starts_on')(e.target.value)}
        />
        <TextField
          label="Until (optional)"
          type="date"
          value={f.ends_on}
          onChange={(e) => set('ends_on')(e.target.value)}
          error={errs.ends_on}
        />
      </div>
      <TextField
        label="Link when tapped (optional)"
        placeholder="/shop or https://…"
        value={f.link_url}
        onChange={(e) => set('link_url')(e.target.value)}
        error={errs.link_url}
      />
      <TextField
        label="Order (0 comes first)"
        inputMode="numeric"
        value={f.sort_order}
        onChange={(e) => set('sort_order')(e.target.value)}
        error={errs.sort_order}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.is_active} onChange={(e) => set('is_active')(e.target.checked)} />
        Banner is on
      </label>
      {b && !image && (
        <img
          src={uploadUrl(b.image)}
          alt="Current banner"
          className="max-h-40 rounded-[10px] border border-line object-contain"
        />
      )}
      <FilePicker
        label={b ? 'New picture (optional)' : 'Banner picture'}
        file={image}
        imagesOnly
        error={imageErr ?? errs.image}
        disabled={saving}
        onChange={(file, problem) => (setImage(file), setImageErr(problem))}
      />
      {error ? <ErrorBox error={error} /> : null}
      <Button busy={saving} onClick={save}>
        {b ? 'Save banner' : 'Add banner'}
      </Button>
    </Sheet>
  );
}

export function BannersPanel() {
  const banners = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: ({ signal }) => contentApi.adminBanners(signal),
  });
  const [editing, setEditing] = useState<AdminBanner | 'new' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const today = istDayKey();
  return (
    <Panel
      title="Home banners"
      right={
        <Button size="sm" variant="dash" onClick={() => (setEditing('new'), setMsg(null))}>
          + New banner
        </Button>
      }
    >
      {msg && (
        <Note role="status" tone="info">
          {msg}
        </Note>
      )}
      {banners.isError ? (
        <ErrorBox error={banners.error} onRetry={() => banners.refetch()} />
      ) : !banners.data ? (
        <SkeletonList rows={2} />
      ) : banners.data.length === 0 ? (
        <Empty title="No banner yet." />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {banners.data.map((b) => {
            const st = bannerState(b, today);
            return (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-3 rounded-[12px] border border-line p-2.5"
              >
                <img
                  src={uploadUrl(b.image)}
                  alt=""
                  className="h-14 w-24 flex-none rounded-lg bg-track object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate">{b.title}</b>
                  <small className="text-[12.5px] text-mut">
                    {b.audience === 'login' ? 'Login page' : 'Home'}
                    {b.starts_on ? ` · from ${formatDay(b.starts_on)}` : ''}
                    {b.ends_on ? ` · until ${formatDay(b.ends_on)}` : ''}
                  </small>
                </div>
                {st === 'live' ? (
                  <Chip tone="ok">Live</Chip>
                ) : st === 'off' ? (
                  <Chip tone="muted">Off</Chip>
                ) : st === 'later' ? (
                  <Chip tone="wait">Starts {formatDay(b.starts_on!)}</Chip>
                ) : (
                  <Chip tone="muted">Ended</Chip>
                )}
                <Button size="sm" variant="ghost" onClick={() => (setEditing(b), setMsg(null))}>
                  Edit
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <BannerSheet
          b={editing === 'new' ? null : editing}
          onClose={(m) => {
            setEditing(null);
            if (m) setMsg(m);
          }}
        />
      )}
    </Panel>
  );
}

function ContactItem({ c, onDone }: { c: ContactRow; onDone: () => Promise<unknown> }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [mark, marking] = useSingleFlight(async () => {
    setError(null);
    try {
      await contentApi.markReplied(c.id, note.trim());
    } catch (e) {
      setError(e);
    } finally {
      await onDone();
    }
  });
  return (
    <li className="flex flex-col gap-2 border-b border-line2 py-3 last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span>
          <b>{c.name}</b> ·{' '}
          <a href={`tel:${c.mobile}`} className="num font-bold">
            {c.mobile}
          </a>
        </span>
        <small className="text-[12.5px] text-mut">{formatWhen(c.created_at)}</small>
      </div>
      <p className="m-0 text-sm whitespace-pre-wrap break-words">"{c.message}"</p>
      {c.status === 'replied' ? (
        <small className="text-[12.5px] text-mut">
          Replied {c.replied_at ? formatWhen(c.replied_at) : ''}
          {c.replied_by_name ? ` by ${c.replied_by_name}` : ''}
          {c.reply_note ? ` · "${c.reply_note}"` : ''}
        </small>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <TextAreaField
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fieldClassName="min-w-[220px] flex-1"
          />
          <Button size="sm" busy={marking} onClick={mark}>
            Mark as called
          </Button>
        </div>
      )}
      {error ? <ErrorBox error={error} /> : null}
    </li>
  );
}

export function ContactPanel() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'new' | 'replied'>('new');
  const [page, setPage] = useState(1);
  const l = useQuery({
    queryKey: ['admin', 'contact', tab, page],
    queryFn: ({ signal }) => contentApi.contactMessages(tab, page, signal),
    placeholderData: (p) => p,
  });
  usePageClamp(page, l.data?.total, 20, setPage);
  const done = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['admin', 'contact'] }),
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
    ]);
  return (
    <Panel
      title="Contact us messages"
      right={l.data && l.data.counts.new > 0 ? <Chip tone="wait">{l.data.counts.new} new</Chip> : undefined}
    >
      <Tabs
        label="Messages"
        value={tab}
        onChange={(v) => (setTab(v), setPage(1))}
        className="max-w-[360px]"
        items={[
          { value: 'new', label: 'New', count: l.data?.counts.new },
          { value: 'replied', label: 'Called' },
        ]}
      />
      {l.isError ? (
        <ErrorBox error={l.error} onRetry={() => l.refetch()} />
      ) : !l.data ? (
        <SkeletonList rows={2} />
      ) : l.data.rows.length === 0 ? (
        <Empty title={tab === 'new' ? 'No new message.' : 'Nothing here.'} />
      ) : (
        <>
          <ul className="m-0 list-none p-0">
            {l.data.rows.map((c) => (
              <ContactItem key={c.id} c={c} onDone={done} />
            ))}
          </ul>
          <Pager page={page} size={20} total={l.data.total} onPage={setPage} />
        </>
      )}
    </Panel>
  );
}
