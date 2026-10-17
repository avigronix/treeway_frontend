import { api } from './client';
import type { Page, Schema } from './schema';

// Shop, courier and orders (routes/shopApis.py). The server works out the courier charge and the wallet
// split; the app only shows what the server says.
export type Product = Schema<'Product'>;
export type CourierQuote = Schema<'CourierQuote'>;
export type Order = Schema<'Order'>;
export type OrderPlaced = Schema<'OrderPlaced'>;

export interface OrderForm {
  items: { product_id: number; qty: number }[];
  name: string;
  mobile: string;
  address: string;
  pincode: string;
  courier_utr: string;
  receipt: File;
  prescription_id?: number;
}

export const shopApi = {
  products: (q: { search?: string; category?: string; page?: number }, signal?: AbortSignal) =>
    api<Page<Product>>('/shop/products', { query: { ...q, limit: 50 }, signal }),
  categories: (signal?: AbortSignal) => api<string[]>('/shop/categories', { signal }),
  courier: (pincode: string, signal?: AbortSignal) =>
    api<CourierQuote>('/shop/courier', { query: { pincode }, signal }),
  /** One order. A used UTR is refused (409), so a repeat can never make a second order. */
  placeOrder: (f: OrderForm) => {
    const form = new FormData();
    form.set('items', JSON.stringify(f.items));
    for (const k of ['name', 'mobile', 'address', 'pincode', 'courier_utr'] as const) form.set(k, f[k]);
    if (f.prescription_id) form.set('prescription_id', String(f.prescription_id));
    form.set('receipt', f.receipt);
    return api<OrderPlaced>('/shop/orders', { form, timeoutMs: 60_000 });
  },
  orders: (cursor: string | null, signal?: AbortSignal) =>
    api<Page<Order>>('/shop/orders', { query: { cursor, limit: 20 }, signal }),
  /** Only while "placed". Product money goes back to the same wallets. */
  cancel: (id: number, reason: string) =>
    api<unknown>(`/shop/orders/${id}/cancel`, { json: { reason: reason || null } }),
  /** After the delivery payment was rejected: a new UTR + screenshot. */
  resendUtr: (id: number, utr: string, receipt: File) => {
    const form = new FormData();
    form.set('courier_utr', utr);
    form.set('receipt', receipt);
    return api<unknown>(`/shop/orders/${id}/courier-utr`, { form, timeoutMs: 60_000 });
  },
};

export const shopKeys = {
  products: (q: Record<string, unknown>) => ['shop', 'products', q] as const,
  categories: ['shop', 'categories'] as const,
  orders: ['shop', 'orders'] as const,
};

// ---- admin: products, orders, courier rates
export type AdminProduct = Schema<'AdminProduct'>;
export type AdminOrder = Schema<'AdminOrder'>;
export type CourierRates = Schema<'CourierRates'>;

export interface ProductFields {
  name: string;
  description: string;
  category: string;
  mrp: string;
  is_active: boolean;
}

function productForm(
  fields: Partial<ProductFields> & { stock?: number; stock_add?: number; keep_images?: string[] },
  images: File[],
) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    form.set(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
  }
  for (const f of images) form.append('images', f);
  return form;
}

export const shopAdminApi = {
  products: (signal?: AbortSignal) =>
    api<Page<AdminProduct>>('/admin/products', { query: { limit: 100 }, signal }),
  addProduct: (fields: ProductFields & { stock: number }, images: File[]) =>
    api<Schema<'IdOnly'>>('/admin/products', { form: productForm(fields, images), timeoutMs: 90_000 }),
  /** Only the fields sent change. stock_add is + or − (never below 0); keep_images keeps these, in order. */
  editProduct: (
    id: number,
    fields: Partial<ProductFields> & { stock_add?: number; keep_images?: string[] },
    images: File[],
  ) =>
    api<unknown>(`/admin/products/${id}`, {
      method: 'PATCH',
      form: productForm(fields, images),
      timeoutMs: 90_000,
    }),
  orders: (
    q: { status?: string; courier_status?: string; refund_due?: boolean; search?: string; page?: number },
    signal?: AbortSignal,
  ) => api<Schema<'AdminOrdersPage-Output'>>('/admin/orders', { query: { ...q, limit: 20 }, signal }),
  courierReview: (id: number, action: 'approve' | 'reject', remark: string) =>
    api<unknown>(`/admin/orders/${id}/courier-review`, { json: { action, remark: remark || null } }),
  setStatus: (
    id: number,
    body: {
      status: 'packed' | 'shipped' | 'delivered' | 'cancelled';
      remark?: string;
      courier_name?: string;
      tracking_no?: string;
    },
  ) => api<unknown>(`/admin/orders/${id}/status`, { json: body }),
  courierRefunded: (id: number, utr: string) =>
    api<unknown>(`/admin/orders/${id}/courier-refunded`, { json: { courier_utr: utr } }),
  rates: (signal?: AbortSignal) => api<CourierRates>('/admin/courier/rates', { signal }),
  /** ₹, or null = use the state rate. */
  setRate: (pincode: string, rate: number | null) =>
    api<unknown>(`/admin/courier/rates/${pincode}`, { method: 'PUT', json: { rate } }),
};
