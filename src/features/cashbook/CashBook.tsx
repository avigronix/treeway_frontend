import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { cashbookApi, type CbBook, type CbBusiness, type CbHome } from '@/api/cashbook';
import { qk } from '@/api/keys';
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  Empty,
  ErrorBox,
  Hero,
  Money,
  SelectField,
  Skeleton,
  SkeletonList,
  Tabs,
  TextField,
} from '@/components/ui';
import { MemberPage } from '@/features/member/MemberPage';
import { formatCount } from '@/lib/money';
import { formatWhen } from '@/lib/dates';
import { BookGone, BookView } from './BookView';
import { ConfirmSheet, Kebab, NameSheet } from './parts';
import { useCbAction, useToast, type Notify } from './useCashbook';

// Cash Book (Vinay, 2 Nov): one page for every member and admin. The URL keeps where you are, so the phone's Back
// works: ?biz=<business> (my books), ?tab=shared (shared with me), &book=<id> (one book).
// The server decides owner / view only and sums every total; this page only shows them.

const NEW = 'new';

/** Member pages use the member frame; the admin area already has its frame (AdminLayout). */
function Frame({
  admin,
  title,
  subtitle,
  back,
  children,
}: {
  admin: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  children: ReactNode;
}) {
  const backLink = back && (
    <ButtonLink to={back} variant="ghost" size="sm">
      ‹ All books
    </ButtonLink>
  );
  if (!admin)
    return (
      <MemberPage title={title} subtitle={subtitle} back={back} desktopActions={backLink}>
        {children}
      </MemberPage>
    );
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {back && (
          <Link to={back} aria-label="Back" className="text-[30px] leading-none text-g no-underline">
            ‹
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate text-[22px] leading-[1.2] font-bold tab:text-[26px]">{title}</h1>
          {subtitle && <p className="mt-1 mb-0 text-sm text-mut">{subtitle}</p>}
        </div>
      </div>
      {children}
    </>
  );
}

function BookCard({
  to,
  name,
  sub,
  balance,
  chip,
  menu,
}: {
  to: string;
  name: string;
  sub: ReactNode;
  balance: number;
  chip?: ReactNode;
  menu?: ReactNode;
}) {
  return (
    <Card className="flex-row items-center gap-1 py-2 pr-1.5">
      <Link to={to} className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-ink no-underline">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="truncate text-[14.5px]">{name}</b>
          <span className="truncate text-xs text-mut">{sub}</span>
          {chip}
        </span>
        <Money value={balance} className="text-[15px] font-bold" />
      </Link>
      {menu}
    </Card>
  );
}

type Sheet =
  | { kind: 'newBusiness' }
  | { kind: 'renameBusiness'; biz: CbBusiness }
  | { kind: 'deleteBusiness'; biz: CbBusiness }
  | { kind: 'newBook'; biz: CbBusiness }
  | { kind: 'renameBook'; book: CbBook }
  | { kind: 'deleteBook'; book: CbBook };

function MyBooks({ home, base, notify }: { home: CbHome; base: string; notify: Notify }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const run = useCbAction(notify);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [search, setSearch] = useState('');
  const biz = home.businesses.find((b) => String(b.id) === params.get('biz')) ?? home.businesses[0];
  const books = useQuery({
    queryKey: qk.cbBooks(biz?.id ?? 0),
    queryFn: ({ signal }) => cashbookApi.books(biz!.id, signal),
    enabled: !!biz,
  });
  const term = search.trim().toLowerCase();
  const shown = (books.data?.books ?? []).filter((b) => b.name.toLowerCase().includes(term));
  const go = (id: number, book?: number) => navigate(`${base}?biz=${id}${book ? `&book=${book}` : ''}`);

  const sheets = sheet && (
    <>
      {sheet.kind === 'newBusiness' && (
        <NameSheet
          title="New business"
          label="Business name"
          onClose={() => setSheet(null)}
          onSave={async (name) => {
            let id = 0;
            const ok = await run(
              async () => (id = (await cashbookApi.addBusiness(name)).id),
              'Business added.',
            );
            if (ok) go(id);
            return ok;
          }}
        />
      )}
      {sheet.kind === 'renameBusiness' && (
        <NameSheet
          title="Rename business"
          label="Business name"
          initial={sheet.biz.name}
          onClose={() => setSheet(null)}
          onSave={(name) => run(() => cashbookApi.renameBusiness(sheet.biz.id, name), 'Business renamed.')}
        />
      )}
      {sheet.kind === 'deleteBusiness' && (
        <ConfirmSheet
          title="Delete this business?"
          text={`“${sheet.biz.name}” and its ${formatCount(sheet.biz.book_count)} book(s), with all their entries and members, will be deleted. This cannot be undone.`}
          onClose={() => setSheet(null)}
          onConfirm={async () => {
            const ok = await run(() => cashbookApi.deleteBusiness(sheet.biz.id), 'Business deleted.');
            if (ok) navigate(base);
            return ok;
          }}
        />
      )}
      {sheet.kind === 'newBook' && (
        <NameSheet
          title="New book"
          label="Book name"
          onClose={() => setSheet(null)}
          onSave={async (name) => {
            let id = 0;
            const ok = await run(
              async () => (id = (await cashbookApi.addBook(sheet.biz.id, name)).id),
              'Book added.',
            );
            if (ok) go(sheet.biz.id, id);
            return ok;
          }}
        />
      )}
      {sheet.kind === 'renameBook' && (
        <NameSheet
          title="Rename book"
          label="Book name"
          initial={sheet.book.name}
          onClose={() => setSheet(null)}
          onSave={(name) => run(() => cashbookApi.renameBook(sheet.book.id, name), 'Book renamed.')}
        />
      )}
      {sheet.kind === 'deleteBook' && (
        <ConfirmSheet
          title="Delete this book?"
          text={`“${sheet.book.name}” with all its entries and members will be deleted. This cannot be undone.`}
          onClose={() => setSheet(null)}
          onConfirm={() => run(() => cashbookApi.deleteBook(sheet.book.id), 'Book deleted.')}
        />
      )}
    </>
  );

  if (!biz)
    return (
      <>
        <Empty
          title="No business yet"
          text="Make a business (like your shop), then add books to it to write cash in and cash out."
          action={
            <Button size="sm" onClick={() => setSheet({ kind: 'newBusiness' })}>
              + New business
            </Button>
          }
        />
        {sheets}
      </>
    );

  const card = books.data?.business ?? biz; // the fresh totals once the book list is in
  return (
    <>
      <div className="flex items-end gap-1">
        <SelectField
          label="Business"
          fieldClassName="flex-1"
          value={String(biz.id)}
          options={[
            ...home.businesses.map((b) => ({ value: String(b.id), label: b.name })),
            { value: NEW, label: '+ New business' },
          ]}
          onChange={(e) =>
            e.target.value === NEW ? setSheet({ kind: 'newBusiness' }) : go(Number(e.target.value))
          }
        />
        <Kebab
          label={`Options for ${biz.name}`}
          items={[
            { label: 'New business', onPick: () => setSheet({ kind: 'newBusiness' }) },
            { label: 'Rename', onPick: () => setSheet({ kind: 'renameBusiness', biz }) },
            { label: 'Delete', danger: true, onPick: () => setSheet({ kind: 'deleteBusiness', biz }) },
          ]}
        />
      </div>

      <Hero>
        <span className="text-[13px] opacity-90">Total balance · {biz.name}</span>
        <Money
          value={card.balance}
          className="text-[28px] leading-tight font-bold [overflow-wrap:anywhere]"
        />
        <span className="text-[13px] opacity-90">
          {formatCount(card.book_count)} {card.book_count === 1 ? 'book' : 'books'} · In{' '}
          <Money value={card.total_in} /> · Out <Money value={card.total_out} />
        </span>
      </Hero>

      <TextField
        label="Search books"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {books.isPending ? (
        <SkeletonList rows={3} />
      ) : books.isError ? (
        <ErrorBox error={books.error} onRetry={() => books.refetch()} />
      ) : shown.length === 0 ? (
        <Empty
          title={term ? 'No book matches' : 'No books yet'}
          text={term ? 'Try another name.' : 'Tap + Add New Book to start writing entries.'}
        />
      ) : (
        <div className="flex flex-col gap-2 tab:grid tab:grid-cols-2 wide:grid-cols-3">
          {shown.map((b) => (
            <BookCard
              key={b.id}
              to={`${base}?biz=${biz.id}&book=${b.id}`}
              name={b.name}
              sub={`Updated ${formatWhen(b.updated_at)}`}
              balance={b.balance}
              menu={
                <Kebab
                  label={`Options for ${b.name}`}
                  items={[
                    { label: 'Rename', onPick: () => setSheet({ kind: 'renameBook', book: b }) },
                    {
                      label: 'Delete',
                      danger: true,
                      onPick: () => setSheet({ kind: 'deleteBook', book: b }),
                    },
                  ]}
                />
              }
            />
          ))}
        </div>
      )}

      <div className="pointer-events-none sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 mt-auto flex justify-end pt-2 tab:bottom-4">
        <button
          type="button"
          onClick={() => setSheet({ kind: 'newBook', biz })}
          className="pointer-events-auto h-12 cursor-pointer rounded-full border-0 bg-g px-5 text-[15px] font-bold text-white shadow-lg hover:bg-g2"
        >
          + Add New Book
        </button>
      </div>
      {sheets}
    </>
  );
}

function SharedBooks({ home, base }: { home: CbHome; base: string }) {
  if (home.shared.length === 0)
    return (
      <Empty
        title="Nothing shared with you"
        text="When someone adds your mobile number to their book, it shows here."
      />
    );
  return (
    <div className="flex flex-col gap-2 tab:grid tab:grid-cols-2 wide:grid-cols-3">
      {home.shared.map((b) => (
        <BookCard
          key={b.id}
          to={`${base}?tab=shared&book=${b.id}`}
          name={b.name}
          sub={`${b.business_name} · by ${b.owner_mobile}`}
          balance={b.balance}
          chip={
            <span>
              <Chip tone="blue">View only</Chip>
            </span>
          }
        />
      ))}
    </div>
  );
}

export function CashBookScreen({ admin = false }: { admin?: boolean }) {
  const base = admin ? '/admin/cashbook' : '/cashbook';
  const [params, setParams] = useSearchParams();
  const [toast, notify] = useToast();
  const tab = params.get('tab') === 'shared' ? 'shared' : 'mine';
  const bookId = Number(params.get('book')) || 0;
  const home = useQuery({ queryKey: qk.cbHome, queryFn: ({ signal }) => cashbookApi.home(signal) });
  const book = useQuery({
    queryKey: qk.cbBook(bookId),
    queryFn: ({ signal }) => cashbookApi.book(bookId, signal),
    enabled: bookId > 0,
  });

  if (bookId) {
    const back = tab === 'shared' ? `${base}?tab=shared` : `${base}?biz=${params.get('biz') ?? ''}`;
    return (
      <Frame
        admin={admin}
        title={book.data?.name ?? <Skeleton className="h-5 w-32" />}
        subtitle={book.data && !book.data.is_owner ? 'View only' : undefined}
        back={back}
      >
        {book.isPending ? (
          <SkeletonList rows={4} />
        ) : book.isError ? (
          <BookGone error={book.error} backTo={back} onRetry={() => book.refetch()} />
        ) : (
          <BookView book={book.data} notify={notify} />
        )}
        {toast}
      </Frame>
    );
  }

  return (
    <Frame admin={admin} title="Cash Book" subtitle="Write your cash in and cash out">
      <Tabs
        label="Cash Book"
        value={tab}
        onChange={(v) => setParams(v === 'shared' ? { tab: 'shared' } : {})}
        items={[
          { value: 'mine', label: 'My books' },
          { value: 'shared', label: 'Shared with me', count: home.data?.shared.length },
        ]}
      />
      {home.isPending ? (
        <SkeletonList rows={3} />
      ) : home.isError ? (
        <ErrorBox error={home.error} onRetry={() => home.refetch()} />
      ) : tab === 'shared' ? (
        <SharedBooks home={home.data} base={base} />
      ) : (
        <MyBooks home={home.data} base={base} notify={notify} />
      )}
      {toast}
    </Frame>
  );
}

export default function CashBook() {
  return <CashBookScreen />;
}
