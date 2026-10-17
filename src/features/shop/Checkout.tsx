import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { refreshMoney } from '@/api/queryClient';
import { shopApi, type CourierQuote } from '@/api/shop';
import { uploadUrl } from '@/api/content';
import {
  Button,
  ButtonLink,
  Card,
  ErrorBox,
  FilePicker,
  Money,
  Note,
  TextAreaField,
  TextField,
} from '@/components/ui';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { useMe } from '@/auth/session';
import { useConfig } from '@/features/auth/usePublic';
import { useWalletSummary } from '@/features/member/data';
import { MemberPage } from '@/features/member/MemberPage';
import { CompanyPay } from '@/features/money/PayDetails';
import { cart, cartTotal, MAX_QTY, useCartPrescription, useMemberCart } from './cart';
import { checkCheckout, type CheckoutFields } from './shopText';

// D3 "Checkout": address, PIN code → delivery charge (from the server), pay the delivery by UPI (UTR +
// screenshot), place the order. The server prices the order again and picks the wallets.

export default function Checkout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useMe().data;
  const lines = useMemberCart();
  const rx = useCartPrescription();
  const w = useWalletSummary().data;
  const max = useConfig().data?.shop.order_max;
  const [f, setF] = useState<CheckoutFields>({ name: '', mobile: '', address: '', pincode: '', utr: '' });
  const [touched, setTouched] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [quote, setQuote] = useState<CourierQuote | null>(null);
  const [quoteErr, setQuoteErr] = useState<unknown>(null);
  const [errs, setErrs] = useState<Partial<ReturnType<typeof checkCheckout>>>({});
  const [error, setError] = useState<unknown>(null);

  // Prefill the name / mobile from the profile once.
  const name = f.name || (!touched ? (me?.full_name ?? '') : '');
  const mobile = f.mobile || (!touched ? (me?.mobile ?? '') : '');
  const set = (k: keyof CheckoutFields) => (v: string) => {
    setTouched(true);
    setF((x) => ({ ...x, name, mobile, [k]: v }));
    if (k === 'pincode') setQuote(null); // a new PIN code needs a new check
  };

  const [check, checking] = useSingleFlight(async () => {
    setQuoteErr(null);
    if (!/^[1-9]\d{5}$/.test(f.pincode.trim())) {
      setErrs((e) => ({ ...e, pincode: 'Enter a valid 6 digit PIN code.' }));
      return;
    }
    setErrs((e) => ({ ...e, pincode: undefined }));
    try {
      setQuote(await shopApi.courier(f.pincode.trim()));
    } catch (e) {
      setQuoteErr(e);
    }
  });

  const total = cartTotal(lines); // shown only
  const allWallets = w ? w.product + w.fund + w.income : undefined; // shown only

  const [place, placing] = useSingleFlight(async () => {
    setError(null);
    const all = { ...f, name, mobile };
    const e = checkCheckout(all, !!quote, !!file);
    setErrs(e);
    if (Object.values(e).some(Boolean) || !file) {
      if (!file) setFileErr('Add the payment screenshot.');
      return;
    }
    const utr = all.utr.trim().toUpperCase();
    try {
      const done = await shopApi.placeOrder({
        items: lines.map((l) => ({ product_id: l.id, qty: l.qty })),
        name: all.name.trim(),
        mobile: all.mobile.trim(),
        address: all.address.trim(),
        pincode: all.pincode.trim(),
        courier_utr: utr,
        receipt: file,
        prescription_id: rx ?? undefined,
      });
      cart.clear();
      navigate('/shop/orders', {
        replace: true,
        state: { msg: `Order ${done.order_no} placed. We pack it after checking the delivery payment.` },
      });
    } catch (err) {
      // A lost answer may still have placed the order: look for it by its UTR, never send it again by itself.
      if (err instanceof ApiError && err.isNoAnswer) {
        const mine = await shopApi.orders(null).catch(() => null);
        const o = mine?.rows.find((r) => r.courier_utr === utr);
        if (o) {
          cart.clear();
          navigate('/shop/orders', { replace: true, state: { msg: `Order ${o.order_no} placed.` } });
          return;
        }
      }
      setError(err);
    } finally {
      await refreshMoney(qc);
    }
  });

  if (lines.length === 0)
    return (
      <MemberPage narrow title="Checkout" back="/shop">
        <Note>Your cart is empty.</Note>
        <ButtonLink to="/shop">Go to the shop</ButtonLink>
      </MemberPage>
    );

  return (
    <MemberPage narrow title="Checkout" subtitle="Address and delivery charge" back="/shop" className="gap-3">
      <Card className="gap-2.5">
        {rx && <b className="text-sm">Doctor's medicine (prescription)</b>}
        {lines.map((l) => (
          <div key={l.id} className="flex items-center gap-2.5">
            {l.image ? (
              <img
                src={uploadUrl(l.image)}
                alt=""
                className="h-12 w-12 flex-none rounded-lg bg-track object-cover"
              />
            ) : (
              <div className="h-12 w-12 flex-none rounded-lg bg-track" />
            )}
            <span className="flex min-w-0 flex-1 flex-col text-sm">
              <b className="truncate">{l.name}</b>
              <small className="text-mut">
                <Money value={l.mrp} /> each
              </small>
            </span>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`One less ${l.name}`}
              onClick={() => cart.setQty(l.id, l.qty - 1)}
            >
              −
            </Button>
            <b aria-label={`${l.name} quantity`}>{l.qty}</b>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`One more ${l.name}`}
              disabled={l.qty >= MAX_QTY}
              onClick={() => cart.setQty(l.id, l.qty + 1)}
            >
              +
            </Button>
          </div>
        ))}
        <span className="flex justify-between text-sm">
          Products{' '}
          <b>
            <Money value={total} />
          </b>
        </span>
        {max !== undefined && total > max && (
          <Note tone="warn">
            You can order up to <Money value={max} /> at a time. Remove something, or the order is refused.
          </Note>
        )}
        {allWallets !== undefined && allWallets < total && (
          <Note tone="warn">Your wallets together have less than the products cost.</Note>
        )}
        <span className="text-xs text-mut">
          Paid from your Product Wallet first. Product Wallet short? The rest comes from your Fund, then your
          Income Wallet.
        </span>
      </Card>

      <Card className="gap-2.5">
        <b className="text-sm">Deliver to</b>
        <TextField
          label="Name"
          autoComplete="name"
          value={name}
          onChange={(e) => set('name')(e.target.value)}
          error={errs.name}
        />
        <TextField
          label="Mobile"
          inputMode="numeric"
          maxLength={10}
          value={mobile}
          onChange={(e) => set('mobile')(e.target.value.replace(/\D/g, ''))}
          error={errs.mobile}
        />
        <TextAreaField
          label="Full address"
          value={f.address}
          onChange={(e) => set('address')(e.target.value)}
          error={errs.address}
        />
        <div className="flex items-end gap-2">
          <TextField
            label="PIN code"
            inputMode="numeric"
            maxLength={6}
            value={f.pincode}
            onChange={(e) => set('pincode')(e.target.value.replace(/\D/g, ''))}
            error={errs.pincode}
            fieldClassName="flex-1"
          />
          <Button size="sm" variant="ghost" busy={checking} onClick={check}>
            Check
          </Button>
        </div>
        {quoteErr ? <ErrorBox error={quoteErr} /> : null}
        {quote && (
          <Note role="status" tone="info">
            We deliver here · delivery{' '}
            <b>
              <Money value={quote.rate} />
            </b>
            {quote.state ? ` (${quote.state})` : ''}
          </Note>
        )}
      </Card>

      {quote && (
        <Card className="gap-2.5">
          <b className="text-sm">
            Pay delivery <Money value={quote.rate} /> by UPI, then enter the UTR
          </b>
          <CompanyPay />
          <TextField
            label="UTR / transaction ID"
            autoCapitalize="characters"
            value={f.utr}
            onChange={(e) => set('utr')(e.target.value)}
            error={errs.utr}
          />
          <FilePicker
            label="Payment screenshot"
            file={file}
            error={fileErr}
            disabled={placing}
            onChange={(x, problem) => (setFile(x), setFileErr(problem))}
          />
        </Card>
      )}

      {errs.quote && <Note tone="warn">{errs.quote}</Note>}
      {error ? <ErrorBox error={error} /> : null}
      <Button busy={placing} onClick={place}>
        Place order
      </Button>
    </MemberPage>
  );
}
