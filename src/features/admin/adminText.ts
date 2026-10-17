import { formatCount } from '@/lib/money';
import { CODE_RE } from '@/lib/validators';

// Pure helpers of the admin screens (unit tested in adminText.test.ts).

/** Checks the cash-PIN form. Pure, unit tested. */
export function checkIssue(code: string, qty: string, remark: string) {
  const n = Number(qty);
  return {
    code: CODE_RE.test(code.trim().toUpperCase()) ? undefined : 'Enter the member ID, like TW1234567.',
    qty: /^\d+$/.test(qty.trim()) && n >= 1 && n <= 500 ? undefined : 'Enter 1 to 500 PINs.',
    remark:
      remark.trim().length >= 3 ? undefined : 'Write why (at least 3 letters), e.g. "Cash at the office".',
  };
}

/** "18 a day", "under 1 a day", "–". Pure, unit tested. */
export function speedText(perDay: number): string {
  if (!perDay || perDay <= 0) return '–';
  if (perDay < 1) return 'under 1 a day';
  return `${formatCount(Math.round(perDay))} a day`;
}

/**
 * The status buttons on a complaint, the same moves the server allows (base.py allowedTransitions).
 * Pure, unit tested.
 */
export function nextStatuses(
  s: string,
): { to: 'In Process' | 'Resolved' | 'Closed' | 'Rejected'; text: string; kind: 'main' | 'plain' | 'bad' }[] {
  if (s === 'Submitted')
    return [
      { to: 'In Process', text: 'Start working', kind: 'main' },
      { to: 'Closed', text: 'Close', kind: 'plain' },
      { to: 'Rejected', text: 'Reject', kind: 'bad' },
    ];
  if (s === 'In Process') return [{ to: 'Resolved', text: 'Mark as solved', kind: 'main' }];
  if (s === 'Resolved') return [{ to: 'Closed', text: 'Close', kind: 'plain' }];
  return [];
}

/** Ledger types the server can reverse (routes/reverseApis.py REVERSIBLE). */
const REVERSIBLE = new Set(['level_income', 'direct_bonus', 'fund_add', 'admin_debit']);

/** "Reverse" shows only where the server would accept it. Pure, unit tested. */
export const canReverse = (r: { type: string; reversed: boolean }) => REVERSIBLE.has(r.type) && !r.reversed;

/** Ledger type in plain words for admin tables. */
export const TYPE_TEXT: Record<string, string> = {
  level_income: 'Level income',
  direct_bonus: 'Direct bonus',
  super3_income: 'Super 3 income',
  fund_add: 'Funds added',
  admin_debit: 'Admin deduction',
  reversal: 'Reverse entry',
  withdrawal: 'Withdrawal',
  withdrawal_refund: 'Withdrawal returned',
  p2p_in: 'P2P received',
  p2p_out: 'P2P sent',
  pin_buy: 'PINs bought',
  activation_product: 'Activation (product)',
  yfi_daily: 'Daily videos',
  single_leg: 'Single Leg income',
  royalty: 'Royalty',
  s3_level: 'S3 Level income',
  shop_order: 'Shop order',
  shop_refund: 'Shop refund',
};
export const typeText = (t: string) => TYPE_TEXT[t] ?? t.replace(/_/g, ' ');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10" → "October 2026"-style short label "Oct 2026". */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** The last n month keys (YYYY-MM), newest first, from an IST day key (YYYY-MM-DD). Pure, unit tested. */
export function lastMonths(todayKey: string, n: number): string[] {
  let [y, m] = todayKey.split('-').map(Number) as [number, number];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

/** Indian financial year (April–March) of an IST day key: 2026-10-16 → "2026-27", 2027-02-01 → "2026-27". */
export function fyOf(todayKey: string): string {
  const [y, m] = todayKey.split('-').map(Number) as [number, number];
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** This and the previous financial years, newest first. */
export const lastFys = (todayKey: string, n: number) => {
  const first = Number(fyOf(todayKey).slice(0, 4));
  return Array.from(
    { length: n },
    (_, i) => `${first - i}-${String((first - i + 1) % 100).padStart(2, '0')}`,
  );
};

/** First and last day (YYYY-MM-DD) of a month key; the last day is today when it is the running month. */
export function monthRange(key: string, todayKey: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number) as [number, number];
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${key}-${String(days).padStart(2, '0')}`;
  return { from: `${key}-01`, to: end > todayKey ? todayKey : end };
}

/** Checks the banner form (the server checks again). Pure, unit tested. */
export function checkBanner(
  f: { title: string; starts_on: string; ends_on: string; link_url: string; sort_order: string },
  needImage: boolean,
  hasImage: boolean,
) {
  const n = Number(f.sort_order);
  return {
    title: f.title.trim().length >= 2 ? undefined : 'Write a short title (2 letters or more).',
    ends_on:
      f.starts_on && f.ends_on && f.ends_on < f.starts_on
        ? 'The end date must be on or after the start date.'
        : undefined,
    link_url:
      !f.link_url.trim() || /^(https:\/\/|\/)/.test(f.link_url.trim())
        ? undefined
        : 'Use an https:// link or an app path like /shop.',
    sort_order: /^\d+$/.test(f.sort_order.trim()) && n <= 1000 ? undefined : 'Enter 0 to 1000.',
    image: needImage && !hasImage ? 'Choose the banner picture.' : undefined,
  };
}

/** "Live", "Off", "Starts 20 Oct" or "Ended": the state of a banner today. */
export function bannerState(
  b: { is_active: boolean; live: boolean; starts_on?: string | null; ends_on?: string | null },
  todayKey: string,
): 'live' | 'off' | 'later' | 'ended' {
  if (b.live) return 'live';
  if (!b.is_active) return 'off';
  if (b.starts_on && b.starts_on > todayKey) return 'later';
  return 'ended';
}

/** AdminShop tabs and the server filter each one sends. */
export const ORDER_TABS = [
  { value: 'payment', label: 'Payment to check', q: { status: 'placed', courier_status: 'pending' } },
  { value: 'pack', label: 'To pack', q: { status: 'placed', courier_status: 'approved' } },
  { value: 'packed', label: 'Packed', q: { status: 'packed' } },
  { value: 'shipped', label: 'On the way', q: { status: 'shipped' } },
  { value: 'delivered', label: 'Delivered', q: { status: 'delivered' } },
  { value: 'cancelled', label: 'Cancelled', q: { status: 'cancelled' } },
  { value: 'refund', label: 'Refunds due', q: { refund_due: true } },
] as const;
export type OrderTab = (typeof ORDER_TABS)[number]['value'];

/** What the admin does next with an order (the same order the server allows). Pure, unit tested. */
export function orderStep(o: {
  status: string;
  courier_status: string;
  courier_refund_due: boolean;
  courier_refunded_at: string | null;
}): 'payment' | 'pack' | 'member' | 'ship' | 'deliver' | 'refund' | 'none' {
  if (o.status === 'placed')
    return o.courier_status === 'pending' ? 'payment' : o.courier_status === 'approved' ? 'pack' : 'member';
  if (o.status === 'packed') return 'ship';
  if (o.status === 'shipped') return 'deliver';
  if (o.status === 'cancelled' && o.courier_refund_due && !o.courier_refunded_at) return 'refund';
  return 'none';
}

/** Product form (the server checks again). Pure, unit tested. */
export function checkProduct(
  f: { name: string; mrp: string; stock: string },
  isNew: boolean,
  stockNow: number,
) {
  const s = f.stock.trim();
  const n = Number(s);
  return {
    name: f.name.trim().length >= 2 ? undefined : 'Write the product name.',
    mrp:
      /^\d{1,7}(\.\d{1,2})?$/.test(f.mrp.trim()) && Number(f.mrp) > 0
        ? undefined
        : 'Enter the MRP in ₹ (at most 2 decimals).',
    stock: isNew
      ? /^\d+$/.test(s) && n <= 1_000_000
        ? undefined
        : 'Enter how many you have (0 or more).'
      : s === '' || s === '0'
        ? undefined
        : !/^-?\d+$/.test(s)
          ? 'Enter a whole number, like 20 or -5.'
          : stockNow + n < 0
            ? `Stock cannot go below 0 (now ${stockNow}).`
            : undefined,
  };
}

/**
 * One PIN code rate: ₹1–5000, or "use the state rate". ₹0 is refused here: checkout always needs a delivery
 * UTR, so a free PIN code could never order (question Q4 for bhaiya). Pure, unit tested.
 */
export function checkRate(pin: string, rate: string, useState: boolean) {
  return {
    pin: /^[1-9]\d{5}$/.test(pin.trim()) ? undefined : 'Enter a valid 6 digit PIN code.',
    rate:
      useState || (/^\d{1,4}(\.\d{1,2})?$/.test(rate.trim()) && Number(rate) >= 1 && Number(rate) <= 5000)
        ? undefined
        : 'Enter ₹1 to ₹5000.',
  };
}

/** Add doctor form (the same rules as the backend AdminCreateModel + BAMS no.). Pure, unit tested. */
export function checkDoctor(f: {
  full_name: string;
  mobile: string;
  email: string;
  password: string;
  bams_reg_no: string;
}) {
  return {
    full_name: f.full_name.trim().length >= 2 ? undefined : 'Enter the full name.',
    mobile: /^[6-9]\d{9}$/.test(f.mobile) ? undefined : 'Enter a valid 10 digit mobile number.',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) ? undefined : 'Enter a valid email.',
    password:
      f.password.length >= 8 &&
      f.password.length <= 64 &&
      /[A-Za-z]/.test(f.password) &&
      /\d/.test(f.password)
        ? undefined
        : 'Use at least 8 characters with letters and numbers.',
    bams_reg_no: f.bams_reg_no.trim().length >= 3 ? undefined : 'Enter the BAMS registration number.',
  };
}

/** AdminDash search "Member ID, UTR or complaint no." -> where to open it. Pure, unit tested. */
export function searchTarget(raw: string): string | null {
  const q = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!q) return null;
  if (CODE_RE.test(q)) return `/admin/members/${q}`;
  if (/^CMP\d{10}$/.test(q)) return `/admin/complaints?search=${q}`;
  return `/admin/funds?search=${encodeURIComponent(q)}`; // a UTR (or part of a name / ID): the payments list searches it
}

type PnlData = {
  joins: number;
  money_in: { turnover: number };
  company_income: Record<
    | 'service_charge'
    | 'company_spots_super3'
    | 'unpaid_levels_and_lapses'
    | 'p2p_fee'
    | 'admin_debits'
    | 'reversals'
    | 'single_leg_leftover'
    | 'royalty_leftover'
    | 's3_level_leftover'
    | 'gullak_charges',
    number
  >;
  costs: Record<
    'level_income_pool' | 'super3_share' | 'royalty_pools' | 'product_cost' | 'gullak_interest',
    number
  >;
  kept_out: Record<'tds' | 'self_help' | 's3_hold' | 's3_level_pool' | 'gullak_held', number>;
};

/** Labels for the server's P&L numbers (no sums here: the server's `profit` is the profit). Lines at ₹0 are left
 * out, except joinings. Used by the dashboard block and AdminIncome. */
export function pnlLines(d: PnlData) {
  const ci = d.company_income;
  const k = d.kept_out;
  const shown = (rows: [string, number][]) => rows.filter(([, v], i) => i === 0 || v !== 0);
  return {
    moneyIn: shown([
      [`Joinings (${formatCount(d.joins)})`, d.money_in.turnover],
      ['Service charge', ci.service_charge],
      ['Super 3 company ID income', ci.company_spots_super3],
      ['Unpaid levels and lapsed income', ci.unpaid_levels_and_lapses],
      ['P2P fee', ci.p2p_fee],
      ['Admin deductions', ci.admin_debits],
      ['Reverse entries', ci.reversals],
      ['Single Leg left over', ci.single_leg_leftover],
      ['Royalty left over', ci.royalty_leftover],
      ['S3 Level left over', ci.s3_level_leftover],
      ['Gullak charges', ci.gullak_charges],
    ]),
    moneyOut: shown([
      ['Level income', d.costs.level_income_pool],
      ["Super 3 (members' share)", d.costs.super3_share],
      ['Royalty pools', d.costs.royalty_pools],
      ['Product cost (5% of MRP)', d.costs.product_cost],
      ['Gullak interest', d.costs.gullak_interest],
    ]),
    keptAside: shown([
      ['TDS (government money)', k.tds],
      ['Self Help Fund', k.self_help],
      ["On hold (1st direct's ₹300)", k.s3_hold],
      ['S3 Level pool (to be shared)', k.s3_level_pool],
      ['Gullak deposits', k.gullak_held],
    ]),
  };
}
