// Pure helpers of the doctor screens (unit tested). The server checks everything again.

export interface MedLine {
  product_id: number | null;
  name: string;
  dosage: string;
  days: string;
}

/** Same rules as the backend PrescriptionModel / MedicineModel. */
export function checkPrescription(lines: MedLine[], advice: string) {
  const per = lines.map((m) => ({
    name: m.product_id || m.name.trim().length >= 2 ? undefined : 'Choose a shop medicine or write its name.',
    dosage: m.dosage.trim().length >= 2 ? undefined : 'Write how to take it.',
    days:
      /^\d+$/.test(m.days) && Number(m.days) >= 1 && Number(m.days) <= 365 ? undefined : 'Days: 1 to 365.',
  }));
  const form =
    !lines.length && !advice.trim()
      ? 'Write a medicine or some advice.'
      : advice.trim().length > 2000
        ? 'Advice is too long (2000 letters at most).'
        : lines.length > 20
          ? 'At most 20 medicines.'
          : undefined;
  const ok = !form && per.every((e) => !e.name && !e.dosage && !e.days);
  return { ok, form, lines: per };
}

/** "Ask a doctor": the doctor needs the age in years (the same check as the server; no DOB since 16 Oct). */
export function ageError(raw: string): string | null {
  const t = raw.trim();
  return /^\d{1,3}$/.test(t) && Number(t) >= 1 && Number(t) <= 120
    ? null
    : 'Enter the age in years (1 to 120).';
}
