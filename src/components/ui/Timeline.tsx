import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

// From theme.css: .tl and .nc (done / now / todo)
export type StepState = 'done' | 'now' | 'todo' | 'bad';

const circle: Record<StepState, string> = {
  done: 'bg-leaf text-white',
  now: 'bg-amber text-[#3A2600]',
  todo: 'border-2 border-field text-mut',
  bad: 'bg-red text-white',
};
const said: Record<StepState, string> = { done: 'Done', now: 'Now', todo: 'Not yet', bad: 'Problem' };

export function Step({ n, state, children }: { n: number; state: StepState; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cx(
          'flex size-7 flex-none items-center justify-center rounded-full text-[13px] font-bold',
          circle[state],
        )}
      >
        <span aria-hidden="true">{state === 'done' ? '✓' : state === 'bad' ? '!' : n}</span>
        <span className="sr-only">
          Step {n}: {said[state]}
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
    </li>
  );
}

export function Timeline({ children, className }: { children: ReactNode; className?: string }) {
  return <ol className={cx('m-0 flex list-none flex-col gap-4 p-0', className)}>{children}</ol>;
}
