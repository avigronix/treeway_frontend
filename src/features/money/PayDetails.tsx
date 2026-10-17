import { useState } from 'react';
import { companyQrUrl, type CompanyDetail } from '@/api/company';
import { CopyButton, ErrorBox, KeyValue, Note, Skeleton, Tabs } from '@/components/ui';
import { useCompany } from '@/features/auth/usePublic';

/** The company's UPI / QR / bank (set by the admin in Settings). Used by Activate, Add funds and Buy PINs. */
export function PayDetails({ company }: { company: CompanyDetail }) {
  const [tab, setTab] = useState<'upi' | 'bank'>('upi');
  const qr = companyQrUrl(company.qr_path);
  const hasUpi = !!(company.upi_id || qr);
  const hasBank = !!(company.account_no && company.ifsc);

  if (!hasUpi && !hasBank) {
    return (
      <Note tone="warn">
        Payment details are not set yet. Please contact support
        {company.phone ? (
          <>
            {' '}
            on <b>{company.phone}</b>
          </>
        ) : null}
        .
      </Note>
    );
  }

  return (
    <>
      <Tabs
        label="How to pay"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'upi', label: 'UPI / QR' },
          { value: 'bank', label: 'Bank account' },
        ]}
      />
      {tab === 'upi' ? (
        hasUpi ? (
          <div className="flex items-stretch gap-3">
            {qr ? (
              <img
                src={qr}
                alt="Company UPI QR code"
                className="size-28 flex-none rounded-[10px] border border-line object-contain"
              />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
              <span className="text-xs text-mut">UPI ID</span>
              <b className="text-[15px] break-all">{company.upi_id || '–'}</b>
              {company.upi_id ? (
                <CopyButton text={company.upi_id} label="Copy UPI ID" className="self-start" />
              ) : null}
            </div>
          </div>
        ) : (
          <Note>UPI is not set yet. Please use the bank account.</Note>
        )
      ) : hasBank ? (
        <div className="flex flex-col gap-2">
          <KeyValue k="Name">{company.account_holder || '–'}</KeyValue>
          <KeyValue k="Account">{company.account_no}</KeyValue>
          <KeyValue k="IFSC">{company.ifsc}</KeyValue>
          {company.branch ? <KeyValue k="Branch">{company.branch}</KeyValue> : null}
          <CopyButton
            text={`Name: ${company.account_holder}\nAccount: ${company.account_no}\nIFSC: ${company.ifsc}`}
            label="Copy all"
            className="self-start"
          />
        </div>
      ) : (
        <Note>Bank account is not set yet. Please pay by UPI.</Note>
      )}
    </>
  );
}

/** PayDetails with its own loading / error state. */
export function CompanyPay() {
  const company = useCompany();
  if (company.data) return <PayDetails company={company.data} />;
  if (company.isError) return <ErrorBox error={company.error} onRetry={() => company.refetch()} />;
  return <Skeleton className="h-28 w-full" />;
}
