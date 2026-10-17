import type { ChipTone } from '@/components/ui';
import type { ComplaintStatus } from '@/api/complaints';

// Words for complaint statuses (the API's names → the design's). Pure, unit tested.
export const STATUS_LABEL: Record<ComplaintStatus, string> = {
  Draft: 'Draft',
  Submitted: 'Submitted',
  'In Process': 'In progress',
  Resolved: 'Solved',
  Closed: 'Closed',
  Rejected: 'Rejected',
};

export const STATUS_TONE: Record<ComplaintStatus, ChipTone> = {
  Draft: 'muted',
  Submitted: 'wait',
  'In Process': 'gold',
  Resolved: 'ok',
  Closed: 'muted',
  Rejected: 'bad',
};

export const label = (s: string) => STATUS_LABEL[s as ComplaintStatus] ?? s;
export const tone = (s: string): ChipTone => STATUS_TONE[s as ComplaintStatus] ?? 'muted';

/** Open = the member still waits for something (Submitted / In progress). */
export const isOpen = (s: string) => s === 'Submitted' || s === 'In Process';

/** Chat works while the complaint is sent and not closed (backend: not Draft / Closed / Rejected). */
export const chatOpen = (s: string) => !['Draft', 'Closed', 'Rejected'].includes(s);

/** The 3-step timeline of the design: Submitted → In progress → Solved. */
export function timeline(s: string): { label: string; state: 'done' | 'now' | 'todo' }[] {
  const order = ['Submitted', 'In Process', 'Resolved'];
  const at = s === 'Closed' ? 2 : order.indexOf(s);
  return order.map((x, i) => ({
    label: label(x),
    state: at > i || (s === 'Closed' && i <= 2) ? 'done' : at === i ? 'now' : 'todo',
  }));
}
