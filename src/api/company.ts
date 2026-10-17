import { api } from './client';
import type { Schema } from './schema';

export type CompanyDetail = Schema<'CompanyDetail'>;
export type PublicConfig = Schema<'PublicConfig'>;

export const companyApi = {
  detail: (signal?: AbortSignal) => api<CompanyDetail>('/company/detail', { signal }),
  config: (signal?: AbortSignal) => api<PublicConfig>('/config/public', { signal }),
};

/** The company QR is a public file: /uploads/company/<name>. Empty until the admin uploads one. */
export function companyQrUrl(qrPath: string | null | undefined): string | null {
  return qrPath ? `/uploads/${qrPath.replace(/^\/+/, '')}` : null;
}
