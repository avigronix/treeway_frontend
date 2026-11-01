// What the Rank screen says about directs (Vinay 26 Oct: "5 directs but no rank"). Distributor needs 5 ACTIVE
// directs (SRS 4.4); since 1 Nov a direct counts the moment it is activated. Pure, unit tested.

/** What a member is called where a rank is shown: the rank, or "User" until the first rank (Distributor: 5
 *  active directs). Vinay 29 Oct: a new member shows "User", not "Member" or "No rank yet". */
export function rankLabel(rankName: string | null | undefined): string {
  return rankName ?? 'User';
}

export interface DirectsNow {
  joined: number;
  active_now: number;
  counted: number;
}

export function directsLines(d: DirectsNow): string[] {
  const lines = [`${d.joined} direct${d.joined === 1 ? '' : 's'} joined · ${d.active_now} active`];
  const waiting = d.joined - d.active_now;
  if (waiting > 0)
    lines.push(
      `${waiting} ${waiting === 1 ? 'is' : 'are'} not active yet: a direct counts once their activation is approved.`,
    );
  return lines;
}

/** The night count is late (it runs every night at 12:20 AM): more than 26 hours, or never. */
export function rankCountLate(at: string | null | undefined, now: number = Date.now()): boolean {
  return !at || now - new Date(at).getTime() > 26 * 3600_000;
}
