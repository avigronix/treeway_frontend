import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { endSession, useMe } from '@/auth/session';
import { Button, ButtonLink, Card, Chip, Note, SectionTitle, Skeleton } from '@/components/ui';
import { isInstalled, promptInstall, useCanInstall } from '@/lib/install';
import { formatCount } from '@/lib/money';
import { useCompany } from '@/features/auth/usePublic';
import { useComplaintsMatrix, useDashboard, useVideosToday, useWalletSummary } from './data';
import { MemberPage } from './MemberPage';

// "More" menu: earnings, benefits and help, install, coming soon, WhatsApp group, log out.

function Item({ to, label, right }: { to: string; label: string; right?: ReactNode }) {
  return (
    <li className="border-b border-line2 last:border-b-0">
      <Link
        to={to}
        className="flex min-h-[58px] items-center justify-between gap-2.5 px-3.5 py-3 text-ink no-underline"
      >
        <b className="text-[13px]">{label}</b>
        {right ?? (
          <span aria-hidden="true" className="text-mut">
            ›
          </span>
        )}
      </Link>
    </li>
  );
}

function InstallCard() {
  const canInstall = useCanInstall();
  const [steps, setSteps] = useState(false);
  if (isInstalled()) return null;
  return (
    <Card className="gap-2">
      <button
        type="button"
        onClick={async () => {
          if (canInstall) await promptInstall();
          else setSteps((s) => !s);
        }}
        className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left text-ink"
      >
        <img src="/icons/icon-192.png" alt="" width={36} height={36} className="size-9 rounded-lg" />
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="text-[13px]">Install Treeway on your phone</b>
          <span className="text-xs text-mut">Opens like an app, right from your home screen</span>
        </span>
        <span aria-hidden="true" className="text-mut">
          ›
        </span>
      </button>
      {steps && (
        <Note>
          In your browser menu (⋮ or the share button), tap <b>Add to Home screen</b> or <b>Install app</b>.
        </Note>
      )}
    </Card>
  );
}

export default function More() {
  const me = useMe().data;
  const wallet = useWalletSummary().data;
  const videos = useVideosToday().data;
  const complaints = useComplaintsMatrix().data;
  const company = useCompany().data;
  const rankName = useDashboard().data?.rank_name;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const open = complaints ? (complaints.Submitted ?? 0) + (complaints['In Process'] ?? 0) : 0;

  return (
    <MemberPage
      title={me ? me.full_name : <Skeleton className="h-5 w-32" />}
      subtitle={me ? `${me.user_code}${rankName ? ` · ${rankName}` : ''}` : undefined}
      right={
        <ButtonLink to="/profile" variant="ghost" size="sm">
          Profile
        </ButtonLink>
      }
      desktopTitle="More"
    >
      <SectionTitle>Earnings</SectionTitle>
      <Card flat>
        <ul className="m-0 list-none p-0">
          <Item to="/team" label="My team" />
          <Item to="/level-income" label="Level income" />
          <Item to="/rank" label="Rank and Royalty" />
          <Item
            to="/pins"
            label="My PINs"
            right={
              wallet && wallet.ready_pins > 0 ? (
                <Chip tone="gold">{formatCount(wallet.ready_pins)} ready</Chip>
              ) : undefined
            }
          />
        </ul>
      </Card>
      <SectionTitle>Benefits and help</SectionTitle>
      <Card flat>
        <ul className="m-0 list-none p-0">
          <Item
            to="/videos"
            label="Daily videos"
            right={videos?.all_done ? <Chip tone="ok">Today done</Chip> : undefined}
          />
          <Item to="/shop" label="Shop and my orders" />
          <Item to="/ask-doctor" label="Ask a doctor" />
          <Item
            to="/complaints"
            label="Complaints"
            right={open > 0 ? <Chip tone="wait">{open} open</Chip> : undefined}
          />
          <Item to="/profile" label="Profile and bank" />
        </ul>
      </Card>
      <InstallCard />
      <SectionTitle>Coming soon</SectionTitle>
      <Card flat>
        <ul className="m-0 list-none p-0">
          {['Gullak savings (10% a year)', 'Repurchase income'].map((t) => (
            <li
              key={t}
              className="flex min-h-[58px] items-center justify-between gap-2.5 border-b border-line2 px-3.5 py-3 last:border-b-0"
            >
              <span className="text-[13px] text-mut">{t}</span>
              <Chip tone="muted">Coming soon</Chip>
            </li>
          ))}
        </ul>
      </Card>
      <div className="flex items-center justify-between gap-2.5">
        {company?.whatsapp_group ? (
          <a
            href={company.whatsapp_group}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold"
          >
            WhatsApp group{company.phone ? ` · ${company.phone}` : ''}
          </a>
        ) : (
          <span className="text-xs text-mut">{company?.phone ? `Help: ${company.phone}` : ''}</span>
        )}
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            endSession(qc);
            navigate('/login', { replace: true });
          }}
        >
          Log out
        </Button>
      </div>
    </MemberPage>
  );
}
