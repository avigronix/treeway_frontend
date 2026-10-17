import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi, adminKeys, type AdminSettings } from '@/api/admin';
import { qk } from '@/api/keys';
import { Button, Chip, ErrorBox, Note, SelectField, Sheet, TextField } from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { Panel } from './AdminParts';
import { diffText, fromText, getAt, setAt, toText, type GroupDef } from './settingsForm';

/** One setting (or group): edit, then a confirm with old -> new before it is saved. Locked parts show why. */
export function SettingsGroup({
  g,
  data,
  msg,
  setMsg,
}: {
  g: GroupDef;
  data: AdminSettings;
  /** kept by the parent: the group re-mounts with the server's new value after a save */
  msg: string | null;
  setMsg: (m: string | null) => void;
}) {
  const qc = useQueryClient();
  const current = data.settings[g.key];
  const id = (path: string[]) => path.join('.') || '_';
  const groupLock = data.locked[g.key];
  const fieldLock = (path: string[]) =>
    groupLock ?? (path.length ? data.locked[`${g.key}.${path[0]}`] : undefined);
  const canEdit = !g.readOnly && data.editable.includes(g.key) && !groupLock;
  const start = () =>
    Object.fromEntries(g.fields.map((f) => [id(f.path), toText(f.kind, getAt(current, f.path))]));

  const [texts, setTexts] = useState<Record<string, string>>(start);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [next, setNext] = useState<unknown>(null);
  const [error, setError] = useState<unknown>(null);
  const changed = data.changed[g.key];

  function review() {
    setError(null);
    setMsg(null);
    const e: Record<string, string> = {};
    let value: unknown = current;
    for (const f of g.fields) {
      const r = fromText(f.kind, texts[id(f.path)] ?? '');
      if ('error' in r) e[id(f.path)] = r.error;
      else value = setAt(value, f.path, r.value);
    }
    setErrs(e);
    if (Object.keys(e).length) return;
    if (!diffText(g, current, value).length) {
      setMsg('Nothing changed.');
      return;
    }
    setNext(value);
  }

  const [save, saving] = useSingleFlight(async () => {
    setError(null);
    try {
      await adminApi.saveSetting(g.key, next);
      setNext(null);
      setMsg('Saved. New income uses it within 30 seconds.');
    } catch (err) {
      setError(err);
      setNext(null);
    } finally {
      await Promise.all([
        qc.invalidateQueries({ queryKey: adminKeys.settings }),
        qc.invalidateQueries({ queryKey: qk.config }),
        qc.invalidateQueries({ queryKey: adminKeys.dashboard }),
      ]);
    }
  });

  return (
    <Panel
      title={<h3 className="m-0 text-[15px] font-bold">{g.title}</h3>}
      right={
        groupLock || g.readOnly ? (
          <Chip tone="muted">Locked</Chip>
        ) : changed ? (
          <span className="text-xs text-mut">
            Last changed by {changed.by_name ?? 'an admin'} · {formatWhen(changed.at)}
          </span>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 desk:grid-cols-3">
        {g.fields.map((f) => {
          const k = id(f.path);
          const lock = fieldLock(f.path);
          const disabled = !canEdit || !!lock || saving;
          return f.kind === 'bool' ? (
            <SelectField
              key={k}
              label={f.label}
              options={[
                { value: 'false', label: 'Off' },
                { value: 'true', label: 'On' },
              ]}
              value={texts[k]}
              disabled={disabled}
              onChange={(e) => setTexts((t) => ({ ...t, [k]: e.target.value }))}
            />
          ) : (
            <TextField
              key={k}
              label={f.label}
              inputMode={f.kind === 'int' ? 'numeric' : 'decimal'}
              value={texts[k]}
              disabled={disabled}
              error={errs[k]}
              help={lock && !groupLock ? `Locked: ${lock}` : undefined}
              onChange={(e) => setTexts((t) => ({ ...t, [k]: e.target.value }))}
            />
          );
        })}
      </div>
      {(g.readOnly || groupLock) && <Note>Locked: {g.readOnly ?? groupLock}</Note>}
      {g.note && !g.readOnly && <span className="text-xs text-mut">{g.note}</span>}
      {error ? <ErrorBox error={error} /> : null}
      {msg && (
        <Note role="status" tone="info">
          {msg}
        </Note>
      )}
      {canEdit && (
        <Button size="sm" className="self-start" onClick={review}>
          Save {g.title.toLowerCase()}
        </Button>
      )}
      <Sheet
        open={next !== null}
        onClose={() => setNext(null)}
        title={`Change ${g.title.toLowerCase()}?`}
        locked={saving}
      >
        <Note tone="warn">Applies only to new income. Income already paid does not change.</Note>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
          {next !== null &&
            diffText(g, current, next).map((d) => (
              <li key={d.label} className="flex flex-wrap justify-between gap-2 border-b border-line2 pb-1.5">
                <span>{d.label}</span>
                <span>
                  <s className="text-mut">{d.from}</s> → <b>{d.to}</b>
                </span>
              </li>
            ))}
        </ul>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="ghost" disabled={saving} onClick={() => setNext(null)}>
            Back
          </Button>
          <Button busy={saving} onClick={save}>
            Save
          </Button>
        </div>
      </Sheet>
    </Panel>
  );
}
