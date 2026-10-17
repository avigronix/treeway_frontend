// Money DISPLAY only. Never use these numbers to decide anything: the server is the only source of truth.
// The API sends rupees as numbers with up to 2 decimals (for example 22.5 or 4860).

const whole = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const paise = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MINUS = '−'; // the design uses a real minus sign: −₹500

export type MoneySign = 'auto' | 'always' | 'never';

/** ₹2,71,140 · ₹22.50 · −₹1,48,200. `sign: 'always'` adds + for positive (income rows). */
export function formatMoney(value: number | null | undefined, sign: MoneySign = 'auto'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '₹–';
  const cents = Math.round(Math.abs(value) * 100);
  const text = cents % 100 === 0 ? whole.format(cents / 100) : paise.format(cents / 100);
  if (cents === 0) return `₹${text}`;
  if (value < 0 && sign !== 'never') return `${MINUS}₹${text}`;
  if (value > 0 && sign === 'always') return `+₹${text}`;
  return `₹${text}`;
}

/** Plain Indian grouping without ₹, for counts: 1,00,000 */
export function formatCount(value: number): string {
  return whole.format(value);
}
