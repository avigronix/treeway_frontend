import { ButtonLink, Note } from '@/components/ui';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-3 px-4">
      <h1 className="m-0 text-[22px] font-bold">Page not found</h1>
      <Note>This page does not exist, or it is coming soon.</Note>
      <ButtonLink to="/">Go to Home</ButtonLink>
    </main>
  );
}
