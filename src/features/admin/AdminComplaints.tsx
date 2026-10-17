import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { complaintsApi, type Category } from '@/api/complaints';
import { Button, Chip, ErrorBox, SkeletonList, Tabs, TextField, Empty } from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { formatCount } from '@/lib/money';
import { usePageClamp } from '@/lib/usePageClamp';
import { useDebounced } from '@/lib/useDebounced';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { label, tone } from '@/features/complaints/complaintText';
import { AdminTitle, FilterBar, Kpi, Kpis, Pager, Panel, Table, td } from './AdminParts';

// I2 "Complaints": counts, every sent complaint (drafts stay private to the member), and the complaint types.
type Tab = 'open' | 'Resolved' | 'Closed' | 'Rejected';

function CategoryRow({ c }: { c: Category }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(c.name);
  const [err, setErr] = useState<unknown>(null);
  const done = () => qc.invalidateQueries({ queryKey: ['complaints', 'categories'] });
  const [save, saving] = useSingleFlight(async (active: boolean, newName: string) => {
    setErr(null);
    try {
      await complaintsApi.editCategory(c.id, newName, active);
      setEdit(false);
    } catch (e) {
      setErr(e);
    } finally {
      await done();
    }
  });
  return (
    <li className="flex flex-col gap-2 border-b border-line2 py-2.5 last:border-0">
      {edit ? (
        <div className="flex flex-wrap items-end gap-2">
          <TextField
            label="Type name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fieldClassName="min-w-[220px] flex-1"
          />
          <Button
            size="sm"
            busy={saving}
            disabled={name.trim().length < 2}
            onClick={() => save(c.is_active, name.trim())}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={() => (setEdit(false), setName(c.name))}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={c.is_active ? '' : 'text-mut line-through'}>{c.name}</span>
          <span className="flex gap-1.5">
            {!c.is_active && <Chip tone="muted">Hidden</Chip>}
            <Button size="sm" variant="ghost" onClick={() => setEdit(true)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" busy={saving} onClick={() => save(!c.is_active, c.name)}>
              {c.is_active ? 'Hide' : 'Show'}
            </Button>
          </span>
        </div>
      )}
      {err ? <ErrorBox error={err} /> : null}
    </li>
  );
}

function Categories() {
  const qc = useQueryClient();
  const cats = useQuery({
    queryKey: ['complaints', 'categories'],
    queryFn: ({ signal }) => complaintsApi.categories(signal),
  });
  const [name, setName] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [add, adding] = useSingleFlight(async () => {
    setErr(null);
    try {
      await complaintsApi.addCategory(name.trim());
      setName('');
    } catch (e) {
      setErr(e);
    } finally {
      await qc.invalidateQueries({ queryKey: ['complaints', 'categories'] });
    }
  });
  return (
    <Panel title="Complaint types" right={<span className="text-[13px] text-mut">Members pick from this list in the form</span>}>
      {cats.isError ? (
        <ErrorBox error={cats.error} onRetry={() => cats.refetch()} />
      ) : !cats.data ? (
        <SkeletonList rows={3} />
      ) : (
        <ul className="m-0 list-none p-0">
          {cats.data.map((c) => (
            <CategoryRow key={`${c.id}-${c.name}-${c.is_active}`} c={c} />
          ))}
        </ul>
      )}
      <form
        noValidate
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length >= 2) void add();
        }}
      >
        <TextField
          label="New type"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fieldClassName="min-w-[220px] flex-1"
        />
        <Button size="sm" type="submit" busy={adding} disabled={name.trim().length < 2}>
          Add
        </Button>
      </form>
      {err ? <ErrorBox error={err} /> : null}
    </Panel>
  );
}

export default function AdminComplaints() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>('open');
  const [search, setSearch] = useState(() => params.get('search') ?? ''); // from the dashboard search
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim(), 400);
  const matrix = useQuery({
    queryKey: ['complaints', 'matrix'],
    queryFn: ({ signal }) => complaintsApi.matrix(signal),
    refetchInterval: 60_000,
  });
  const list = useQuery({
    queryKey: ['complaints', 'list', 'admin', tab, q, page],
    queryFn: ({ signal }) => complaintsApi.list({ status: tab, search: q || undefined, page }, signal),
    placeholderData: (p) => p,
    refetchInterval: 60_000,
  });
  const m = matrix.data;
  usePageClamp(page, list.data?.total, 20, setPage);

  return (
    <>
      <AdminTitle title="Complaints" sub="Status of every complaint and chat with the member" />
      {m && (
        <Kpis>
          <Kpi label="Submitted (new)" value={formatCount(m.Submitted ?? 0)} alert={(m.Submitted ?? 0) > 0} />
          <Kpi label="In progress" value={formatCount(m['In Process'] ?? 0)} />
          <Kpi label="Solved" value={formatCount(m.Resolved ?? 0)} />
          <Kpi label="Closed" value={formatCount(m.Closed ?? 0)} />
          <Kpi label="Rejected" value={formatCount(m.Rejected ?? 0)} />
        </Kpis>
      )}
      <FilterBar boxed>
        <TextField
          label="Complaint no. or member ID"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          fieldClassName="w-full desk:w-[300px]"
        />
        <Tabs
          label="Status"
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
          className="w-full desk:w-[460px]"
          items={[
            {
              value: 'open',
              label: 'Open',
              count: m ? (m.Submitted ?? 0) + (m['In Process'] ?? 0) : undefined,
            },
            { value: 'Resolved', label: 'Solved' },
            { value: 'Closed', label: 'Closed' },
            { value: 'Rejected', label: 'Rejected' },
          ]}
        />
      </FilterBar>
      <Panel>
        {list.isError ? (
          <ErrorBox error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data ? (
          <SkeletonList rows={4} />
        ) : list.data.rows.length === 0 ? (
          <Empty title={tab === 'open' ? 'No complaint is waiting.' : 'Nothing here.'} />
        ) : (
          <>
            <Table head={['Complaint', 'Member', 'Type', 'Happened on', 'Status', '']} min={760}>
              {list.data.rows.map((c) => (
                <tr key={c.id}>
                  <td className={td}>
                    <b className="num">{c.complaint_no}</b>
                    {c.unread > 0 ? (
                      <small className="block text-[12.5px] font-bold text-b">
                        {c.unread} new message{c.unread === 1 ? '' : 's'}
                      </small>
                    ) : c.status === 'Submitted' ? (
                      <small className="block text-[12.5px] font-bold text-w">New</small>
                    ) : null}
                  </td>
                  <td className={td}>
                    {c.full_name}
                    <small className="block text-[12.5px] text-mut">{c.user_code}</small>
                  </td>
                  <td className={td}>{c.category}</td>
                  <td className={td}>{c.happened_on ? formatDay(c.happened_on) : '–'}</td>
                  <td className={td}>
                    <Chip tone={tone(c.status)}>{label(c.status)}</Chip>
                  </td>
                  <td className={td}>
                    <Link to={`/admin/complaints/${c.id}`} className="font-bold">
                      Open ›
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
            <Pager page={page} size={20} total={list.data.total} onPage={setPage} />
          </>
        )}
      </Panel>
      <Categories />
    </>
  );
}
