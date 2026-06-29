import { Skeleton } from "@/components/ui/skeleton";

/** 전역 로딩 스켈레톤 */
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
