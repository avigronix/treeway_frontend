import { Chip, Note } from '@/components/ui';
import { MemberPage } from './MemberPage';

/** The design's "Coming soon" state for parts whose backend or screen is not built yet. No fake numbers. */
export function ComingSoon({ title, text }: { title: string; text?: string }) {
  return (
    <MemberPage title={title} back="/more">
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="m-0 text-base font-bold">{title}</h2>
        <Chip tone="muted">Coming soon</Chip>
      </div>
      <Note>{text ?? 'This part of Treeway is being built. You will see it here soon.'}</Note>
    </MemberPage>
  );
}
