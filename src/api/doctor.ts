import { api } from './client';
import type { Schema } from './schema';

// Doctor APIs. Member side: ask, my requests, "Order this medicine". Doctor side (role DOCTOR): inbox, one
// request, write a prescription. A doctor token gets 403 on every other route (backend rule).
export type DoctorInboxPage = Schema<'DoctorInboxPage'>;
export type DoctorInboxRow = Schema<'DoctorInboxRow'>;
export type DoctorRequestView = Schema<'DoctorRequestView-Output'>;
export type MemberDoctorPage = Schema<'MemberDoctorPage-Output'>;
export type MemberDoctorRequest = Schema<'MemberDoctorRequest-Output'>;
export type Prescription = Schema<'Prescription'>;
export type PrescriptionCart = Schema<'PrescriptionCart'>;
export type PrescriptionBody = Schema<'PrescriptionModel'>;

export const doctorApi = {
  inbox: (status: 'waiting' | 'answered', signal?: AbortSignal) =>
    api<DoctorInboxPage>('/doctor/inbox', { query: { status, limit: 30 }, signal }),
  request: (id: number, signal?: AbortSignal) => api<DoctorRequestView>(`/doctor/inbox/${id}`, { signal }),
  /** Never edited: a second one is a new prescription. */
  prescribe: (id: number, body: PrescriptionBody) =>
    api<Schema<'IdOnly'>>(`/doctor/inbox/${id}/prescriptions`, { json: body }),
  /** Shop products a doctor can choose (the same list members see). */
  products: (search: string, signal?: AbortSignal) =>
    api<Schema<'Page_Product_'>>('/shop/products', {
      query: { search: search || undefined, limit: 20 },
      signal,
    }),

  myRequests: (cursor: string | null, signal?: AbortSignal) =>
    api<MemberDoctorPage>('/doctor/requests', { query: { cursor, limit: 20 }, signal }),
  /** Max 3 waiting per member (409 above). Files: photos / reports, up to 5. */
  /** age: years, 1 to 120 (no date of birth since 16 Oct); the doctor sees it. */
  ask: (problem: string, age: number, files: File[]) => {
    const form = new FormData();
    form.set('problem', problem);
    form.set('age', String(age));
    for (const f of files) form.append('files', f);
    return api<Schema<'DoctorRequestCreated'>>('/doctor/requests', { form, timeoutMs: 90_000 });
  },
  cart: (prescriptionId: number, signal?: AbortSignal) =>
    api<PrescriptionCart>(`/doctor/prescriptions/${prescriptionId}/cart`, { signal }),
};

export const doctorKeys = {
  mine: ['doctor', 'mine'] as const,
  inbox: (status: string) => ['doctor', 'inbox', status] as const,
  request: (id: number) => ['doctor', 'request', id] as const,
};
