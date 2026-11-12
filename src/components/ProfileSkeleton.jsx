import { Skeleton } from '@/components/ui/skeleton';

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <Skeleton className="h-28 w-full bg-muted" />
          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <Skeleton className="h-28 w-28 rounded-3xl bg-muted ring-4 ring-card" />
                <div className="space-y-3 pb-1">
                  <Skeleton className="h-9 w-64 bg-muted" />
                  <Skeleton className="h-5 w-40 bg-muted" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-24 rounded-full bg-muted" />
                    <Skeleton className="h-6 w-28 rounded-full bg-muted" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24 rounded-xl bg-muted" />
                <Skeleton className="h-10 w-24 rounded-xl bg-muted" />
                <Skeleton className="h-10 w-28 rounded-xl bg-muted" />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-3 rounded-3xl border border-border bg-card p-3 shadow-sm">
            <Skeleton className="aspect-[4/5] w-full rounded-2xl bg-muted" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-16 rounded-xl bg-muted" />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, section) => (
              <div key={section} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <Skeleton className="h-8 w-48 bg-muted" />
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((__, index) => (
                    <Skeleton key={index} className="h-20 rounded-2xl bg-muted" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSkeleton;
