import { useEffect, useSyncExternalStore } from 'react';
import { useMe } from '@/auth/session';

// The shop cart: product id -> qty (and a copy of name / MRP / picture for the screen). It lives in this
// phone only (localStorage), per member. Prices shown from here are for the screen; the server prices the
// order again and is the only judge.

export interface CartLine {
  id: number;
  name: string;
  mrp: number;
  image: string | null;
  qty: number;
}

export const MAX_QTY = 50; // backend OrderItemModel le=50
export const MAX_LINES = 20; // backend: 1 to 20 products

let owner = 'guest';
let lines: CartLine[] = [];
/** Set when the cart came from "Order this medicine": the order is linked to that prescription. */
let rx: number | null = null;
const listeners = new Set<() => void>();
const key = () => `tw_cart:${owner}`;
const rxKey = () => `tw_cart_rx:${owner}`;

function load() {
  try {
    const raw = localStorage.getItem(key());
    const v = raw ? (JSON.parse(raw) as CartLine[]) : [];
    lines = Array.isArray(v) ? v.filter((l) => Number.isInteger(l.id) && l.qty >= 1) : [];
    const r = Number(localStorage.getItem(rxKey()));
    rx = Number.isInteger(r) && r > 0 ? r : null;
  } catch {
    lines = [];
    rx = null;
  }
}

function save(next: CartLine[], nextRx: number | null = next.length ? rx : null) {
  lines = next;
  rx = nextRx;
  try {
    localStorage.setItem(key(), JSON.stringify(next));
    if (rx) localStorage.setItem(rxKey(), String(rx));
    else localStorage.removeItem(rxKey());
  } catch {
    /* private mode: the cart still works until reload */
  }
  listeners.forEach((l) => l());
}

/** Call with the member's code once logged in: each member has their own cart on a shared phone. */
export function setCartOwner(code: string) {
  if (code === owner) return;
  owner = code;
  load();
  listeners.forEach((l) => l());
}

export const cart = {
  get: () => lines,
  /** From the shop. Adding something new makes it a normal order (not only the prescription). */
  add(p: Omit<CartLine, 'qty'>) {
    const has = lines.find((l) => l.id === p.id);
    if (has) return cart.setQty(p.id, has.qty + 1);
    if (lines.length >= MAX_LINES) return;
    save([...lines, { ...p, qty: 1 }], null);
  },
  /** "Order this medicine": the cart becomes the prescription's shop medicines. */
  fromPrescription(id: number, items: CartLine[]) {
    save(items.slice(0, MAX_LINES), items.length ? id : null);
  },
  prescription: () => rx,
  setQty(id: number, qty: number) {
    const q = Math.max(0, Math.min(MAX_QTY, Math.floor(qty)));
    save(q === 0 ? lines.filter((l) => l.id !== id) : lines.map((l) => (l.id === id ? { ...l, qty: q } : l)));
  },
  remove: (id: number) => save(lines.filter((l) => l.id !== id)),
  clear: () => save([]),
};

/** Sum of MRP × qty, for the screen only. Pure, unit tested. */
export const cartTotal = (ls: CartLine[]) =>
  ls.reduce((a, l) => a + Math.round(l.mrp * 100) * l.qty, 0) / 100;
export const cartCount = (ls: CartLine[]) => ls.reduce((a, l) => a + l.qty, 0);

/** The prescription this cart is for (null = a normal order). */
export function useCartPrescription(): number | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => rx,
    () => rx,
  );
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => lines,
    () => lines,
  );
}

/** The member's own cart (each member on a shared phone has their own). */
export function useMemberCart(): CartLine[] {
  const code = useMe().data?.user_code;
  useEffect(() => {
    if (code) setCartOwner(code);
  }, [code]);
  return useCart();
}
