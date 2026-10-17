import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shopAdminApi } from '@/api/shop';
import { Button, ErrorBox, Money, Note, SkeletonList, TextField } from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { useAdminRefresh } from './adminData';
import { Panel, Table, td } from './AdminParts';
import { checkRate } from './adminText';

// Delivery charges: the state rates (Settings), a rate for one PIN code, and the "rate not set" list
// (PIN codes from orders nobody has looked at).

function RateForm({ initialPin = '', onDone }: { initialPin?: string; onDone: (msg: string) => void }) {
  const refresh = useAdminRefresh();
  const [pin, setPin] = useState(initialPin);
  const [rate, setRate] = useState('');
  const [errs, setErrs] = useState<Partial<ReturnType<typeof checkRate>>>({});
  const [error, setError] = useState<unknown>(null);
  const [save, saving] = useSingleFlight(async (useState_: boolean) => {
    const e = checkRate(pin, useState_ ? '' : rate, useState_);
    setErrs(e);
    if (e.pin || e.rate) return;
    setError(null);
    try {
      await shopAdminApi.setRate(pin.trim(), useState_ ? null : Number(rate));
      onDone(
        useState_
          ? `${pin.trim()} uses the state rate.`
          : `Delivery to ${pin.trim()} is now ₹${Number(rate)}.`,
      );
      setRate('');
      if (!initialPin) setPin('');
    } catch (err) {
      setError(err);
    } finally {
      await refresh();
    }
  });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <TextField
          label="PIN code"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          error={errs.pin}
          fieldClassName="w-[140px]"
        />
        <TextField
          label="Delivery (₹)"
          inputMode="decimal"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          error={errs.rate}
          fieldClassName="w-[140px]"
        />
        <Button size="sm" busy={saving} onClick={() => save(false)}>
          Save
        </Button>
        <Button size="sm" variant="ghost" disabled={saving} onClick={() => save(true)}>
          Use state rate
        </Button>
      </div>
      {error ? <ErrorBox error={error} /> : null}
    </div>
  );
}

export function RatesPanel() {
  const r = useQuery({
    queryKey: ['admin', 'shop', 'rates'],
    queryFn: ({ signal }) => shopAdminApi.rates(signal),
  });
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Panel title="Delivery charges">
      {msg && (
        <Note role="status" tone="info">
          {msg}
        </Note>
      )}
      {r.isError ? (
        <ErrorBox error={r.error} onRetry={() => r.refetch()} />
      ) : !r.data ? (
        <SkeletonList rows={3} />
      ) : (
        <>
          <span className="text-[13px]">
            By state:{' '}
            {Object.entries(r.data.state_rates).map(([s, v], i) => (
              <span key={s}>
                {i > 0 && ' · '}
                {s === 'default' ? 'other states' : s} <Money value={v} />
              </span>
            ))}{' '}
            <span className="text-mut">(change in Settings → Shop)</span>
          </span>
          <RateForm onDone={setMsg} />
          {r.data.rate_not_set.length > 0 && (
            <>
              <b className="text-sm">Rate not set ({r.data.rate_not_set.length})</b>
              <Note>Orders came from these PIN codes. Set a rate or keep the state rate.</Note>
              <Table head={['PIN code', 'State', 'Orders', 'Last order', '']} min={560}>
                {r.data.rate_not_set.slice(0, 50).map((x) => (
                  <tr key={x.pincode}>
                    <td className={`${td} num`}>{x.pincode}</td>
                    <td className={td}>{x.state ?? 'not known'}</td>
                    <td className={`${td} num`}>{x.orders}</td>
                    <td className={td}>{formatWhen(x.last_order)}</td>
                    <td className={td}>
                      <RateForm key={x.pincode} initialPin={x.pincode} onDone={setMsg} />
                    </td>
                  </tr>
                ))}
              </Table>
            </>
          )}
          {r.data.pincode_rates.length > 0 && (
            <Table head={['PIN code', 'Delivery', 'Changed']} min={420}>
              {r.data.pincode_rates.map((x) => (
                <tr key={x.pincode}>
                  <td className={`${td} num`}>{x.pincode}</td>
                  <td className={td}>{x.rate == null ? 'state rate' : <Money value={x.rate} />}</td>
                  <td className={td}>
                    {formatWhen(x.updated_at)}
                    {x.updated_by_name ? ` · ${x.updated_by_name}` : ''}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </>
      )}
    </Panel>
  );
}
