import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { memberApi, type Super3Status } from '@/api/member';
import type { Schema } from '@/api/schema';
import {
  Button,
  ButtonLink,
  Card,
  ErrorBox,
  KeyValue,
  Money,
  Note,
  Sheet,
  SkeletonList,
  Tabs,
  TextField,
} from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { formatCount, formatMoney } from '@/lib/money';
import { cx } from '@/lib/cx';
import { useSuper3Status } from '@/features/member/data';
import { MemberPage } from '@/features/member/MemberPage';
import { entryState, journeyLabel, myJourneys } from './super3Text';

// C2 "Super 3 board tree": one spot, the spot above it and the 2 rows below (GET /super3/tree). Members see only
// trees under their own spots (the server answers 403 for anything else). This is the member's whole Super 3
// page: "My status" (when will my 3 come) is admin only (Vinay 21 Oct), on the admin's member page.

type Spot = Schema<'Spot'>;

function Dots({ n }: { n: number | null | undefined }) {
  const k = n ?? 0;
  return (
    <span aria-label={`${k} of 3 below`} className="tracking-[.15em] text-[11px]">
      {'●'.repeat(Math.min(3, k))}
      {'○'.repeat(Math.max(0, 3 - k))}
    </span>
  );
}

function Box({
  s,
  entry,
  onOpen,
  you,
}: {
  s: Spot;
  entry?: number;
  onOpen?: (s: Spot) => void;
  you?: boolean;
}) {
  if (s.empty)
    return (
      <div className="flex min-h-[86px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white p-2 text-xs text-mut">
        #{formatCount(s.position)}
        <span>Empty spot</span>
      </div>
    );
  return (
    <button
      type="button"
      onClick={() => onOpen?.(s)}
      className={cx(
        'flex min-h-[86px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border p-2 text-center',
        you ? 'border-g bg-tint' : 'border-line bg-white',
      )}
    >
      <span className="text-[11.5px] text-mut">#{formatCount(s.position)}</span>
      <b className="max-w-full truncate text-[13px]">{s.name}</b>
      {entry !== undefined && <span className="text-[11.5px] font-bold text-ok">{formatMoney(entry)} ✓</span>}
      <Dots n={s.children} />
    </button>
  );
}

/** Not on a board yet: why, in plain words (from the server's real shares). */
function NotIn({ s }: { s: Super3Status }) {
  const e = entryState(s);
  return (
    <Card className="gap-2">
      <b className="text-[15px]">You are not in Super 3 yet</b>
      {e.kind === 'none' && (
        <span className="text-sm">
          You have {e.directs} direct{e.directs === 1 ? '' : 's'}. Super 3 starts with your 2nd direct.
        </span>
      )}
      {e.kind === 'hold' && (
        <span className="text-sm">
          Your 1st direct's <Money value={e.onHold} /> is kept for you. Your 2nd direct puts you on Board 1.
        </span>
      )}
      {e.kind === 'lapsed' && (
        <span className="text-sm">
          You have {e.directs} directs, but a direct joined while your ID was blocked, so that share went to
          the company. Super 3 starts when 2 shares are yours ({e.shares} now). Your next direct counts.
        </span>
      )}
      {e.kind === 'in' && <Note>Your tree shows here once your ID is on a board.</Note>}
      <ButtonLink to="/team" variant="ghost" size="md">
        Invite and grow your team
      </ButtonLink>
    </Card>
  );
}

export default function Super3Tree() {
  const [params, setParams] = useSearchParams();
  const st = useSuper3Status();
  const s = st.data;
  const all = s ? myJourneys(s) : [];
  const j = all.find((x) => String(x.journey_id) === params.get('journey')) ?? all[0];
  const boards = j?.positions ?? [];
  const board = Number(params.get('board')) || j?.board || 1;
  const own = boards.find((p) => p.board === board);
  const [find, setFind] = useState('');
  const position = Number(params.get('position')) || own?.position;
  const [open, setOpen] = useState<Spot | null>(null);

  const tree = useQuery({
    queryKey: ['super3', 'tree', board, position],
    queryFn: ({ signal }) => memberApi.super3Tree(board, position!, signal),
    enabled: !!position,
    retry: false,
  });
  const info = s?.boards.find((b) => b.board === board);
  const nextInfo = s?.boards.find((b) => b.board === board + 1);
  const t = tree.data;
  const go = (q: Record<string, string>) =>
    setParams({ ...(j ? { journey: String(j.journey_id) } : {}), ...q }, { replace: true });

  return (
    <MemberPage title="Super 3" subtitle="My Board Tree · tap any box to see details">
      {st.isError ? (
        <ErrorBox error={st.error} onRetry={() => st.refetch()} />
      ) : !s ? (
        <SkeletonList rows={4} />
      ) : !j ? (
        <NotIn s={s} />
      ) : (
        <>
          {all.length > 1 && (
            <Tabs
              label="Which ID"
              value={String(j.journey_id)}
              onChange={(v) => setParams({ journey: v }, { replace: true })}
              items={all.map((x) => ({ value: String(x.journey_id), label: journeyLabel(x, all) }))}
            />
          )}
          <Tabs
            label="Board"
            value={String(board)}
            onChange={(v) => go({ board: v })}
            items={boards.map((p) => ({
              value: String(p.board),
              label: `Board ${p.board}${p.board < j.board || j.finished ? ' ✓' : ''}`,
            }))}
          />
          {tree.isError ? (
            <ErrorBox error={tree.error} onRetry={() => tree.refetch()} />
          ) : !t ? (
            <SkeletonList rows={3} />
          ) : (
            <Card className="gap-3">
              {t.above && (
                <span className="self-center text-xs text-mut">
                  Above you #{formatCount(t.above.position)} · {t.above.name}
                </span>
              )}
              <div className="mx-auto w-1/2 min-w-[140px]">
                <Box s={t.root} you={t.root.position === own?.position} onOpen={setOpen} />
              </div>
              {t.root.status === 'full' && (
                <span className="self-center text-xs font-bold text-ok">Board full</span>
              )}
              <div className="grid grid-cols-3 gap-2">
                {t.children.map((c) => (
                  <Box
                    key={c.position}
                    // A row-1 spot carries its own 3 spots; the dots show how many of them are filled.
                    s={{ ...c, children: (c.children ?? []).filter((x) => !x.empty).length }}
                    entry={c.empty ? undefined : info?.entry}
                    onOpen={setOpen}
                  />
                ))}
              </div>
              {t.root.status === 'full' && info && t.root.position === own?.position && (
                <span className="text-center text-xs text-mut">
                  3 × {formatMoney(info.entry)} = {formatMoney(info.entry * 3)}
                  {nextInfo ? ` · ${formatMoney(nextInfo.entry)} went to Board ${nextInfo.board}` : ''} ·{' '}
                  {formatMoney(info.you_get)} came to your wallet
                </span>
              )}
              {t.root.position !== own?.position && own && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="self-center"
                  onClick={() => go({ board: String(board) })}
                >
                  Back to my spot
                </Button>
              )}
            </Card>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(find.replace(/\D/g, ''));
              if (n >= 1) go({ board: String(board), position: String(n) });
            }}
          >
            <TextField
              label="Spot number"
              inputMode="numeric"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              fieldClassName="flex-1"
            />
            <Button type="submit" size="sm" className="h-11">
              Find
            </Button>
          </form>
        </>
      )}
      <Sheet
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? `#${formatCount(open.position)} · ${open.name}` : ''}
      >
        {open && (
          <div className="flex flex-col gap-1.5">
            <KeyValue k="Board">
              {board} · {open.status === 'full' ? 'full' : 'filling'}
            </KeyValue>
            <KeyValue k="People below">{open.children ?? 0} of 3</KeyValue>
            {open.created_at && <KeyValue k={`Joined Board ${board}`}>{formatDay(open.created_at)}</KeyValue>}
            {open.sponsor_name && <KeyValue k="Sponsor">{open.sponsor_name}</KeyValue>}
            {!open.empty && open.position !== t?.root.position && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => (go({ board: String(board), position: String(open.position) }), setOpen(null))}
              >
                Open this spot's tree
              </Button>
            )}
          </div>
        )}
      </Sheet>
    </MemberPage>
  );
}
