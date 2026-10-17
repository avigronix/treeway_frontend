import type { components } from './types.gen';

// Every request body AND response type comes from the backend OpenAPI (`npm run api:types`).
// Example: Schema<'Me'>, Schema<'RegisterModel'>
type Schemas = components['schemas'];
export type Schema<K extends keyof Schemas> = Schemas[K];

/** Shape of every list response (rows, total, page, limit, next_cursor). */
export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
  next_cursor: string | null;
}
