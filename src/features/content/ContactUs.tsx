import { useState } from 'react';
import { Link } from 'react-router';
import { contentApi } from '@/api/content';
import { Button, ErrorBox, Note, TextAreaField, TextField } from '@/components/ui';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { AuthPage } from '@/features/auth/AuthShell';
import { checkContact } from './contactText';

// Public "Contact us": a name, a mobile and a message; the team calls back. Members use Help instead.
export default function ContactUs() {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // spam trap: people never see it
  const [errs, setErrs] = useState<Partial<ReturnType<typeof checkContact>>>({});
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);

  const [send, sending] = useSingleFlight(async () => {
    const e = checkContact(name, mobile, message);
    setErrs(e);
    if (e.name || e.mobile || e.message) return;
    setError(null);
    try {
      await contentApi.contact({
        name: name.trim(),
        mobile: mobile.trim(),
        message: message.trim(),
        website,
      });
      setDone('Thank you. We will call you soon.');
    } catch (err) {
      setError(err);
    }
  });

  return (
    <AuthPage>
      <form
        noValidate
        className="flex flex-1 flex-col gap-3.5 px-[22px] py-6"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[22px] font-bold">Contact us</h1>
          <span className="text-[13px] text-mut">Leave your number. Our team calls you back.</span>
        </div>
        {done ? (
          <>
            <Note role="status" tone="info">
              {done}
            </Note>
            <Link to="/login" className="font-bold">
              Back to log in
            </Link>
          </>
        ) : (
          <>
            <TextField
              label="Your name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errs.name}
            />
            <TextField
              label="Mobile number"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              error={errs.mobile}
            />
            <TextAreaField
              label="Your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              error={errs.message}
            />
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>
            {error ? <ErrorBox error={error} /> : null}
            <Button type="submit" busy={sending}>
              Send
            </Button>
            <span className="text-xs text-mut">
              Already a member? Log in and use <b>Help</b> to write to the team.
            </span>
            <Link to="/login" className="text-[13px] font-bold">
              Back to log in
            </Link>
          </>
        )}
      </form>
    </AuthPage>
  );
}
