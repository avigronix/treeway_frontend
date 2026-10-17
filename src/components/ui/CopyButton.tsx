import { useEffect, useState } from 'react';
import { Button, type ButtonProps } from './Button';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** "Copy UPI ID" → "Copied ✓" for 2 seconds. */
export function CopyButton({
  text,
  label,
  ...rest
}: { text: string; label: string } & Omit<ButtonProps, 'onClick' | 'children'>) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <Button
      variant="ghost"
      size="sm"
      {...rest}
      aria-live="polite"
      onClick={async () => setState((await copyText(text)) ? 'ok' : 'fail')}
    >
      {state === 'ok' ? 'Copied ✓' : state === 'fail' ? 'Copy failed' : label}
    </Button>
  );
}
