// A sign-up waiting for its email OTP (16 Oct, Q3). Kept on the phone so closing the page and coming back
// lands on the OTP step again. Never the password: the ID is made from what the server keeps for the ticket,
// and the verify answer logs the member in.

export type SignupFields = {
  sponsor_code: string;
  full_name: string;
  mobile: string;
  email: string;
  state: string;
  district: string;
};

export type PendingSignup = {
  ticket: string;
  maskedEmail: string;
  sentAt: number; // ms, for the 60 s "Resend" wait after a reload
  expiresAt: number; // ms, the server forgets the ticket then
  fields: SignupFields;
};

const KEY = 'tw_signup';

export function loadPending(now = Date.now()): PendingSignup | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingSignup;
    if (!p?.ticket || typeof p.expiresAt !== 'number' || p.expiresAt <= now) {
      localStorage.removeItem(KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function savePending(p: PendingSignup) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // private mode / full storage: the OTP step still works until the page is closed
  }
}

export function clearPending() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing kept
  }
}
