import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
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
  KeyValue,
} from '@/components/ui';
import { formatDayTime, formatWhen, istDayKey, istTimeKey } from '@/lib/dates';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { usePageClamp } from '@/lib/usePageClamp';
import { Pager, Panel } from './AdminParts';
import { bannerChip, bannerTime, checkBanner } from './adminText';

// J3 "Home banners" (add, view, edit, delete: Vinay 21 Oct) and "Contact us messages" (AdminContent).

type Form = {
  title: string;
  audience: 'everyone' | 'login';
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  link_url: string;
  sort_order: string;
  is_active: boolean;
};
const fromBanner = (b: AdminBanner | null): Form => ({
  title: b?.title ?? '',
  audience: b?.audience ?? 'everyone',
  // Banner times are India time, to the minute (Vinay 22 Oct).
  start_date: b?.starts_at ? istDayKey(b.starts_at) : '',
  start_time: b?.starts_at ? istTimeKey(b.starts_at) : '',
  end_date: b?.ends_at ? istDayKey(b.ends_at) : '',
  end_time: b?.ends_at ? istTimeKey(b.ends_at) : '',
  link_url: b?.link_url ?? '',
  sort_order: String(b?.sort_order ?? 0),
  is_active: b?.is_active ?? true,
});
const toFields = (f: Form): BannerFields => ({
  title: f.title.trim(),
  audience: f.audience,
  starts_at: bannerTime(f.start_date, f.start_time, false),
  ends_at: bannerTime(f.end_date, f.end_time, true),
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
    const nowKey = `${istDayKey()}T${istTimeKey()}`;
    const e = checkBanner(f, !b, !!image, b ? toFields(fromBanner(b)).ends_at : '', nowKey);
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
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-[13px] font-bold">Starts showing (India time)</legend>
        <div className="grid grid-cols-2 gap-2.5">
          <TextField
            label="Start date"
            type="date"
            value={f.start_date}
            onChange={(e) => {
              set('start_date')(e.target.value);
              if (!e.target.value) set('start_time')(''); // no date = no time either
            }}
            error={errs.start}
          />
          <TextField
            label="Start time"
            type="time"
            value={f.start_time}
            onChange={(e) => set('start_time')(e.target.value)}
          />
        </div>
        <span className="text-xs text-mut">Empty = shows as soon as it is saved. No time = 12:00 AM.</span>
      </fieldset>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-[13px] font-bold">Stops showing (India time)</legend>
        <div className="grid grid-cols-2 gap-2.5">
          <TextField
            label="End date"
            type="date"
            value={f.end_date}
            onChange={(e) => {
              set('end_date')(e.target.value);
              if (!e.target.value) set('end_time')(''); // no date = no time either
            }}
            error={errs.end}
          />
          <TextField
            label="End time"
            type="time"
            value={f.end_time}
            onChange={(e) => set('end_time')(e.target.value)}
          />
        </div>
        <span className="text-xs text-mut">Empty = no end. No time = 11:59 PM.</span>
      </fieldset>
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

/** Live / Scheduled · time / Ended / Off, as the server says (its clock decides, not the phone's). */
function StateChip({ b }: { b: AdminBanner }) {
  const c = bannerChip(b);
  return <Chip tone={c.tone}>{c.text}</Chip>;
}

/** Details of one banner (fresh from the server), with Edit and Delete. Delete asks once more first. */
function BannerDetails({
  id,
  onEdit,
  onClose,
}: {
  id: number;
  onEdit: (b: AdminBanner) => void;
  onClose: (msg?: string) => void;
}) {
  const qc = useQueryClient();
  const d = useQuery({
    queryKey: ['admin', 'banners', id],
    queryFn: ({ signal }) => contentApi.bannerDetail(id, signal),
    staleTime: 0,
  });
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] }),
      qc.invalidateQueries({ queryKey: ['banners'] }),
    ]);

  const [remove, removing] = useSingleFlight(async () => {
    setError(null);
    try {
      await contentApi.deleteBanner(id);
      onClose('Banner deleted.');
    } catch (e) {
      // Another admin (or a double tap) deleted it first: the result is the same.
      if (e instanceof ApiError && e.status === 404) onClose('This banner was already deleted.');
      else setError(e);
    } finally {
      await refresh();
    }
  });

  const b = d.data;
  return (
    <Sheet open onClose={() => onClose()} title="Banner details" locked={removing}>
      {d.isError ? (
        <ErrorBox error={d.error} onRetry={() => (d.refetch(), refresh())} />
      ) : !b ? (
        <SkeletonList rows={3} />
      ) : (
        <>
          <img
            src={uploadUrl(b.image)}
            alt={b.title}
            className="max-h-56 w-full rounded-[12px] border border-line bg-track object-contain"
          />
          <div className="flex flex-col gap-1.5">
            <KeyValue k="Title">{b.title}</KeyValue>
            <KeyValue k="Status">
              <StateChip b={b} />
            </KeyValue>
            <KeyValue k="Show on">
              {b.audience === 'login' ? 'Login page (everyone)' : 'Home (members)'}
            </KeyValue>
            <KeyValue k="From">{b.starts_at ? formatDayTime(b.starts_at) : 'As soon as saved'}</KeyValue>
            <KeyValue k="Until">{b.ends_at ? formatDayTime(b.ends_at) : 'No end'}</KeyValue>
            <KeyValue k="Link when tapped">
              <span className="break-all">{b.link_url || 'None'}</span>
            </KeyValue>
            <KeyValue k="Order">{b.sort_order}</KeyValue>
            <KeyValue k="Added">
              {formatWhen(b.created_at)}
              {b.created_by_name ? ` by ${b.created_by_name}` : ''}
            </KeyValue>
            <KeyValue k="Last changed">
              {b.last_edit_at
                ? `${formatWhen(b.last_edit_at)}${b.last_edit_by_name ? ` by ${b.last_edit_by_name}` : ''}`
                : 'Never'}
            </KeyValue>
          </div>
          {error ? <ErrorBox error={error} /> : null}
          {!confirm ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="ghost" onClick={() => onEdit(b)}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => setConfirm(true)}>
                Delete
              </Button>
            </div>
          ) : (
            <>
              <Note tone="warn">
                Delete "{b.title}"?{b.live ? ' It goes off the app right now.' : ''} This cannot be undone; a
                copy stays in the audit log.
              </Note>
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="ghost" disabled={removing} onClick={() => setConfirm(false)}>
                  Back
                </Button>
                <Button variant="danger" busy={removing} onClick={remove}>
                  Delete banner
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

export function BannersPanel() {
  const banners = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: ({ signal }) => contentApi.adminBanners(signal),
  });
  const [editing, setEditing] = useState<AdminBanner | 'new' | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
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
                    {b.starts_at ? ` · from ${formatDayTime(b.starts_at)}` : ''}
                    {b.ends_at ? ` · until ${formatDayTime(b.ends_at)}` : ''}
                  </small>
                </div>
                <StateChip b={b} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`View ${b.title}`}
                    onClick={() => (setViewing(b.id), setMsg(null))}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Edit ${b.title}`}
                    onClick={() => (setEditing(b), setMsg(null))}
                  >
                    Edit
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {viewing !== null && !editing && (
        <BannerDetails
          id={viewing}
          onEdit={(b) => (setViewing(null), setEditing(b))}
          onClose={(m) => {
            setViewing(null);
            if (m) setMsg(m);
          }}
        />
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
