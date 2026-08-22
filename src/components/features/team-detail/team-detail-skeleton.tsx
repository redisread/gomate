import { Navbar } from "@/components/layout/navbar";

export function TeamDetailSkeleton() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-20 sm:px-6 lg:pb-16 lg:pt-8" aria-busy="true">
        <div className="overflow-hidden rounded-[20px] bg-card shadow-[0_18px_48px_rgba(82,58,31,0.10)] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <div className="min-h-72 animate-pulse bg-secondary/80 lg:min-h-[34rem]" />
          <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <div className="h-10 w-32 animate-pulse rounded-lg bg-secondary/80" />
            <div className="h-20 w-4/5 animate-pulse rounded-xl bg-secondary/80" />
            <div className="h-28 animate-pulse rounded-xl bg-secondary/80" />
            <div className="h-24 animate-pulse rounded-xl bg-secondary/80" />
          </div>
        </div>
        <div className="mt-7 grid gap-7 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
          <aside className="lg:col-start-2 lg:row-start-1">
            <div className="h-64 animate-pulse rounded-[20px] bg-secondary/80" />
          </aside>
          <div className="space-y-7 lg:col-start-1 lg:row-start-1">
            <div className="h-64 animate-pulse rounded-[20px] bg-secondary/80" />
            <div className="h-48 animate-pulse rounded-[20px] bg-secondary/80" />
          </div>
        </div>
      </div>
    </main>
  );
}
