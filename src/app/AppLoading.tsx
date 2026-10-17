import { Skeleton } from '@/components/ui';

/** First load / lazy area load: a light skeleton instead of a blank screen. */
export function AppLoading() {
  return (
    <div aria-busy="true" className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
      <span className="sr-only">Loading</span>
      <div className="flex min-h-[62px] items-center gap-2 border-b border-line bg-white px-3 py-2">
        <Skeleton className="h-10 w-[60px]" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <Skeleton className="h-[150px] w-full rounded-[18px]" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}
