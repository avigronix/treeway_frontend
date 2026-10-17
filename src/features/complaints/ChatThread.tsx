import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi, type ChatMessage } from '@/api/complaints';
import { Button, ErrorBox, FilePicker, Note, SkeletonList, TextField } from '@/components/ui';
import { formatDay, formatTime, istDayKey } from '@/lib/dates';
import { useFileBlob } from '@/lib/useFileBlob';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { cx } from '@/lib/cx';

// The chat of one complaint, used by the member (E3) and the admin (I3). New messages come every 15 s
// while it is open; opening it marks the other side's messages read (server side).

function Attachment({ path }: { path: string }) {
  const f = useFileBlob(path);
  if (f.error) return <span className="text-xs text-b">File could not be opened.</span>;
  if (!f.url) return <span className="text-xs text-mut">Loading file…</span>;
  return f.type?.startsWith('image/') ? (
    <a href={f.url} target="_blank" rel="noopener noreferrer">
      <img src={f.url} alt="Attached file" className="max-h-40 max-w-full rounded-lg" />
    </a>
  ) : (
    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-bold">
      Open the PDF
    </a>
  );
}

function Bubble({ m, plain }: { m: ChatMessage; plain?: boolean }) {
  return (
    <li className={cx('flex max-w-[85%] flex-col gap-1', m.mine ? 'self-end items-end' : 'self-start')}>
      {!m.mine && <span className="text-[11.5px] font-bold text-g">{m.sender}</span>}
      <div
        className={cx(
          'flex flex-col gap-1.5 rounded-2xl px-3 py-2 text-sm',
          m.mine ? 'bg-g text-white' : plain ? 'border border-line bg-white' : 'bg-white',
        )}
      >
        {m.message && <span className="whitespace-pre-wrap break-words">{m.message}</span>}
        {m.file_path && <Attachment path={m.file_path} />}
      </div>
      <span className="text-[11px] text-mut">{formatTime(m.created_at)}</span>
    </li>
  );
}

export function ChatThread({
  id,
  open,
  emptyText,
  onChange,
  bordered,
}: {
  id: number;
  /** false = closed complaint: messages only, no reply box. */
  open: boolean;
  emptyText: string;
  /** After a send (even a failed one): refresh the complaint, lists and counts. */
  onChange: () => Promise<unknown>;
  /** Admin panel is white: give the other side's bubbles a border. */
  bordered?: boolean;
}) {
  const msgs = useQuery({
    queryKey: ['complaints', 'messages', id],
    queryFn: ({ signal }) => complaintsApi.messages(id, 0, signal),
    refetchInterval: 15_000,
  });
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const [send, sending] = useSingleFlight(async () => {
    setError(null);
    if (!text.trim() && !file) return;
    try {
      await complaintsApi.send(id, text.trim(), file);
      setText('');
      setFile(null);
    } catch (e) {
      setError(e);
    } finally {
      await Promise.all([msgs.refetch(), onChange()]);
    }
  });

  return (
    <>
      {msgs.isError ? (
        <ErrorBox error={msgs.error} onRetry={() => msgs.refetch()} />
      ) : !msgs.data ? (
        <SkeletonList rows={3} />
      ) : msgs.data.length === 0 ? (
        <span className="text-center text-[13px] text-mut">{emptyText}</span>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-live="polite">
          {msgs.data.map((m, i) => {
            const day = istDayKey(m.created_at);
            const head = i === 0 || istDayKey(msgs.data[i - 1]!.created_at) !== day;
            return (
              <li key={m.id} className="contents">
                {head && (
                  <span className="self-center text-[11.5px] font-bold text-mut">
                    {day === istDayKey() ? 'Today' : formatDay(m.created_at)}
                  </span>
                )}
                <ul className="m-0 flex list-none flex-col p-0">
                  <Bubble m={m} plain={bordered} />
                </ul>
              </li>
            );
          })}
        </ul>
      )}
      {open ? (
        <form
          noValidate
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <TextField
            label="Message"
            placeholder="Type a message"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <FilePicker
            label="Attach a photo or PDF (optional)"
            file={file}
            error={fileErr}
            disabled={sending}
            onChange={(f, problem) => (setFile(f), setFileErr(problem))}
          />
          {error ? <ErrorBox error={error} /> : null}
          <Button type="submit" busy={sending} disabled={!text.trim() && !file}>
            Send
          </Button>
        </form>
      ) : (
        <Note>The chat is closed for this complaint.</Note>
      )}
    </>
  );
}
