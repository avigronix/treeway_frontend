import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, adminKeys, type AdminSettings as Data } from '@/api/admin';
import { ErrorBox, Note, SkeletonList } from '@/components/ui';
import { AdminTitle } from './AdminParts';
import { CompanyPanel } from './AdminCompany';
import { SettingsGroup } from './SettingsGroup';
import { CHARGE_GROUPS, PLAN_GROUPS, READ_ONLY_GROUPS, shopGroup, type GroupDef } from './settingsForm';

// K1 "Settings". Company details first (members cannot pay without them), then plan numbers, charges and
// limits. Locked numbers show why. Every change asks to confirm (old -> new) and is saved with the admin's name.

const SECTIONS = [
  { id: 'company', label: 'Company details' },
  { id: 'plan', label: 'Plan and income' },
  { id: 'charges', label: 'Charges and limits' },
  { id: 'fixed', label: 'Fixed for now' },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-3">
      <h2 className="m-0 text-[17px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Groups({ data }: { data: Data }) {
  const [msgs, setMsgs] = useState<Record<string, string | null>>({});
  // Re-mount a group when the server's value changes (after a save, or another admin's change), so the form
  // never sends an old number back over someone else's change.
  const one = (g: GroupDef) => (
    <SettingsGroup
      key={`${g.key}:${JSON.stringify(data.settings[g.key])}`}
      g={g}
      data={data}
      msg={msgs[g.key] ?? null}
      setMsg={(m) => setMsgs((x) => ({ ...x, [g.key]: m }))}
    />
  );
  return (
    <>
      <Section id="plan" title="Plan and income">
        {PLAN_GROUPS.map(one)}
      </Section>
      <Section id="charges" title="Charges and limits">
        {[...CHARGE_GROUPS, shopGroup(data.settings.shop)].map(one)}
      </Section>
      <Section id="fixed" title="Fixed for now">
        {READ_ONLY_GROUPS.map(one)}
      </Section>
    </>
  );
}

export default function AdminSettings() {
  const s = useQuery({ queryKey: adminKeys.settings, queryFn: ({ signal }) => adminApi.settings(signal) });

  return (
    <>
      <AdminTitle title="Settings" sub="Change plan amounts and % here, no code change needed" />
      <Note>
        Changes apply only to new income. Income already paid will not change. Every change is saved with the
        admin's name.
      </Note>
      {s.isError ? (
        <ErrorBox error={s.error} onRetry={() => s.refetch()} />
      ) : !s.data ? (
        <SkeletonList rows={6} />
      ) : (
        // Laptop: a section list on the left that stays in view; the forms are at most 1040 px wide.
        <div className="wide:grid wide:grid-cols-[200px_minmax(0,1040px)] wide:items-start wide:gap-8">
          <nav
            aria-label="Settings sections"
            className="hidden wide:sticky wide:top-24 wide:flex wide:flex-col wide:gap-1"
          >
            {SECTIONS.map((x) => (
              <a
                key={x.id}
                href={`#${x.id}`}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink no-underline hover:bg-soft hover:text-g"
              >
                {x.label}
              </a>
            ))}
          </nav>
          <div className="flex min-w-0 flex-col gap-[18px]">
            <div id="company" className="scroll-mt-24">
              <CompanyPanel data={s.data} />
            </div>
            <Groups data={s.data} />
          </div>
        </div>
      )}
    </>
  );
}
