import { Navbar } from "@/components/layout/navbar";

export function TeamDetailSkeleton() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div
        data-testid="team-detail-content"
        className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 pb-16 pt-20 sm:px-6 lg:pt-24"
        aria-busy="true"
      >
        <div className="h-11 w-32 rounded-lg bg-secondary" />
        <div className="h-8 w-24 rounded-full bg-secondary" />
        <div className="h-12 w-4/5 rounded-lg bg-secondary" />
        <div
          className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8"
          aria-hidden="true"
        >
          <div className="order-2 aspect-[16/9] rounded-2xl bg-secondary lg:order-1 lg:aspect-[4/3]" />
          <div className="order-1 space-y-5 rounded-2xl bg-card p-6 lg:order-2">
            <div className="h-6 w-32 rounded-lg bg-secondary" />
            <div className="h-24 rounded-lg bg-secondary" />
            <div className="h-12 rounded-lg bg-secondary" />
            <div className="h-20 rounded-lg bg-secondary" />
          </div>
        </div>
      </div>
    </main>
  );
}
