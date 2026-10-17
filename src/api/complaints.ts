import { api } from './client';
import type { Page, Schema } from './schema';

// Complaints and their chat (routes/complaintApis.py). The same routes serve members (only their own) and the
// admin (all except drafts); the server decides by the token.
export type ComplaintRow = Schema<'ComplaintListRow'>;
export type ComplaintDetail = Schema<'ComplaintDetail'>;
export type ChatMessage = Schema<'ChatMessage'>;
export type Category = Schema<'Category'>;
export type ComplaintBody = Schema<'ComplaintModel'>;
export type ComplaintStatus = 'Draft' | 'Submitted' | 'In Process' | 'Resolved' | 'Closed' | 'Rejected';

export const complaintsApi = {
  categories: (signal?: AbortSignal) => api<Category[]>('/complaints/categories', { signal }),
  list: (
    q: { status?: string; search?: string; cursor?: string | null; page?: number },
    signal?: AbortSignal,
  ) => api<Page<ComplaintRow>>('/complaints', { query: { ...q, limit: 20 }, signal }),
  /** Admin: the complaint types members choose from. */
  addCategory: (name: string) =>
    api<Schema<'IdOnly'>>('/admin/complaints/categories', { json: { name, is_active: true } }),
  editCategory: (id: number, name: string, isActive: boolean) =>
    api<unknown>(`/admin/complaints/categories/${id}`, {
      method: 'PUT',
      json: { name, is_active: isActive },
    }),
  matrix: (signal?: AbortSignal) => api<Record<string, number>>('/complaints/matrix', { signal }),
  detail: (id: number, signal?: AbortSignal) => api<ComplaintDetail>(`/complaints/${id}`, { signal }),
  /** A new complaint: a draft (submit false) or sent at once (submit true). */
  create: (body: ComplaintBody) => api<Schema<'ComplaintCreated'>>('/complaints', { json: body }),
  /** Only a draft can be changed; submit true sends it. */
  saveDraft: (id: number, body: ComplaintBody) =>
    api<unknown>(`/complaints/${id}`, { method: 'PUT', json: body }),
  addEvidence: (id: number, file: File) => {
    const form = new FormData();
    form.set('file', file);
    return api<Schema<'PathOnly'>>(`/complaints/${id}/evidence`, { form, timeoutMs: 60_000 });
  },
  setStatus: (id: number, status: ComplaintStatus, remarks?: string) =>
    api<unknown>(`/complaints/${id}/status`, { method: 'PATCH', json: { status, remarks: remarks ?? null } }),
  /** Opening the chat marks the other side's messages as read. */
  messages: (id: number, afterId = 0, signal?: AbortSignal) =>
    api<ChatMessage[]>(`/complaints/${id}/messages`, { query: { after_id: afterId }, signal }),
  send: (id: number, message: string, file: File | null) => {
    const form = new FormData();
    if (message) form.set('message', message);
    if (file) form.set('file', file);
    return api<Schema<'IdOnly'>>(`/complaints/${id}/messages`, { form, timeoutMs: 60_000 });
  },
};
