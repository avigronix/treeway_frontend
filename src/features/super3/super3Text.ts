import type { Journey, Super3Status } from '@/api/member';

// What the Super 3 screens say, from the server's numbers only (pure, unit tested).

export type Entry =
  | { kind: 'none'; directs: number }
  | { kind: 'hold'; directs: number; onHold: number }
  | { kind: 'lapsed'; directs: number; shares: number }
  | { kind: 'in' };

/**
 * Am I in Super 3? `in_super3` comes from the REAL shares (s3_shares), not the direct count: a share made while
 * the ID was blocked lapsed to the company (HANDOFF §5), so 2+ directs can still mean "not in yet".
 */
export function entryState(s: Super3Status): Entry {
  if (s.in_super3) return { kind: 'in' };
  if (s.direct_count >= 2) return { kind: 'lapsed', directs: s.direct_count, shares: s.s3_shares };
  if (s.s3_shares === 1 || s.on_hold > 0) return { kind: 'hold', directs: s.direct_count, onHold: s.on_hold };
  return { kind: 'none', directs: s.direct_count };
}

/** The member's own journeys, main first, then recycle IDs in order. */
export function myJourneys(s: Super3Status): Journey[] {
  const mine = s.journeys.filter((j) => j.kind !== 'company');
  return [...mine.filter((j) => j.kind === 'main'), ...mine.filter((j) => j.kind === 'recycle')];
}

export function journeyLabel(j: Journey, all: Journey[]): string {
  if (j.kind === 'main') return 'Main ID';
  const n = all.filter((x) => x.kind === 'recycle').findIndex((x) => x.journey_id === j.journey_id) + 1;
  return `Recycle ID #${n}`;
}

export const ORDINAL = ['1st', '2nd', '3rd'];

/** "~12 days" / "Very soon" / "Waiting for new joins" from eta_days (null = no joins in 7 days). */
export function etaText(j: Journey): string {
  if (j.eta_days === null || j.eta_days === undefined) return 'Waiting for new joins';
  if (j.eta_days <= 0) return 'Very soon';
  return `~${j.eta_days} day${j.eta_days === 1 ? '' : 's'}`;
}
