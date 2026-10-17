// Level income rates come from GET /config/public (level_income), keyed "1", "2", "3", "4-10", "11-15", "16-25".

/** Rate for one level from the config keys "1", "2", "3", "4-10", "11-15", "16-25". */
export function levelRate(table: Record<string, number> | undefined, level: number): number | undefined {
  if (!table) return undefined;
  for (const [k, v] of Object.entries(table)) {
    const [a, b] = k.split('-').map(Number);
    if (a !== undefined && level >= a && level <= (b ?? a)) return v;
  }
  return undefined;
}
