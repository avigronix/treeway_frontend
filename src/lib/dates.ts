// All dates are shown in IST (India has no daylight saving, so a day is always 24 hours).
const TZ = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;

const keyFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: TZ,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
// Own month names: browsers differ ("Sep" vs "Sept"), the design uses "Sep".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function istParts(d: Date): { y: string; m: string; day: string } {
  const [y = '', m = '', day = ''] = keyFmt.format(d).split('-');
  return { y, m: MONTHS[Number(m) - 1] ?? '', day: String(Number(day)) };
}

/** IST calendar day as YYYY-MM-DD. */
export function istDayKey(value: string | number | Date = new Date()): string {
  return keyFmt.format(toDate(value));
}

/** IST calendar day `days` after today, as YYYY-MM-DD (1 = tomorrow). */
export function istDayKeyAfter(days: number, now: Date = new Date()): string {
  return keyFmt.format(new Date(now.getTime() + days * DAY_MS));
}

/** "12:05 PM" */
export function formatTime(value: string | number | Date): string {
  return timeFmt.format(toDate(value)).replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toUpperCase()}`);
}

/** "28 Sep" (this year) or "28 Sep 2025" (another year). */
export function formatDay(value: string | number | Date, now: Date = new Date()): string {
  const p = istParts(toDate(value));
  return p.y === istParts(now).y ? `${p.day} ${p.m}` : `${p.day} ${p.m} ${p.y}`;
}

/** "4 Sep 2026" */
export function formatFullDate(value: string | number | Date): string {
  const p = istParts(toDate(value));
  return `${p.day} ${p.m} ${p.y}`;
}

/** List timestamps: "Today 12:05 PM", "Yesterday 6:40 PM", "28 Sep". */
export function formatWhen(value: string | number | Date, now: Date = new Date()): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '–';
  const key = istDayKey(d);
  if (key === istDayKey(now)) return `Today ${formatTime(d)}`;
  if (key === istDayKey(now.getTime() - DAY_MS)) return `Yesterday ${formatTime(d)}`;
  return formatDay(d, now);
}

/** Estimate date shown next to an ETA: today (IST) + days. Example: "25 Oct". */
export function etaDate(days: number, now: Date = new Date()): string {
  return formatDay(now.getTime() + Math.max(0, Math.ceil(days)) * DAY_MS, now);
}

/** 1 -> "1st", 3 -> "3rd", 11 -> "11th", 22 -> "22nd" (pay day of the month). */
export function ordinal(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}
