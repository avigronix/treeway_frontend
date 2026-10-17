import { MOBILE_RE, UTR_RE } from '@/lib/validators';

// Pure helpers of the shop screens (unit tested). The server checks everything again.

export interface CheckoutFields {
  name: string;
  mobile: string;
  address: string;
  pincode: string;
  utr: string;
}

export function checkCheckout(f: CheckoutFields, checked: boolean, hasFile: boolean) {
  return {
    name: f.name.trim().length >= 2 ? undefined : 'Enter the name.',
    mobile: MOBILE_RE.test(f.mobile.trim()) ? undefined : 'Enter a valid 10 digit mobile number.',
    address:
      f.address.trim().length >= 10
        ? undefined
        : 'Write the full address (house, village / street, district).',
    pincode: /^[1-9]\d{5}$/.test(f.pincode.trim()) ? undefined : 'Enter a valid 6 digit PIN code.',
    quote: checked ? undefined : 'Press "Check" next to the PIN code to see the delivery charge.',
    utr: !checked
      ? undefined
      : UTR_RE.test(f.utr.trim())
        ? undefined
        : 'Enter the UTR of the delivery payment.',
    file: !checked || hasFile ? undefined : 'Add the payment screenshot.',
  };
}

type Status = 'placed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';

export const ORDER_LABEL: Record<Status, string> = {
  placed: 'Placed',
  packed: 'Packed',
  shipped: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** The 4-step timeline: placed → packed → shipped → delivered. */
export function orderSteps(o: {
  status: Status;
  created_at: string;
  packed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}): { key: string; label: string; at: string | null; done: boolean }[] {
  return [
    { key: 'placed', label: 'Order placed', at: o.created_at, done: true },
    { key: 'packed', label: 'Packed', at: o.packed_at, done: !!o.packed_at },
    { key: 'shipped', label: 'Shipped', at: o.shipped_at, done: !!o.shipped_at },
    { key: 'delivered', label: 'Delivered', at: o.delivered_at, done: !!o.delivered_at },
  ];
}
