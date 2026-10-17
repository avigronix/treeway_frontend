import type { LedgerRow } from '@/api/member';
import type { ChipTone } from '@/components/ui';
import { formatDay, formatWhen } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

// How one wallet history row reads on screen. Pure (unit tested). Every number comes from the row the API
// sent: type, amount, gross and cuts, meta (from routes/walletApis.py, mlmEngine.py, singleLeg.py).

export interface RowView {
  title: string;
  detail: string;
  chip?: { tone: ChipTone; text: string };
  /** small text under the amount when there is no chip, e.g. "Income" or "₹100 − ₹10" */
  note?: string;
  /** income rows only: where it came from, without the time ("TW5512030 joined", "Board 1 full") */
  source?: string;
}

const WALLET: Record<LedgerRow['wallet'], string> = { income: 'Income', fund: 'Fund', product: 'Product' };

export const INCOME_LABEL: Record<string, string> = {
  level_income: 'Level',
  direct_bonus: 'Direct bonus',
  super3_income: 'Super 3',
  single_leg: 'Single Leg',
  royalty: 'Royalty',
  s3_level: 'Super 3 Level',
};

const RANK_NAMES = ['Distributor', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2026-09" -> "September" (royalty and Super 3 Level rows are paid for a month). */
export function monthName(ym: unknown): string {
  const m = /^(\d{4})-(\d{2})/.exec(String(ym ?? ''));
  return m ? (MONTHS[Number(m[2]) - 1] ?? String(ym)) : String(ym ?? '');
}

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
/** "Amit (TW551203)" when the backend sends the name (BACKEND_REQUESTS #5), else just the code. */
const who = (m: Record<string, unknown>) =>
  m.from_name ? `${str(m.from_name)} (${str(m.from)})` : str(m.from);

/** "₹100 − ₹10": what the income was before the 10% cut, and the cut. Display only (paise-exact). */
export function cutText(
  row: Pick<LedgerRow, 'gross' | 'tds' | 'service' | 'single_leg' | 'other_cut'>,
): string | null {
  const paise = (n: number) => Math.round(n * 100);
  const cut = paise(row.tds) + paise(row.service) + paise(row.single_leg) + paise(row.other_cut);
  if (!row.gross || cut <= 0) return null;
  return `${formatMoney(row.gross)} − ${formatMoney(cut / 100)}`;
}

export function describeRow(row: LedgerRow, now: Date = new Date()): RowView {
  const m = (row.meta ?? {}) as Record<string, unknown>;
  const when = formatWhen(row.created_at, now);
  const wallet = WALLET[row.wallet];
  const cut = cutText(row) ?? wallet;

  switch (row.type) {
    case 'level_income': {
      const level = Number(m.level);
      return {
        title: `Level ${level || ''}${level === 1 ? ' · Direct' : ''}`.trim(),
        detail: `${who(m)} joined · ${when}`,
        note: cut,
        source: `${who(m)} joined`,
      };
    }
    case 'direct_bonus':
      return {
        title: 'Direct bonus',
        detail: `${who(m)} joined · your 3rd+ direct`,
        note: cut,
        source: `${who(m)} joined`,
      };
    case 'super3_income':
      return {
        title: `Super 3 · Board ${str(m.board)} full`,
        detail: when,
        note: cut,
        source: `Board ${str(m.board)} full`,
      };
    case 'single_leg':
      return {
        title: 'Single Leg',
        detail: m.earners ? `From ${str(m.earners)} people in your line · ${when}` : when,
        note: cut,
        source: m.earners ? `${str(m.earners)} people in your line` : 'Your line',
      };
    case 'royalty':
      return {
        title: m.rank ? `Royalty · ${RANK_NAMES[Number(m.rank) - 1] ?? str(m.rank)} pool` : 'Royalty',
        detail: m.month ? `For ${monthName(m.month)} · paid ${formatDay(row.created_at, now)}` : when,
        note: cut,
        source: m.month
          ? `${RANK_NAMES[Number(m.rank) - 1] ?? ''} pool, ${monthName(m.month)}`.trim()
          : 'Royalty',
      };
    case 's3_level':
      return {
        title: 'Super 3 Level',
        detail: m.month ? `For ${monthName(m.month)} · paid ${formatDay(row.created_at, now)}` : when,
        note: cut,
        source: m.month ? `Pool, ${monthName(m.month)}` : 'Pool',
      };
    case 'fund_add':
      return {
        title: 'Funds added',
        detail: `UTR ${str(m.utr)} · ${formatDay(row.created_at, now)}`,
        chip: { tone: 'ok', text: 'Approved' },
      };
    case 'pin_buy':
      return {
        title: `Bought ${str(m.qty)} PIN${Number(m.qty) === 1 ? '' : 's'}`,
        detail: when,
        note: wallet,
      };
    case 'p2p_out':
      return {
        title: `Sent to ${str(m.to_name) || str(m.to)} (P2P)`,
        // meta.fee is in paise (the backend keeps money in paise; only the API fields are rupees)
        detail: m.fee !== undefined ? `${when} · fee ${formatMoney(Number(m.fee) / 100)}` : when,
        note: wallet,
      };
    case 'p2p_in':
      return { title: `From ${str(m.from_name) || str(m.from)} (P2P)`, detail: when, note: wallet };
    case 'withdrawal': {
      const s = row.withdrawal_status;
      if (s === 'paid')
        return {
          title: 'Withdrawal',
          detail: `${formatDay(row.created_at, now)}${row.withdrawal_utr ? ` · UTR ${row.withdrawal_utr}` : ''}`,
          chip: { tone: 'ok', text: 'Paid' },
        };
      if (s === 'rejected')
        return {
          title: 'Withdrawal',
          detail: `${when} · money back in wallet`,
          chip: { tone: 'bad', text: 'Rejected' },
        };
      return {
        title: 'Withdrawal request',
        detail: `${when} · team is checking`,
        chip: { tone: 'wait', text: 'Waiting' },
      };
    }
    case 'withdrawal_refund':
      return { title: 'Withdrawal returned', detail: `${when} · money back in wallet`, note: wallet };
    case 'activation_product':
      return { title: 'Product Wallet on activation', detail: when, note: wallet };
    case 'yfi_daily':
      return {
        title: 'Daily videos',
        detail: m.day_no ? `Day ${str(m.day_no)} · ${when}` : when,
        note: wallet,
      };
    case 'shop_order':
      return { title: 'Shop order', detail: when, note: wallet };
    case 'shop_refund':
      return { title: 'Order refund', detail: when, note: wallet };
    default:
      return {
        title: row.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
        detail: when,
        note: wallet,
      };
  }
}
