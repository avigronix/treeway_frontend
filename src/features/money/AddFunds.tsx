import { useState } from 'react';
import { Link } from 'react-router';
import { Button, Card, ErrorBox, FilePicker, Note, TextField } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { MemberPage } from '@/features/member/MemberPage';
import { useMyRequests } from './data';
import { amountText, checkAmount } from './moneyForm';
import { CompanyPay } from './PayDetails';
import { RequestList } from './Requests';
import { useUtrSend } from './useUtrSend';

// C3 "Add funds": pay the company, then send the UTR + receipt. The admin matches it with the bank and approves;
// the money lands in the Fund Wallet (PINs and shopping, never withdrawn). Limits as the backend: ₹100–₹5,00,000.
const MIN = 100;
const MAX = 500000;

export default function AddFunds() {
  const requests = useMyRequests('fund');
  const f = useUtrSend(requests);
  const [text, setText] = useState('');
  const [amountErr, setAmountErr] = useState<string | null>(null);

  return (
    <MemberPage narrow title="Add funds" subtitle="Pay the company, then upload proof" back="/wallet">
      <Card className="gap-3">
        <h2 className="m-0 text-[14.5px] font-bold">Company account</h2>
        <CompanyPay />
      </Card>
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const c = checkAmount(text, { min: MIN, max: MAX });
          setAmountErr(c.ok ? null : c.error);
          void f
            .send(
              { purpose: 'fund', amount: c.ok ? amountText(c.amount) : undefined },
              `Request sent for ${c.ok ? formatMoney(c.amount) : ''}. It reaches your Fund Wallet when our team approves it.`,
              c.ok,
            )
            .then((sent) => sent && setText(''));
        }}
      >
        <TextField
          label="Amount paid (₹)"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setAmountErr(null);
          }}
          error={amountErr}
        />
        <TextField
          label="UTR (12 digits)"
          help="You can find it in your UPI app's payment history"
          autoCapitalize="characters"
          autoComplete="off"
          value={f.utr}
          onChange={(e) => f.setUtr(e.target.value)}
          error={f.utrErr}
        />
        <FilePicker
          label="Payment receipt or screenshot"
          file={f.file}
          error={f.fileErr}
          disabled={f.sending}
          onChange={f.setFile}
        />
        <Note>
          This money goes to your Fund Wallet. Use it for PINs and shopping. It cannot be withdrawn to a bank.
        </Note>
        <Link to="/pins/buy" className="text-[13px] font-bold">
          Want PINs? Buy PINs directly ›
        </Link>
        {f.error ? <ErrorBox error={f.error} /> : null}
        {f.done && (
          <Note role="status" tone="info">
            {f.done}
          </Note>
        )}
        <Button type="submit" busy={f.sending}>
          Send request
        </Button>
      </form>
      <h2 className="m-0 text-[14.5px] font-bold">Past requests</h2>
      <RequestList q={requests} emptyTitle="No request yet" />
    </MemberPage>
  );
}
