import { Skeleton } from "@/components/ui/skeleton";

export function ShimmerTask() {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-task p-4">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-16" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 shrink-0 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      <Skeleton className="h-4 w-24" />
    </div>
  );
}
