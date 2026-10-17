// Pure helpers for the money forms (unit tested). The server decides every limit, fee and balance; these only
// give the member a fast, clear hint. Rupee text is handled as text (no float maths).

/** "1,000.50" / "1000.5" -> 1000.5; null if not ₹ with at most 2 decimals (or 0). */
export function parseAmount(text: string): number | null {
  const t = text.replace(/[,\s₹]/g, '');
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}

/** Server rupees -> what goes in the amount box: 4860.5 -> "4860.50", 2000 -> "2000". */
export function amountText(rupees: number): string {
  const s = rupees.toFixed(2);
  return s.endsWith('.00') ? s.slice(0, -3) : s;
}

/** The amount in paise, exactly (for comparing with limits): "200.10" -> 20010. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Fee preview: like the server's percent_of (rounds DOWN to the paisa). A hint only; the server's answer wins. */
export function feePreview(amount: number, feePercent: number): { fee: number; gets: number } {
  const paise = toPaise(amount);
  const fee = Math.floor((paise * feePercent) / 100);
  return { fee: fee / 100, gets: (paise - fee) / 100 };
}

export type AmountCheck = { ok: true; amount: number } | { ok: false; error: string };

/** min / max / balance hints, all in exact paise. */
export function checkAmount(
  text: string,
  { min, max, balance }: { min?: number; max?: number; balance?: number },
): AmountCheck {
  const a = parseAmount(text);
  if (a === null) return { ok: false, error: 'Enter the amount in ₹ (at most 2 decimals).' };
  const fmt = (n: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;
  if (min !== undefined && toPaise(a) < toPaise(min)) return { ok: false, error: `Minimum is ${fmt(min)}.` };
  if (max !== undefined && toPaise(a) > toPaise(max)) return { ok: false, error: `Maximum is ${fmt(max)}.` };
  if (balance !== undefined && toPaise(a) > toPaise(balance))
    return { ok: false, error: `You have only ${fmt(balance)} in your Income Wallet.` };
  return { ok: true, amount: a };
}

/** Hours left of the 24 h withdrawal pause after a bank change (a hint; the server decides). */
export function bankHoldHoursLeft(bankUpdatedAt: string | null | undefined, now = Date.now()): number {
  if (!bankUpdatedAt) return 0;
  const left = new Date(bankUpdatedAt).getTime() + 24 * 3600_000 - now;
  return left > 0 ? Math.ceil(left / 3600_000) : 0;
}
