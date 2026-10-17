import { api } from './client';
import type { Schema } from './schema';

// Home / login banners and the public "Contact us" form (routes/contentApis.py).
export type Banner = Schema<'Banner'>;
export type AdminBanner = Schema<'AdminBanner'>;
export type ContactRow = Schema<'ContactRow'>;

/** Public files (banners) are served by the backend at /uploads/<path>. */
export const uploadUrl = (path: string) => `/uploads/${path.replace(/^\/+/, '')}`;

/** Fields of the banner form. Dates are YYYY-MM-DD or '' (no date). */
export interface BannerFields {
  title: string;
  audience: 'everyone' | 'login';
  starts_on: string;
  ends_on: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
}

function bannerForm(fields: Partial<BannerFields>, image: File | null) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields))
    form.set(k, typeof v === 'boolean' ? String(v) : String(v ?? ''));
  if (image) form.set('image', image);
  return form;
}

export const contentApi = {
  /** Public: only banners that are on and inside their dates today. */
  banners: (audience: 'everyone' | 'login', signal?: AbortSignal) =>
    api<Banner[]>('/banners', { query: { audience }, signal }),
  /** Public. `website` is a spam trap: it must stay empty. */
  contact: (body: { name: string; mobile: string; message: string; website: string }) =>
    api<unknown>('/contact', { json: body }),

  adminBanners: (signal?: AbortSignal) => api<AdminBanner[]>('/admin/banners', { signal }),
  addBanner: (fields: BannerFields, image: File) =>
    api<Schema<'IdOnly'>>('/admin/banners', { form: bannerForm(fields, image), timeoutMs: 60_000 }),
  /** Only the fields sent change; '' clears a date or the link. A new image replaces the old one. */
  editBanner: (id: number, fields: Partial<BannerFields>, image: File | null) =>
    api<unknown>(`/admin/banners/${id}`, {
      method: 'PATCH',
      form: bannerForm(fields, image),
      timeoutMs: 60_000,
    }),

  contactMessages: (status: 'new' | 'replied', page: number, signal?: AbortSignal) =>
    api<Schema<'ContactPage'>>('/admin/contact-messages', { query: { status, page, limit: 20 }, signal }),
  markReplied: (id: number, note: string) =>
    api<unknown>(`/admin/contact-messages/${id}/replied`, { json: { note: note || null } }),
};
