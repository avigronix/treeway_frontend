// Settings form model (pure, unit tested). The API keeps money in PAISE (whole numbers); the admin types ₹.
// Converting ₹ <-> paise here is exact text work (no float maths). The server checks every rule again.

export type Kind = 'money' | 'int' | 'percent' | 'bool';
export interface FieldDef {
  /** path inside the setting value; [] = the setting itself is the value */
  path: string[];
  label: string;
  kind: Kind;
}
export interface GroupDef {
  key: string;
  title: string;
  fields: FieldDef[];
  note?: string;
  /** shown, never editable here (with the reason) */
  readOnly?: string;
}

const RANKS = ['Distributor', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond'];

export const PLAN_GROUPS: GroupDef[] = [
  {
    key: 'activation_amount',
    title: 'Activation',
    fields: [{ path: [], label: 'Activation (₹)', kind: 'money' }],
    note: 'Also the price of one PIN.',
  },
  {
    key: 'product_wallet_on_activation',
    title: 'Product Wallet on activation',
    fields: [{ path: [], label: 'Product Wallet (₹)', kind: 'money' }],
  },
  {
    key: 'video',
    title: 'Daily videos',
    fields: [
      { path: ['reward'], label: 'Videos ₹ a day', kind: 'money' },
      { path: ['per_day'], label: 'Videos a day', kind: 'int' },
      { path: ['seconds'], label: 'Seconds per video', kind: 'int' },
      { path: ['days'], label: 'Days from activation', kind: 'int' },
    ],
  },
  {
    key: 'level_income',
    title: 'Level income (₹ per join)',
    fields: [
      { path: ['1'], label: 'L1', kind: 'money' },
      { path: ['2'], label: 'L2', kind: 'money' },
      { path: ['3'], label: 'L3', kind: 'money' },
      { path: ['4-10'], label: 'L4–10', kind: 'money' },
      { path: ['11-15'], label: 'L11–15', kind: 'money' },
      { path: ['16-25'], label: 'L16–25', kind: 'money' },
    ],
  },
  {
    key: 'super3',
    title: 'Super 3',
    fields: [
      { path: ['share_per_join'], label: 'Super 3 share of each join (₹)', kind: 'money' },
      { path: ['board1_entry'], label: 'Super 3 entry (₹)', kind: 'money' },
      { path: ['recycle'], label: 'Recycle (₹)', kind: 'money' },
      { path: ['s3_level_cut'], label: 'S3 Level (₹, per board income)', kind: 'money' },
      { path: ['s3_level_from_board'], label: 'S3 Level from board', kind: 'int' },
      { path: ['boards'], label: 'Super 3 boards', kind: 'int' },
      { path: ['direct_bonus'], label: '3rd+ direct to sponsor (₹)', kind: 'money' },
      { path: ['self_help'], label: 'To Self Help Fund (₹)', kind: 'money' },
    ],
    note: '3rd+ direct to sponsor + Self Help Fund must equal the Super 3 share of each join.',
  },
  {
    key: 'inactive_remove_days',
    title: 'Inactive IDs',
    fields: [{ path: [], label: 'Remove inactive IDs after (days)', kind: 'int' }],
  },
  {
    key: 'product_cost_percent',
    title: 'Product cost',
    fields: [{ path: [], label: 'Product cost (% of MRP)', kind: 'percent' }],
  },
  {
    key: 'ranks',
    title: 'Ranks and Royalty',
    fields: [
      ...RANKS.map((r, i) => ({
        path: ['need', r],
        label: i === 0 ? `${r} (active directs)` : `${r} (active team)`,
        kind: 'int' as const,
      })),
      { path: ['royalty_percent'], label: 'Royalty per rank (% of turnover)', kind: 'percent' },
      { path: ['leg_cap_percent'], label: 'Team line rule (% from one line)', kind: 'percent' },
      { path: ['pay_day'], label: 'Pay day of month', kind: 'int' },
    ],
    note: 'Royalty pool when empty: goes to the company.',
  },
];

export const CHARGE_GROUPS: GroupDef[] = [
  {
    key: 'cut_percent',
    title: 'Cut on every income',
    fields: [
      { path: ['tds'], label: 'TDS (%)', kind: 'percent' },
      { path: ['service'], label: 'Service (%)', kind: 'percent' },
      { path: ['single_leg'], label: 'Single Leg (%)', kind: 'percent' },
    ],
  },
  {
    key: 'min_withdraw',
    title: 'Withdraw',
    fields: [{ path: [], label: 'Min withdraw (₹)', kind: 'money' }],
  },
  {
    key: 'p2p',
    title: 'P2P',
    fields: [
      { path: ['fee_percent'], label: 'P2P fee (%)', kind: 'percent' },
      { path: ['min'], label: 'Min P2P (₹)', kind: 'money' },
      { path: ['max'], label: 'Max P2P at once (₹)', kind: 'money' },
      { path: ['daily_max'], label: 'P2P max a day (₹)', kind: 'money' },
    ],
  },
  {
    key: 'two_admin_threshold',
    title: '2-admin approval',
    fields: [{ path: [], label: 'Needs a second admin from (₹) · 0 = off', kind: 'money' }],
    note: "Off (0) by bhaiya's decision: one admin approves any amount. Turning it off cancels waiting approvals.",
  },
  {
    key: 'shop_sales_in_profit',
    title: 'Shop sales in profit',
    fields: [{ path: [], label: 'Count Fund / Income Wallet shop sales as profit', kind: 'bool' }],
    note: 'Keep OFF until the CA confirms.',
  },
];

/** Shop: max order + the delivery charge per state ("default" = all other states). Pincode rates are separate. */
export function shopGroup(shop: unknown): GroupDef {
  const courier = (getAt(shop, ['courier']) ?? {}) as Record<string, number>;
  const states = Object.keys(courier).sort((a, b) =>
    a === 'default' ? 1 : b === 'default' ? -1 : a.localeCompare(b),
  );
  return {
    key: 'shop',
    title: 'Shop and delivery',
    fields: [
      { path: ['order_max'], label: 'Max order (₹)', kind: 'money' },
      ...states.map((s) => ({
        path: ['courier', s],
        label: s === 'default' ? 'Delivery: other states (₹)' : `Delivery: ${s} (₹)`,
        kind: 'money' as const,
      })),
    ],
    note: 'A pincode with its own rate uses that rate instead (Products and orders → pincode rates).',
  };
}

export const READ_ONLY_GROUPS: GroupDef[] = [
  {
    key: 's3_level',
    title: 'Super 3 Level pool',
    fields: [
      { path: ['directs'], label: 'Active directs needed', kind: 'int' },
      { path: ['months'], label: 'Months of payouts', kind: 'int' },
    ],
    readOnly: 'Fixed in the plan (signed-off spec).',
  },
  {
    key: 'gullak',
    title: 'Gullak',
    fields: [
      { path: ['enabled'], label: 'Gullak is on', kind: 'bool' },
      { path: ['opening_charge'], label: 'Opening charge (₹)', kind: 'money' },
      { path: ['deposit_charge_percent'], label: 'Deposit charge (%)', kind: 'percent' },
      { path: ['interest_percent'], label: 'Interest a year (%)', kind: 'percent' },
      { path: ['interest_tds_percent'], label: 'TDS on interest (%)', kind: 'percent' },
    ],
    readOnly: 'Gullak stays OFF until the CA / lawyer approve it and its member screen is built.',
  },
];

// ---------------------------------------------------------------- values

export function getAt(v: unknown, path: string[]): unknown {
  return path.reduce<unknown>(
    (o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
    v,
  );
}

export function setAt(v: unknown, path: string[], x: unknown): unknown {
  if (!path.length) return x;
  const [k, ...rest] = path as [string, ...string[]];
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { ...o, [k]: setAt(o[k], rest, x) };
}

/** 98700 -> "987", 1250 -> "12.50". */
export function paiseToText(p: number): string {
  const r = Math.floor(p / 100);
  const c = p % 100;
  return c ? `${r}.${String(c).padStart(2, '0')}` : String(r);
}

/** "987" -> 98700, "12.5" -> 1250; null when not a ₹ amount with at most 2 decimals. Exact (text, not float). */
export function textToPaise(t: string): number | null {
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(t.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

export function toText(kind: Kind, v: unknown): string {
  if (kind === 'bool') return v ? 'true' : 'false';
  if (typeof v !== 'number') return '';
  return kind === 'money' ? paiseToText(v) : String(v);
}

/** Text from the form -> the API value, or an error message. */
export function fromText(kind: Kind, t: string): { value: unknown } | { error: string } {
  if (kind === 'bool') return { value: t === 'true' };
  if (kind === 'money') {
    const p = textToPaise(t);
    return p === null ? { error: 'Enter ₹ with at most 2 decimals.' } : { value: p };
  }
  if (kind === 'int') {
    return /^\d{1,9}$/.test(t.trim()) ? { value: Number(t.trim()) } : { error: 'Enter a whole number.' };
  }
  const n = Number(t.trim());
  return /^\d{1,3}(\.\d{1,2})?$/.test(t.trim()) && n <= 100
    ? { value: n }
    : { error: 'Enter a % from 0 to 100.' };
}

/** What the confirm sheet shows: label, old -> new, for the fields that change. */
export function diffText(
  g: GroupDef,
  before: unknown,
  after: unknown,
): { label: string; from: string; to: string }[] {
  const show = (kind: Kind, v: unknown) =>
    kind === 'bool'
      ? v
        ? 'On'
        : 'Off'
      : kind === 'money'
        ? `₹${toText(kind, v)}`
        : kind === 'percent'
          ? `${toText(kind, v)}%`
          : toText(kind, v);
  return g.fields
    .filter((f) => getAt(before, f.path) !== getAt(after, f.path))
    .map((f) => ({
      label: f.label,
      from: show(f.kind, getAt(before, f.path)),
      to: show(f.kind, getAt(after, f.path)),
    }));
}
