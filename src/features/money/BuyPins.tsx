import { useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { pinsApi } from '@/api/pins';
import { refreshMoney } from '@/api/queryClient';
import { Button, Card, ErrorBox, FilePicker, Money, Note, Sheet, Tabs, TextField } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { useConfig } from '@/features/auth/usePublic';
import { useWalletSummary } from '@/features/member/data';
import { MemberPage } from '@/features/member/MemberPage';
import { useMyRequests } from './data';
import { toPaise } from './moneyForm';
import { CompanyPay } from './PayDetails';
import { RequestList } from './Requests';
import { useUtrSend } from './useUtrSend';

// C8 "Buy PINs": one PIN activates one ID (₹987 each, from /config/public). Pay by UPI (UTR + screenshot, the
// admin approves and the PINs are created) or from the Fund Wallet (the PINs are mine at once).
const MAX_QTY = 500;

export default function BuyPins() {
  const qc = useQueryClient();
  const price = useConfig().data?.pin_price;
  const fund = useWalletSummary().data?.fund;
  const requests = useMyRequests('pins');
  const f = useUtrSend(requests);
  const [qtyText, setQtyText] = useState('1');
  const [how, setHow] = useState<'upi' | 'fund'>('upi');
  const [confirm, setConfirm] = useState(false);
  const [fundError, setFundError] = useState<unknown>(null);
  const [fundDone, setFundDone] = useState<string | null>(null);

  const qty = /^\d{1,3}$/.test(qtyText) ? Number(qtyText) : NaN;
  const qtyOk = qty >= 1 && qty <= MAX_QTY;
  const total = qtyOk && price !== undefined ? (toPaise(price) * qty) / 100 : undefined; // shown only
  const fundShort = total !== undefined && fund !== undefined && toPaise(fund) < toPaise(total);
  // From the latest value (not this render's): two quick taps on "+" add 2.
  const stepQty = (d: number) =>
    setQtyText((t) => {
      const n = /^\d{1,3}$/.test(t) ? Number(t) : 0;
      return String(Math.min(MAX_QTY, Math.max(1, n + d)));
    });

  const [buy, buying] = useSingleFlight(async () => {
    setFundError(null);
    try {
      const r = await pinsApi.buyFromFund(qty);
      setConfirm(false);
      setFundDone(
        `${r.codes.length} PIN${r.codes.length === 1 ? '' : 's'} added to My PINs (${formatMoney(r.paid)} from the Fund Wallet).`,
      );
    } catch (e) {
      setFundError(e); // no answer: refreshed below; the member checks My PINs before trying again
    } finally {
      await refreshMoney(qc);
    }
  });

  return (
    <MemberPage
      narrow
      title="Buy PINs"
      subtitle={`One PIN activates one ID${price ? ` · ${formatMoney(price)} each` : ''}`}
      back="/pins"
    >
      <Card className="gap-3">
        <span className="text-[13px] font-semibold text-lab">How many PINs?</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-label="One less"
            disabled={!qtyOk || qty <= 1}
            onClick={() => stepQty(-1)}
          >
            −
          </Button>
          <TextField
            label="Number of PINs"
            inputMode="numeric"
            value={qtyText}
            onChange={(e) => setQtyText(e.target.value.replace(/\D/g, '').slice(0, 3))}
            error={qtyText && !qtyOk ? `Choose 1 to ${MAX_QTY} PINs.` : undefined}
            fieldClassName="w-[110px]"
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label="One more"
            disabled={qtyOk && qty >= MAX_QTY}
            onClick={() => stepQty(1)}
          >
            +
          </Button>
          <span className="ml-auto text-right">
            {qtyOk ? `${qty} × ${price !== undefined ? formatMoney(price) : '…'}` : ''}
            <b className="block text-[22px] text-g">{total !== undefined ? <Money value={total} /> : '–'}</b>
          </span>
        </div>
      </Card>

      <Tabs
        label="How to pay"
        value={how}
        onChange={setHow}
        items={[
          { value: 'upi', label: 'Pay by UPI' },
          { value: 'fund', label: `From Fund Wallet (${fund !== undefined ? formatMoney(fund) : '…'})` },
        ]}
      />

      {how === 'upi' ? (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void f.send(
              { purpose: 'pins', pin_qty: qty },
              `Request sent for ${qty} PIN${qty === 1 ? '' : 's'}. They appear in My PINs as soon as our team approves it.`,
              qtyOk,
            );
          }}
        >
          <Card className="gap-3">
            {total !== undefined && (
              <span className="text-sm">
                Pay <b>{formatMoney(total)}</b> to the company:
              </span>
            )}
            <CompanyPay />
          </Card>
          <TextField
            label="UTR (12 digits)"
            autoCapitalize="characters"
            autoComplete="off"
            value={f.utr}
            onChange={(e) => f.setUtr(e.target.value)}
            error={f.utrErr}
          />
          <FilePicker
            label="Payment screenshot"
            file={f.file}
            error={f.fileErr}
            disabled={f.sending}
            onChange={f.setFile}
          />
          <Note>Our team checks the payment. Your PINs appear in My PINs as soon as it is approved.</Note>
          {f.error ? <ErrorBox error={f.error} /> : null}
          {f.done && (
            <Note role="status" tone="info">
              {f.done}
            </Note>
          )}
          <Button type="submit" busy={f.sending} disabled={!qtyOk}>
            Send request
          </Button>
        </form>
      ) : (
        <Card className="gap-3">
          {fundShort ? (
            <Note tone="warn">
              Your Fund Wallet has {formatMoney(fund)}. <Link to="/add-funds">Add funds ›</Link>
            </Note>
          ) : (
            <span className="text-sm">
              The PINs are yours at once. The money comes from your Fund Wallet.
            </span>
          )}
          {fundError ? <ErrorBox error={fundError} /> : null}
          {fundDone && (
            <Note role="status" tone="info">
              {fundDone} <Link to="/pins">My PINs ›</Link>
            </Note>
          )}
          <Button
            disabled={!qtyOk || fundShort || total === undefined}
            onClick={() => (setFundDone(null), setConfirm(true))}
          >
            Buy {qtyOk ? qty : ''} PIN{qty === 1 ? '' : 's'}
          </Button>
        </Card>
      )}

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Buy PINs from the Fund Wallet?"
        locked={buying}
      >
        <Note tone="warn">
          {qty} PIN{qty === 1 ? '' : 's'} for <b>{total !== undefined ? formatMoney(total) : ''}</b> from your
          Fund Wallet.
        </Note>
        {fundError ? <ErrorBox error={fundError} /> : null}
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="ghost" disabled={buying} onClick={() => setConfirm(false)}>
            Back
          </Button>
          <Button busy={buying} onClick={buy}>
            Buy
          </Button>
        </div>
      </Sheet>

      <h2 className="m-0 text-[14.5px] font-bold">Past requests</h2>
      <RequestList q={requests} emptyTitle="No PIN request yet" />
    </MemberPage>
  );
}
