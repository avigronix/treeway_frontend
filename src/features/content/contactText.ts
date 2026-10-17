import { MOBILE_RE } from '@/lib/validators';

/** Contact us form checks (the server checks again). Pure, unit tested. */
export function checkContact(name: string, mobile: string, message: string) {
  return {
    name: name.trim().length >= 2 ? undefined : 'Enter your name.',
    mobile: MOBILE_RE.test(mobile.trim()) ? undefined : 'Enter a valid 10 digit mobile number.',
    message:
      message.trim().length < 5
        ? 'Write your message (5 letters or more).'
        : message.trim().length > 1000
          ? 'Keep it under 1000 letters.'
          : (message.match(/https?:\/\/|www\./gi) ?? []).length > 2
            ? 'Please write your message without links.'
            : undefined,
  };
}
