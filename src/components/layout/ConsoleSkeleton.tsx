import { Skeleton } from "@/components/ui/skeleton";

/** Loading state shared by the staff and admin consoles: a title, four stat cards and a table. */
export function ConsoleSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-6 w-48 bg-border" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full bg-border" />
        ))}
      </div>
      <Skeleton className="h-72 w-full bg-border" />
    </div>
  );
}
