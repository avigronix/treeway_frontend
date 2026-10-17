import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cx } from '@/lib/cx';
import { useSingleFlight } from '@/lib/useSingleFlight';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'ghost' | 'light' | 'outline-white' | 'danger' | 'dash';
export type ButtonSize = 'lg' | 'md' | 'sm';

// From theme.css: .btn, .btn.md, .btn.sm, .ghost, .light, .ow, .danger, .dash, .off
const base =
  'inline-flex items-center justify-center gap-2 font-bold no-underline cursor-pointer select-none transition-colors flex-none';
const sizes: Record<ButtonSize, string> = {
  lg: 'h-[52px] w-full rounded-xl px-4 text-base',
  md: 'h-[46px] w-full rounded-xl px-4 text-[15px]',
  sm: 'hit44 h-10 w-auto rounded-[10px] px-3.5 text-sm',
};
const variants: Record<ButtonVariant, string> = {
  primary: 'bg-g text-white hover:bg-g2 hover:text-white',
  ghost: 'bg-white text-g border-[1.5px] border-g hover:bg-tint',
  light: 'bg-white text-g hover:bg-tint',
  'outline-white': 'bg-transparent text-white border-[1.5px] border-white hover:bg-white/10',
  danger: 'bg-white text-red border-[1.5px] border-red hover:bg-bbg',
  dash: 'bg-white text-g border-[1.5px] border-dashed border-g hover:bg-tint',
};
const off = 'bg-offbg text-offink border-0 cursor-not-allowed hover:bg-offbg hover:text-offink';

function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'lg', disabled = false) {
  return cx(base, sizes[size], disabled ? off : variants[variant]);
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Busy from outside (e.g. a mutation). The button also locks itself while its own onClick promise runs. */
  busy?: boolean;
  /** May return a promise: the button stays disabled until it settles, and extra taps are ignored. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => unknown;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'lg',
  busy = false,
  disabled = false,
  type = 'button',
  onClick,
  className,
  children,
  ...rest
}: ButtonProps) {
  const [run, running] = useSingleFlight((e: MouseEvent<HTMLButtonElement>) => onClick?.(e));
  const isBusy = busy || running;
  const isOff = disabled || isBusy;

  return (
    <button
      type={type}
      {...rest}
      disabled={isOff}
      aria-busy={isBusy || undefined}
      className={cx(
        buttonClass(variant, size, disabled && !isBusy),
        isBusy && 'cursor-wait opacity-90',
        className,
      )}
      onClick={(e) => {
        if (isOff) return;
        void run(e);
      }}
    >
      {isBusy && <Spinner />}
      {children}
    </button>
  );
}

/** A link that looks like a button (navigation only, never a money action). */
export function ButtonLink({
  variant = 'primary',
  size = 'lg',
  className,
  ...rest
}: LinkProps & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link {...rest} className={cx(buttonClass(variant, size), className)} />;
}
