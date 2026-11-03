import { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { cashbookApi, type CbBookDetail, type CbEntry } from '@/api/cashbook';
import { qk } from '@/api/keys';
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  Empty,
  ErrorBox,
  Money,
  Sheet,
  SkeletonList,
  TextField,
} from '@/components/ui';
import { formatFullDate, formatTime, istDayKey, istTimeKey } from '@/lib/dates';
import { useDebounced } from '@/lib/useDebounced';
import { errorText } from '@/lib/errorText';
import { ConfirmSheet } from './parts';
import { cbMobile, useCbAction, type Notify } from './useCashbook';

// One book: Cash In / Cash Out / Balance (from the server), entries by date (newest first), and for the owner the
// + CASH IN / − CASH OUT buttons, edit / delete on tap, and the members. A view-only member sees the same numbers.

/** The book could not be loaded: removed from it, deleted, or never shared. */
export function BookGone({
  error,
  backTo,
  onRetry,
}: {
  error: unknown;
  backTo: string;
  onRetry: () => unknown;
}) {
  if (error instanceof ApiError && error.status === 404)
    return (
      <Empty
        title="This book is not available"
        text="It was deleted, or it is no longer shared with you."
        action={
          <ButtonLink to={backTo} size="sm">
            Back to Cash Book
          </ButtonLink>
        }
      />
    );
  return <ErrorBox error={error} onRetry={onRetry} />;
}

function Totals({ book }: { book: CbBookDetail }) {
  // A money figure is never cut ("₹54,86,4…"): on a phone In / Out share a row and Balance gets the full width;
  // a very big amount wraps to a second line instead of hiding digits.
  const box = 'flex min-w-0 flex-col gap-0.5 rounded-2xl border p-3';
  const amount = 'leading-tight font-bold [overflow-wrap:anywhere] tab:text-lg';
  return (
    <div className="grid grid-cols-2 gap-2 tab:grid-cols-3 tab:gap-3">
      <div role="group" aria-label="Cash In" className={`${box} border-okbg bg-okbg`}>
        <span className="text-xs font-semibold text-ok">Cash In</span>
        <Money value={book.total_in} className={`${amount} text-[15px] text-ok`} />
      </div>
      <div role="group" aria-label="Cash Out" className={`${box} border-bbg bg-bbg`}>
        <span className="text-xs font-semibold text-b">Cash Out</span>
        <Money value={book.total_out} className={`${amount} text-[15px] text-b`} />
      </div>
      <div
        role="group"
        aria-label="Balance"
        className={`${box} col-span-2 flex-row items-center justify-between gap-2 border-line bg-card tab:col-span-1 tab:flex-col tab:items-start tab:justify-start`}
      >
        <span className="text-xs font-semibold text-lab">Balance</span>
        <Money value={book.balance} className={`${amount} text-right text-lg tab:text-left`} />
      </div>
    </div>
  );
}

type EntryForm = { type: 'in' | 'out'; entry?: CbEntry };

function EntrySheet({
  bookId,
  form,
  notify,
  onClose,
}: {
  bookId: number;
  form: EntryForm;
  notify: Notify;
  onClose: () => void;
}) {
  const run = useCbAction(notify);
  const e = form.entry;
  const [type, setType] = useState(form.type);
  const [amount, setAmount] = useState(e ? String(e.amount) : '');
  const [when, setWhen] = useState(() => {
    const d = e ? e.entry_date : new Date();
    return `${istDayKey(d)}T${istTimeKey(d)}`; // the IST date + time; sent without a zone = IST on the server
  });
  const [remark, setRemark] = useState(e?.remark ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const save = async () => {
    const a = amount.trim().replace(/,/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(a) || /^0+(\.0+)?$/.test(a))
      return setError('Enter an amount like 500 or 99.50.');
    if (!when) return setError('Choose the date and time.');
    setBusy(true);
    const body = { type, amount: Number(a), entry_date: when, remark: remark.trim() || null };
    const ok = await run(
      () => (e ? cashbookApi.editEntry(e.id, body) : cashbookApi.addEntry(bookId, body)),
      e ? 'Entry saved.' : type === 'in' ? 'Cash in added.' : 'Cash out added.',
    );
    setBusy(false);
    if (ok) onClose();
  };

  if (confirm && e)
    return (
      <ConfirmSheet
        title="Delete this entry?"
        text={
          <>
            <Money value={e.amount} /> {e.type === 'in' ? 'cash in' : 'cash out'} of{' '}
            {formatFullDate(e.entry_date)} will be removed from this book.
          </>
        }
        onConfirm={async () => {
          const ok = await run(() => cashbookApi.deleteEntry(e.id), 'Entry deleted.');
          if (ok) onClose();
          return ok;
        }}
        onClose={() => setConfirm(false)}
      />
    );

  return (
    <Sheet
      open
      title={e ? 'Edit entry' : type === 'in' ? 'Cash In' : 'Cash Out'}
      onClose={onClose}
      locked={busy}
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          void save();
        }}
      >
        {e && (
          <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-2">
            {(['in', 'out'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={`h-11 cursor-pointer rounded-xl border-[1.5px] text-sm font-bold ${
                  type === t
                    ? t === 'in'
                      ? 'border-ok bg-okbg text-ok'
                      : 'border-red bg-bbg text-b'
                    : 'border-field bg-white text-mut'
                }`}
              >
                {t === 'in' ? 'Cash In' : 'Cash Out'}
              </button>
            ))}
          </div>
        )}
        <TextField
          label="Amount (₹)"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          error={error}
          onChange={(ev) => {
            setAmount(ev.target.value);
            setError(null);
          }}
        />
        <TextField
          label="Date and time"
          type="datetime-local"
          value={when}
          onChange={(ev) => {
            setWhen(ev.target.value);
            setError(null);
          }}
        />
        <TextField
          label="Remark (optional)"
          maxLength={300}
          value={remark}
          onChange={(ev) => setRemark(ev.target.value)}
        />
        <Button type="submit" size="md" busy={busy}>
          Save
        </Button>
        {e && (
          <Button variant="danger" size="md" disabled={busy} onClick={() => setConfirm(true)}>
            Delete entry
          </Button>
        )}
      </form>
    </Sheet>
  );
}

function MembersSheet({
  book,
  notify,
  onClose,
}: {
  book: CbBookDetail;
  notify: Notify;
  onClose: () => void;
}) {
  const run = useCbAction(notify);
  const qc = useQueryClient();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const add = async () => {
    const m = cbMobile(mobile);
    if (!m) return setError('Enter a valid 10 digit mobile number.');
    setBusy(true);
    try {
      await cashbookApi.addMember(book.id, m);
      notify('Member added. They can see this book now.');
      setMobile('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
      // A server error stays under the field (not a toast); the lists refresh either way.
      void qc.invalidateQueries({ queryKey: qk.cashbook });
    }
  };

  if (removing)
    return (
      <ConfirmSheet
        title="Remove this member?"
        text={`${removing} will no longer see this book.`}
        onConfirm={() => run(() => cashbookApi.removeMember(book.id, removing), 'Member removed.')}
        onClose={() => setRemoving(null)}
      />
    );

  return (
    <Sheet open title="Members" onClose={onClose} locked={busy}>
      <p className="m-0 text-[13px] text-mut">
        Members can only view this book: its totals and entries. They see it when they log in to Treeway with
        this mobile number, even if they join later.
      </p>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <TextField
          label="Add member by mobile"
          inputMode="tel"
          autoComplete="off"
          placeholder="98765 43210"
          fieldClassName="flex-1"
          value={mobile}
          error={error}
          onChange={(e) => {
            setMobile(e.target.value);
            setError(null);
          }}
        />
        <Button type="submit" size="sm" busy={busy} className={error ? 'mb-6' : undefined}>
          Add
        </Button>
      </form>
      {book.members.length === 0 ? (
        <p className="m-0 text-sm text-mut">No members yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {book.members.map((m) => (
            <li
              key={m.mobile}
              className="flex min-h-[54px] items-center gap-2 border-b border-line2 py-2 last:border-b-0"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="num text-sm">{m.mobile}</b>
                <span>
                  {m.joined ? <Chip tone="ok">Joined</Chip> : <Chip tone="muted">Not registered yet</Chip>}
                </span>
              </span>
              <Button variant="danger" size="sm" onClick={() => setRemoving(m.mobile)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

export function BookView({ book, notify }: { book: CbBookDetail; notify: Notify }) {
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 400);
  const [form, setForm] = useState<EntryForm | null>(null);
  const [members, setMembers] = useState(false);
  const owner = book.is_owner;

  const list = useInfiniteQuery({
    queryKey: qk.cbEntries(book.id, q),
    queryFn: ({ pageParam, signal }) => cashbookApi.entries(book.id, { search: q, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
  });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const days: { key: string; rows: CbEntry[] }[] = [];
  for (const r of rows) {
    const key = istDayKey(r.entry_date);
    if (days[days.length - 1]?.key !== key) days.push({ key, rows: [] });
    days[days.length - 1]!.rows.push(r);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] text-mut">
          {book.business_name}
          {!owner && ` · shared by ${book.owner_mobile}`}
        </span>
        {owner ? (
          <Button variant="ghost" size="sm" onClick={() => setMembers(true)}>
            + Members ({book.members.length})
          </Button>
        ) : (
          <Chip tone="blue">View only</Chip>
        )}
      </div>
      <Totals book={book} />
      <TextField
        label="Search entries"
        type="search"
        placeholder="Remark"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {list.isPending ? (
        <SkeletonList rows={4} />
      ) : list.isError ? (
        <ErrorBox error={list.error} onRetry={() => list.refetch()} />
      ) : rows.length === 0 ? (
        <Empty
          title={q ? 'No entries match' : 'No entries yet'}
          text={
            q ? 'Try other words.' : owner ? 'Tap + CASH IN or − CASH OUT to add the first one.' : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {days.map((d) => (
            <section key={d.key} aria-label={formatFullDate(d.rows[0]!.entry_date)}>
              <h3 className="m-0 mb-1.5 px-1 text-xs font-bold text-mut uppercase">
                {formatFullDate(d.rows[0]!.entry_date)}
              </h3>
              <Card flat>
                <ul className="m-0 list-none p-0">
                  {d.rows.map((r) => {
                    const inner = (
                      <>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <b className="truncate text-sm">
                            {r.remark ?? (r.type === 'in' ? 'Cash in' : 'Cash out')}
                          </b>
                          <span className="text-xs text-mut">{formatTime(r.entry_date)}</span>
                        </span>
                        <span className="sr-only">{r.type === 'in' ? 'Cash in' : 'Cash out'}</span>
                        <Money value={r.type === 'in' ? r.amount : -r.amount} colored />
                      </>
                    );
                    const row = 'flex min-h-[58px] w-full items-center gap-2.5 px-3.5 py-2.5 text-left';
                    return (
                      <li key={r.id} className="border-b border-line2 last:border-b-0">
                        {owner ? (
                          <button
                            type="button"
                            onClick={() => setForm({ type: r.type, entry: r })}
                            className={`${row} cursor-pointer border-0 bg-transparent text-ink hover:bg-tint`}
                          >
                            {inner}
                          </button>
                        ) : (
                          <div className={row}>{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}
          {list.hasNextPage && (
            <Button
              variant="ghost"
              size="md"
              busy={list.isFetchingNextPage}
              onClick={() => list.fetchNextPage()}
            >
              Show more
            </Button>
          )}
        </div>
      )}

      {owner && (
        <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 mt-auto grid grid-cols-2 gap-2.5 bg-bg pt-2 pb-1 tab:bottom-4">
          {(['in', 'out'] as const).map((t) => (
            // Only opens the form (the form's Save is the protected button).
            <button
              key={t}
              type="button"
              onClick={() => setForm({ type: t })}
              className={`h-[46px] cursor-pointer rounded-xl border-0 text-[15px] font-bold text-white ${
                t === 'in' ? 'bg-ok hover:bg-g2' : 'bg-red hover:bg-b'
              }`}
            >
              {t === 'in' ? '+ CASH IN' : '− CASH OUT'}
            </button>
          ))}
        </div>
      )}
      {form && <EntrySheet bookId={book.id} form={form} notify={notify} onClose={() => setForm(null)} />}
      {members && owner && <MembersSheet book={book} notify={notify} onClose={() => setMembers(false)} />}
    </>
  );
}
