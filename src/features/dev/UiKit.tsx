import { useState } from 'react';
import { ApiError } from '@/api/client';
import { BottomNav } from '@/components/layout/BottomNav';
import { IconLink, TopBar } from '@/components/layout/TopBar';
import {
  Bar,
  Button,
  Card,
  Chip,
  Divider,
  Empty,
  ErrorBox,
  Hero,
  KeyValue,
  Money,
  Note,
  OtpInput,
  PasswordField,
  Pills,
  SectionTitle,
  SelectField,
  Sheet,
  SkeletonList,
  Tabs,
  TextAreaField,
  TextField,
} from '@/components/ui';

// DEV ONLY (route exists only in `npm run dev`). Every ui/ component in one place, to compare with docs/design.
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function UiKit() {
  const [tab, setTab] = useState<'ready' | 'received' | 'sent' | 'used'>('ready');
  const [pill, setPill] = useState<'all' | 'in' | 'out'>('all');
  const [otp, setOtp] = useState('8205');
  const [sheet, setSheet] = useState(false);
  const [clicks, setClicks] = useState(0);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-bg">
      <TopBar
        logo
        title="Hello, Suresh"
        subtitle={<span className="font-bold text-ok">TW482915 · Active · Distributor</span>}
        right={
          <IconLink to="/more" label="Notifications" dot>
            🔔
          </IconLink>
        }
      />
      <main className="flex flex-1 flex-col gap-3 px-4 py-3.5">
        <Hero>
          <span className="text-[13.5px] text-[#D6E8D0]">Income Wallet · you can withdraw this</span>
          <span className="num text-[34px] leading-[1.1] font-bold">
            <Money value={4860} />
          </span>
          <span className="text-[13px] text-[#E4EFE0]">
            Today <Money value={245} sign="always" /> · Total earned <Money value={12450} />
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <Button variant="light" size="md">
              Withdraw
            </Button>
            <Button variant="outline-white" size="md">
              Add funds
            </Button>
          </div>
        </Hero>

        <SectionTitle>Buttons</SectionTitle>
        <Button
          onClick={async () => {
            setClicks((c) => c + 1);
            await wait(1500);
          }}
        >
          Send request (tap twice fast: {clicks})
        </Button>
        <Button variant="ghost">Create a free account</Button>
        <div className="flex flex-wrap gap-2">
          <Button size="sm">Approve</Button>
          <Button size="sm" variant="danger">
            Reject
          </Button>
          <Button size="sm" variant="dash">
            + New
          </Button>
          <Button size="sm" disabled>
            Off
          </Button>
          <Button size="sm" busy>
            Busy
          </Button>
        </div>

        <SectionTitle>Form</SectionTitle>
        <Card>
          <TextField label="Sponsor ID" defaultValue="TW204518" ok="Ramesh Kumar · ID is active" />
          <TextField
            label="Mobile number"
            inputMode="numeric"
            defaultValue="98765"
            error="This number is already used"
          />
          <PasswordField label="Create password" help="Use at least 8 characters with letters and numbers." />
          <SelectField
            label="State"
            placeholder="Choose your state"
            options={[
              { value: 'UP', label: 'Uttar Pradesh' },
              { value: 'BR', label: 'Bihar' },
            ]}
          />
          <TextField label="Amount paid (₹)" big inputMode="decimal" defaultValue="987" />
          <TextAreaField label="Tell us everything" />
          <OtpInput value={otp} onChange={setOtp} />
        </Card>

        <SectionTitle>Status and money</SectionTitle>
        <Card flat>
          {[
            {
              t: 'Level 1 income',
              s: 'Amit (TW551203) · today 10:42',
              v: 90,
              chip: <Chip tone="ok">Income</Chip>,
            },
            {
              t: 'Withdrawal request',
              s: 'Today 12:05 · team is checking',
              v: -1000,
              chip: <Chip tone="wait">Waiting</Chip>,
            },
            { t: 'Payment', s: 'Wrong UTR', v: 987, chip: <Chip tone="bad">Rejected</Chip> },
          ].map((r) => (
            <div
              key={r.t}
              className="flex min-h-[58px] items-center justify-between gap-2.5 border-b border-line2 px-3.5 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <b className="text-[14.5px]">{r.t}</b>
                <span className="text-[12.5px] text-mut">{r.s}</span>
              </div>
              <div className="flex flex-none flex-col items-end gap-0.5">
                <Money value={r.v} colored />
                {r.chip}
              </div>
            </div>
          ))}
        </Card>
        <div className="flex flex-wrap gap-2">
          <Chip tone="gold">Distributor</Chip>
          <Chip tone="blue">Recycle ID</Chip>
          <Chip tone="muted">Draft</Chip>
        </div>
        <Card>
          <KeyValue k="Amount">
            <Money value={1000} />
          </KeyValue>
          <KeyValue k="Left in wallet">
            <Money value={3860} />
          </KeyValue>
          <Divider />
          <Bar value={1} max={3} label="Board 2 spots filled" />
          <Bar value={2} max={3} label="Rank progress" gold thick />
        </Card>

        <SectionTitle>Tabs and filters</SectionTitle>
        <Tabs
          label="My PINs"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'ready', label: 'Ready', count: 3 },
            { value: 'received', label: 'Received', count: 1 },
            { value: 'sent', label: 'Sent', count: 2 },
            { value: 'used', label: 'Used', count: 5 },
          ]}
        />
        <Pills
          label="Filter"
          value={pill}
          onChange={setPill}
          items={[
            { value: 'all', label: 'All', count: 48 },
            { value: 'in', label: 'Money in' },
            { value: 'out', label: 'Money out' },
          ]}
        />

        <SectionTitle>Notes</SectionTitle>
        <Note>This money goes to your Fund Wallet. It cannot be withdrawn to a bank.</Note>
        <Note tone="warn">Activate within 30 days, or this ID will be removed.</Note>

        <SectionTitle>Loading, empty, error</SectionTitle>
        <SkeletonList rows={2} />
        <Empty title="No income yet" text="Share your link. You earn when someone joins." />
        <ErrorBox
          error={new ApiError(409, 'Busy', 'Server is busy. Please try again.')}
          onRetry={() => wait(800)}
        />

        <Button variant="ghost" onClick={() => setSheet(true)}>
          Open sheet
        </Button>
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Send PINs to a member">
          <TextField label="Member ID" placeholder="TW1234567" />
          <Button onClick={() => wait(1200).then(() => setSheet(false))}>Send</Button>
        </Sheet>
      </main>
      <div className="sticky bottom-0">
        <BottomNav />
      </div>
    </div>
  );
}
