import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Schema } from '@/api/schema';
import { Button, ErrorBox, SkeletonList } from '@/components/ui';
import { amountInWords } from '@/lib/amountWords';
import { formatFullDate } from '@/lib/dates';

// The invoice of a shop order (Vinay 6 Nov): non-GST for now, numbered when the order is placed
// (TW/INV/2026-27/000001). A page of its own (no app menu, no video lock over it) so "Print / Save as PDF" prints
// only the invoice; on a phone the print screen has "Save as PDF". Every amount comes from the server.

type Invoice = Schema<'Invoice'>;

const inr = (v: number) =>
  `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const WALLET = { product: 'Product Wallet', fund: 'Fund Wallet', income: 'Income Wallet' } as const;
const COURIER = { pending: 'being checked', approved: 'received', rejected: 'not approved' } as const;

function InvoiceSheet({ d }: { d: Invoice }) {
  const s = d.seller;
  const cancelled = d.status === 'cancelled';
  const wallets = (Object.keys(WALLET) as (keyof typeof WALLET)[]).filter((w) => d.paid[w] > 0);
  return (
    <article
      aria-label={`Invoice ${d.invoice_no}`}
      className="relative mx-auto flex w-full max-w-[800px] [print-color-adjust:exact] flex-col gap-6 overflow-hidden rounded-2xl border border-line bg-white p-5 text-[13.5px] text-ink tab:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0"
    >
      {cancelled ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -rotate-[24deg] rounded-xl border-[6px] border-red/40 px-6 py-2 font-brand text-[56px] font-bold tracking-widest text-red/30"
        >
          CANCELLED
        </span>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-4 border-b-[3px] border-gold pb-5">
        <div className="flex flex-col gap-1">
          <img
            src="/icons/logo-header.png"
            alt=""
            width={110}
            height={60}
            className="h-[60px] w-[110px] object-contain"
          />
          <b className="text-[17px] text-gt">{s.name || 'Treeway'}</b>
          {s.address ? <span className="max-w-[320px] text-mut">{s.address}</span> : null}
          {s.phone || s.email ? (
            <span className="text-mut">{[s.phone, s.email].filter(Boolean).join(' · ')}</span>
          ) : null}
          {s.gstin ? <span className="font-semibold">GSTIN: {s.gstin}</span> : null}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <h1 className="m-0 font-brand text-[28px] tracking-[.12em] text-gt">INVOICE</h1>
          <dl className="m-0 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-[13px]">
            <dt className="text-mut">Invoice no.</dt>
            <dd className="m-0 num font-bold">{d.invoice_no}</dd>
            <dt className="text-mut">Date</dt>
            <dd className="m-0">{formatFullDate(d.invoice_date)}</dd>
            <dt className="text-mut">Order no.</dt>
            <dd className="m-0 num">{d.order_no}</dd>
          </dl>
          {cancelled ? (
            <span className="mt-1 rounded-full bg-bbg px-2.5 py-0.5 text-xs font-bold text-b">Cancelled</span>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 tab:grid-cols-2">
        <div className="flex flex-col gap-0.5 rounded-xl bg-bg p-4 print:border print:border-line print:bg-white">
          <span className="text-[11.5px] font-bold tracking-[.14em] text-goldt uppercase">Bill to</span>
          <b>{d.buyer.name}</b>
          <span className="text-mut">Member ID {d.buyer.user_code}</span>
          <span className="text-mut">Mobile {d.buyer.mobile}</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-xl bg-bg p-4 print:border print:border-line print:bg-white">
          <span className="text-[11.5px] font-bold tracking-[.14em] text-goldt uppercase">Ship to</span>
          <b>{d.buyer.name}</b>
          <span className="text-mut">{d.buyer.address}</span>
          <span className="text-mut">PIN {d.buyer.pincode}</span>
        </div>
      </section>

      <div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gt text-left text-[12px] tracking-[.06em] text-white uppercase print:bg-gt">
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Item</th>
              <th className="hidden px-3 py-2 text-right font-semibold tab:table-cell print:table-cell">
                Qty
              </th>
              <th className="hidden px-3 py-2 text-right font-semibold tab:table-cell print:table-cell">
                Price (MRP)
              </th>
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((i, n) => (
              <tr key={`${i.name}-${n}`} className="border-b border-line2">
                <td className="px-3 py-2.5 text-mut">{n + 1}</td>
                <td className="px-3 py-2.5">
                  <b>{i.name}</b>
                  {/* Phone: qty × price under the name (the two columns are hidden). */}
                  <span className="num block text-[12.5px] text-mut tab:hidden print:hidden">
                    {i.qty} × {inr(i.mrp)}
                  </span>
                </td>
                <td className="num hidden px-3 py-2.5 text-right tab:table-cell print:table-cell">{i.qty}</td>
                <td className="num hidden px-3 py-2.5 text-right tab:table-cell print:table-cell">
                  {inr(i.mrp)}
                </td>
                <td className="num px-3 py-2.5 text-right">{inr(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="grid gap-5 tab:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-2">
          <span className="text-[11.5px] font-bold tracking-[.14em] text-goldt uppercase">
            Amount in words
          </span>
          <span className="font-semibold">{amountInWords(d.total)}</span>
          <span className="mt-2 text-[11.5px] font-bold tracking-[.14em] text-goldt uppercase">Payment</span>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-mut">
            {wallets.map((w) => (
              <li key={w}>
                {inr(d.paid[w])} from {WALLET[w]}
              </li>
            ))}
            {d.courier_charge > 0 ? (
              <li>
                {inr(d.courier_charge)} courier by UPI · UTR {d.courier_utr} ({COURIER[d.courier_status]})
              </li>
            ) : null}
          </ul>
        </div>
        <dl className="m-0 flex flex-col gap-1.5 self-start rounded-xl border border-line p-4">
          <div className="flex justify-between gap-3">
            <dt className="text-mut">Items total</dt>
            <dd className="num m-0">{inr(d.items_total)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-mut">Courier charges</dt>
            <dd className="num m-0">{inr(d.courier_charge)}</dd>
          </div>
          <div className="mt-1 flex justify-between gap-3 border-t-2 border-gt pt-2 text-[16px] font-bold text-gt">
            <dt>Grand total</dt>
            <dd className="num m-0">{inr(d.total)}</dd>
          </div>
        </dl>
      </section>

      {cancelled ? (
        <section className="flex flex-col gap-1 rounded-xl border border-bbg bg-bbg/50 p-4 text-b">
          <b>
            Order cancelled{d.cancelled_at ? ` on ${formatFullDate(d.cancelled_at)}` : ''}
            {d.cancel_reason ? `: ${d.cancel_reason}` : ''}
          </b>
          <span>{inr(d.items_total)} went back to the same wallets.</span>
          {d.courier_refunded_at ? (
            <span>Courier charges sent back on {formatFullDate(d.courier_refunded_at)}.</span>
          ) : d.courier_refund_due ? (
            <span>Courier charges: being sent back from the bank.</span>
          ) : null}
        </section>
      ) : null}

      <footer className="flex flex-col gap-1 border-t border-line pt-4 text-[12px] text-mut">
        {s.gstin ? null : <span>Not registered under GST: no GST is charged on this invoice.</span>}
        <span>This is a computer-generated invoice and does not need a signature.</span>
        <span>
          For a damaged or wrong product, tell us within 48 hours of delivery (see the refund policy on our
          website).
        </span>
        <b className="pt-1 font-brand text-[13px] text-goldt">
          Treeway – The Power of Nature, The Promise of Trust.
        </b>
      </footer>
    </article>
  );
}

function InvoicePage({ path, back, backLabel }: { path: string; back: string; backLabel: string }) {
  const q = useQuery({
    queryKey: ['invoice', path],
    queryFn: ({ signal }) => api<Invoice>(path, { signal }),
  });
  const no = q.data?.invoice_no;
  useEffect(() => {
    if (!no) return;
    const before = document.title;
    // The PDF's file name: Treeway-Invoice-TW-INV-2026-27-000001
    document.title = `Treeway-Invoice-${no.replaceAll('/', '-')}`;
    return () => {
      document.title = before;
    };
  }, [no]);

  return (
    <div className="min-h-dvh bg-bg px-3 py-4 tab:px-6 tab:py-8 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[800px] flex-wrap items-center justify-between gap-2 print:hidden">
        <Link to={back} className="text-[14px] font-semibold text-g no-underline">
          ‹ {backLabel}
        </Link>
        <Button size="md" disabled={!q.data} onClick={() => window.print()} className="tab:w-auto tab:px-6">
          Print / Save as PDF
        </Button>
      </div>
      {q.isError ? (
        <div className="mx-auto max-w-[800px]">
          <ErrorBox error={q.error} onRetry={() => q.refetch()} />
        </div>
      ) : !q.data ? (
        <div className="mx-auto max-w-[800px]">
          <SkeletonList rows={6} />
        </div>
      ) : (
        <InvoiceSheet d={q.data} />
      )}
      <p className="mx-auto mt-3 max-w-[800px] text-center text-[12.5px] text-mut print:hidden">
        On a phone: tap Print / Save as PDF, then choose "Save as PDF" to download it.
      </p>
    </div>
  );
}

/** The member's own order (/shop/orders/:id/invoice). */
export function MemberInvoice() {
  const { id } = useParams();
  return (
    <InvoicePage path={`/shop/orders/${Number(id)}/invoice`} back="/shop/orders" backLabel="My orders" />
  );
}

/** Any order, for the admin (/admin/orders/:id/invoice). */
export function AdminInvoice() {
  const { id } = useParams();
  return (
    <InvoicePage path={`/admin/orders/${Number(id)}/invoice`} back="/admin/shop" backLabel="Shop orders" />
  );
}
