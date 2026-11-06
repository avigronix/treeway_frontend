import type { CompanyFields, VideoItem } from '@/api/admin';
import { ACCOUNT_RE, IFSC_RE, MOBILE_RE, UPI_RE, WHATSAPP_RE } from '@/lib/validators';

// Pure form checks for the admin screens (unit tested). Same rules and messages as the backend; the server
// checks again and its answer wins.

// ---------------------------------------------------------------- company details (routes/companyApis.py)
export type CompanyForm = Required<CompanyFields>;
export const COMPANY_KEYS: (keyof CompanyForm)[] = [
  'name',
  'account_holder',
  'account_no',
  'ifsc',
  'branch',
  'upi_id',
  'email',
  'phone',
  'whatsapp_group',
  'address',
  'gstin',
];
const EMAIL_RE = /^[^@\s]{1,64}@[^@\s]+\.[A-Za-z]{2,}$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** One line, no extra spaces; IFSC upper case, UPI and email lower case (as the server saves them). */
export function cleanCompany(k: keyof CompanyForm, v: string): string {
  const t = v.split(/\s+/).filter(Boolean).join(' ');
  return k === 'ifsc' || k === 'gstin'
    ? t.toUpperCase()
    : k === 'upi_id' || k === 'email'
      ? t.toLowerCase()
      : t;
}

/** Field -> message. Empty fields are fine (= not set, hidden from members). */
export function checkCompany(f: CompanyForm): Partial<Record<keyof CompanyForm, string>> {
  const e: Partial<Record<keyof CompanyForm, string>> = {};
  if (f.upi_id && !UPI_RE.test(f.upi_id)) e.upi_id = 'UPI ID looks wrong (example: treeway@sbi).';
  if (f.account_no && !ACCOUNT_RE.test(f.account_no)) e.account_no = 'Account number must be 9 to 18 digits.';
  if (f.ifsc && !IFSC_RE.test(f.ifsc)) e.ifsc = 'Enter a valid IFSC code (example: SBIN0001234).';
  if (!!f.account_no !== !!f.ifsc) {
    if (!f.ifsc) e.ifsc = 'Fill the IFSC too (or leave both empty).';
    else e.account_no = 'Fill the account number too (or leave both empty).';
  }
  if (f.account_no && !f.account_holder) e.account_holder = 'Enter the account holder name.';
  if (f.email && !EMAIL_RE.test(f.email)) e.email = 'Enter a valid email.';
  if (f.phone && !MOBILE_RE.test(f.phone)) e.phone = 'Phone must be a 10-digit mobile number.';
  if (f.whatsapp_group && !WHATSAPP_RE.test(f.whatsapp_group))
    e.whatsapp_group = 'Use the WhatsApp group link (https://chat.whatsapp.com/...).';
  if (f.gstin && !GSTIN_RE.test(f.gstin)) e.gstin = 'GSTIN has 15 letters and digits (like 09ABCDE1234F1Z5).';
  return e;
}

// ---------------------------------------------------------------- daily videos (routes/videoApis.py)
export type Platform = VideoItem['platform'];
export type VideoRow = { platform: Platform | ''; url: string; title: string };
export type VideoRowErr = Partial<Record<keyof VideoRow, string>>;
export const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
];
// Same hosts as PLATFORM_HOSTS in routes/videoApis.py.
const HOSTS: Record<Platform, string[]> = {
  youtube: ['youtube.com', 'youtu.be'],
  facebook: ['facebook.com', 'fb.watch'],
  instagram: ['instagram.com'],
};

export function linkProblem(platform: Platform, url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (u.protocol === 'https:' && HOSTS[platform].some((h) => host === h || host.endsWith(`.${h}`)))
      return null;
  } catch {
    /* not a link */
  }
  const name = PLATFORMS.find((p) => p.value === platform)?.label ?? platform;
  return `Use an https ${name} link for this video.`;
}

/** Every row is one video of the day, in order (Vinay 31 Oct: 1 to 4 a day). A half-filled or empty row is an
 *  error (fill it or remove it); a bad link is an error. Pure, unit tested. */
export function checkVideoRows(rows: VideoRow[]): { items: VideoItem[]; errs: VideoRowErr[] } {
  const items: VideoItem[] = [];
  const errs = rows.map((r): VideoRowErr => {
    const e: VideoRowErr = {};
    if (!r.platform && !r.url.trim() && !r.title.trim()) {
      e.url = 'Fill in this video or remove it.';
      return e;
    }
    if (!r.platform) e.platform = 'Choose the platform.';
    const bad = r.platform && r.url.trim() ? linkProblem(r.platform, r.url.trim()) : null;
    if (!r.url.trim()) e.url = 'Paste the video link.';
    else if (bad) e.url = bad; // only set real problems: an `undefined` key would count as an error
    if (r.title.trim().length < 2) e.title = 'Write a short title.';
    else if (r.title.trim().length > 120) e.title = 'Keep the title under 120 letters.';
    if (!e.platform && !e.url && !e.title)
      items.push({ platform: r.platform as Platform, url: r.url.trim(), title: r.title.trim() });
    return e;
  });
  return { items, errs };
}
