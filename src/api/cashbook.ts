import { api } from './client';
import type { Page, Schema } from './schema';

// Cash Book (routes/cashbookApis.py): a member's or admin's own notebook of cash in / out. Not Treeway money.
// The server decides who owns or only views a book (by mobile) and sums every total.
export type CbHome = Schema<'CashBookHome'>;
export type CbBusiness = Schema<'CashBookBusiness'>;
export type CbSharedBook = Schema<'CashBookSharedBook'>;
export type CbBook = Schema<'CashBookBook'>;
export type CbBusinessBooks = Schema<'CashBookBusinessBooks'>;
export type CbBookDetail = Schema<'CashBookBookDetail'>;
export type CbMember = Schema<'CashBookMember'>;
export type CbEntry = Schema<'CashBookEntry'>;
export type CbEntryBody = Schema<'CashBookEntryModel'>;

const B = '/cashbook';

export const cashbookApi = {
  home: (signal?: AbortSignal) => api<CbHome>(`${B}/businesses`, { signal }),
  addBusiness: (name: string) => api<Schema<'IdOnly'>>(`${B}/businesses`, { json: { name } }),
  renameBusiness: (id: number, name: string) =>
    api<unknown>(`${B}/businesses/${id}`, { method: 'PUT', json: { name } }),
  deleteBusiness: (id: number) => api<unknown>(`${B}/businesses/${id}`, { method: 'DELETE' }),

  books: (businessId: number, signal?: AbortSignal) =>
    api<CbBusinessBooks>(`${B}/businesses/${businessId}/books`, { signal }),
  addBook: (businessId: number, name: string) =>
    api<CbBook>(`${B}/businesses/${businessId}/books`, { json: { name } }),
  renameBook: (id: number, name: string) =>
    api<unknown>(`${B}/books/${id}`, { method: 'PUT', json: { name } }),
  deleteBook: (id: number) => api<unknown>(`${B}/books/${id}`, { method: 'DELETE' }),
  book: (id: number, signal?: AbortSignal) => api<CbBookDetail>(`${B}/books/${id}`, { signal }),

  entries: (bookId: number, q: { search: string; page: number }, signal?: AbortSignal) =>
    api<Page<CbEntry>>(`${B}/books/${bookId}/entries`, { query: { ...q, limit: 50 }, signal }),
  addEntry: (bookId: number, body: CbEntryBody) =>
    api<Schema<'IdOnly'>>(`${B}/books/${bookId}/entries`, { json: body }),
  editEntry: (id: number, body: CbEntryBody) =>
    api<unknown>(`${B}/entries/${id}`, { method: 'PUT', json: body }),
  deleteEntry: (id: number) => api<unknown>(`${B}/entries/${id}`, { method: 'DELETE' }),

  addMember: (bookId: number, mobile: string) =>
    api<unknown>(`${B}/books/${bookId}/members`, { json: { mobile } }),
  removeMember: (bookId: number, mobile: string) =>
    api<unknown>(`${B}/books/${bookId}/members/${encodeURIComponent(mobile)}`, { method: 'DELETE' }),
};
