import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from '@/lib/cx';

// From theme.css: .field, .field label, .in, .in.ok, .in.err, .in.big-in, .help, .help.ok, .help.err
const inputClass = (state: 'normal' | 'ok' | 'err' = 'normal', big = false) =>
  cx(
    'w-full min-w-0 rounded-[10px] bg-white px-3 text-base text-ink placeholder:text-mut/70',
    'disabled:bg-line2 disabled:text-mut',
    big ? 'h-14 text-2xl font-bold' : 'h-12',
    state === 'err'
      ? 'border-[1.5px] border-red'
      : state === 'ok'
        ? 'border-[1.5px] border-leaf'
        : 'border border-field',
  );

interface FieldShellProps {
  id: string;
  label: ReactNode;
  help?: ReactNode;
  /** Error text (from zod or the server). Shown in red and read out by screen readers. */
  error?: string | null;
  /** Success text, for example "Ramesh Kumar · ID is active". */
  ok?: ReactNode;
  className?: string;
  children: ReactNode;
}

function FieldShell({ id, label, help, error, ok, className, children }: FieldShellProps) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-[5px]', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-lab">
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-msg`} className="text-[12.5px] font-semibold text-b" role="alert">
          {error}
        </span>
      ) : ok ? (
        <span id={`${id}-msg`} className="text-[12.5px] font-semibold text-ok" aria-live="polite">
          {ok}
        </span>
      ) : help ? (
        <span id={`${id}-msg`} className="text-[12.5px] text-mut">
          {help}
        </span>
      ) : null}
    </div>
  );
}

type Common = {
  label: ReactNode;
  help?: ReactNode;
  error?: string | null;
  ok?: ReactNode;
  fieldClassName?: string;
};

function a11y(id: string, p: Common) {
  return {
    id,
    'aria-invalid': p.error ? true : undefined,
    'aria-describedby': p.error || p.ok || p.help ? `${id}-msg` : undefined,
  };
}
const stateOf = (p: Common) => (p.error ? 'err' : p.ok ? 'ok' : 'normal');

export function TextField({
  label,
  help,
  error,
  ok,
  fieldClassName,
  big,
  className,
  ref,
  id: givenId,
  ...input
}: Common & InputHTMLAttributes<HTMLInputElement> & { big?: boolean; ref?: Ref<HTMLInputElement> }) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const p = { label, help, error, ok };
  return (
    <FieldShell id={id} {...p} className={fieldClassName}>
      <input ref={ref} {...input} {...a11y(id, p)} className={cx(inputClass(stateOf(p), big), className)} />
    </FieldShell>
  );
}

export function PasswordField({
  label,
  help,
  error,
  ok,
  fieldClassName,
  className,
  ref,
  id: givenId,
  ...input
}: Common & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { ref?: Ref<HTMLInputElement> }) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const [show, setShow] = useState(false);
  const p = { label, help, error, ok };
  return (
    <FieldShell id={id} {...p} className={fieldClassName}>
      <div className="relative">
        <input
          ref={ref}
          {...input}
          type={show ? 'text' : 'password'}
          {...a11y(id, p)}
          className={cx(inputClass(stateOf(p)), 'pr-16', className)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute top-0.5 right-1 h-11 cursor-pointer rounded-lg border-0 bg-transparent px-2.5 text-sm font-bold text-g"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  help,
  error,
  ok,
  fieldClassName,
  className,
  ref,
  id: givenId,
  ...input
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const p = { label, help, error, ok };
  return (
    <FieldShell id={id} {...p} className={fieldClassName}>
      <textarea
        ref={ref}
        {...input}
        {...a11y(id, p)}
        className={cx(inputClass(stateOf(p)), 'h-[92px] resize-none py-2.5 leading-[1.4]', className)}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  help,
  error,
  ok,
  fieldClassName,
  className,
  ref,
  id: givenId,
  options,
  placeholder,
  ...select
}: Common &
  SelectHTMLAttributes<HTMLSelectElement> & {
    ref?: Ref<HTMLSelectElement>;
    options: ReadonlyArray<{ value: string; label: string }>;
    placeholder?: string;
  }) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const p = { label, help, error, ok };
  return (
    <FieldShell id={id} {...p} className={fieldClassName}>
      <div className="relative">
        <select
          ref={ref}
          {...select}
          {...a11y(id, p)}
          className={cx(inputClass(stateOf(p)), 'appearance-none pr-9', className)}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-mut"
        >
          ▾
        </span>
      </div>
    </FieldShell>
  );
}
