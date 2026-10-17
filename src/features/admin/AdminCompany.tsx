import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi, adminKeys, type AdminSettings } from '@/api/admin';
import { companyQrUrl } from '@/api/company';
import { qk } from '@/api/keys';
import { Button, ErrorBox, FilePicker, Note, TextField } from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { checkCompany, cleanCompany, COMPANY_KEYS as KEYS, type CompanyForm as Fields } from './adminForms';
import { Panel } from './AdminParts';

// K1 "Company details (shown to members for payment)". Members see these on Activate, Add funds and Buy PINs.
// Empty = not set (that part is hidden from members). The server checks every format again and keeps the
// other admin's change when two save at once.

export function CompanyPanel({ data }: { data: AdminSettings }) {
  const qc = useQueryClient();
  const saved = (data.settings.company ?? {}) as Partial<Fields> & { qr_path?: string };
  const start = Object.fromEntries(KEYS.map((k) => [k, saved[k] ?? ''])) as Fields;
  const [f, setF] = useState<Fields>(start);
  const [errs, setErrs] = useState<Partial<Record<keyof Fields, string>>>({});
  const [qr, setQr] = useState<File | null>(null);
  const [qrErr, setQrErr] = useState<string | null>(null);
  const [removeQr, setRemoveQr] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const changed = data.changed.company;
  const qrUrl = removeQr ? null : companyQrUrl(saved.qr_path);

  const set = (k: keyof Fields) => (e: { target: { value: string } }) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    setDone(false);
  };

  const [save, saving] = useSingleFlight(async () => {
    setError(null);
    setDone(false);
    const next = Object.fromEntries(KEYS.map((k) => [k, cleanCompany(k, f[k])])) as Fields;
    const e = checkCompany(next);
    setErrs(e);
    if (Object.keys(e).length || qrErr) return;
    const diff = Object.fromEntries(KEYS.filter((k) => next[k] !== start[k]).map((k) => [k, next[k]]));
    if (!Object.keys(diff).length && !qr && !removeQr) {
      setDone(true);
      return;
    }
    try {
      await adminApi.saveCompany(diff, qr, removeQr);
      setQr(null);
      setRemoveQr(false);
      setDone(true);
    } catch (err) {
      setError(err);
    } finally {
      // Always show what the server has now (also after a lost answer).
      await Promise.all([
        qc.invalidateQueries({ queryKey: adminKeys.settings }),
        qc.invalidateQueries({ queryKey: qk.company }),
      ]);
    }
  });

  const field = (k: keyof Fields, label: string, extra: Record<string, unknown> = {}) => (
    <TextField label={label} value={f[k]} onChange={set(k)} error={errs[k]} {...extra} />
  );

  return (
    <Panel
      title="Company details (shown to members for payment)"
      right={
        changed ? (
          <span className="text-xs text-mut">
            Last changed by {changed.by_name ?? 'an admin'} · {formatWhen(changed.at)}
          </span>
        ) : undefined
      }
    >
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Note>
          Members pay to these details for activation, add funds and PINs. Leave a part empty to hide it.
          Check every digit: a wrong account number sends members' money to the wrong place.
        </Note>
        <div className="grid grid-cols-1 gap-3 desk:grid-cols-2">
          {field('account_holder', 'Account holder', { autoComplete: 'off' })}
          {field('account_no', 'Account no.', { inputMode: 'numeric', autoComplete: 'off' })}
          {field('ifsc', 'IFSC', { autoCapitalize: 'characters', autoComplete: 'off' })}
          {field('branch', 'Branch')}
          {field('upi_id', 'UPI ID', {
            autoCapitalize: 'none',
            autoComplete: 'off',
            placeholder: 'treeway@sbi',
          })}
          {field('name', 'Company name (shown on payment screens)')}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-lab">QR photo</span>
          {qrUrl && !qr ? (
            <div className="flex items-center gap-3">
              <img
                src={qrUrl}
                alt="Company UPI QR now"
                className="size-28 rounded-[10px] border border-line object-contain"
              />
              <Button size="sm" variant="danger" onClick={() => setRemoveQr(true)}>
                Remove QR
              </Button>
            </div>
          ) : removeQr ? (
            <Note tone="warn">
              The QR will be removed when you save.{' '}
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 font-bold text-g underline"
                onClick={() => setRemoveQr(false)}
              >
                Keep it
              </button>
            </Note>
          ) : null}
          <FilePicker
            label={qrUrl ? 'Upload a new QR' : 'Upload the QR'}
            imagesOnly
            file={qr}
            error={qrErr}
            disabled={saving}
            onChange={(file, problem) => {
              setQr(file);
              setQrErr(problem);
              if (file) setRemoveQr(false);
              setDone(false);
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 desk:grid-cols-3">
          {field('email', 'Email', { type: 'email', autoCapitalize: 'none' })}
          {field('phone', 'Phone', { inputMode: 'numeric', autoComplete: 'off' })}
          {field('whatsapp_group', 'WhatsApp group', {
            type: 'url',
            autoCapitalize: 'none',
            placeholder: 'https://chat.whatsapp.com/...',
          })}
        </div>
        {error ? <ErrorBox error={error} /> : null}
        {done && (
          <Note role="status" tone="info">
            Company details saved. Members see them now.
          </Note>
        )}
        <Button type="submit" busy={saving} className="self-start">
          Save company details
        </Button>
      </form>
    </Panel>
  );
}
