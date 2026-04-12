import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export function TeamDetailSkeleton() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto px-6 py-8 lg:py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 lg:gap-12">
          <aside className="space-y-6">
            <div className="h-8 w-3/4 bg-secondary/70 rounded-lg animate-pulse" />
            <div className="h-20 bg-secondary/70 rounded-xl animate-pulse" />
            <div className="h-32 bg-secondary/70 rounded-xl animate-pulse" />
          </aside>
          <div className="space-y-6">
            <div className="h-48 bg-secondary/70 rounded-2xl animate-pulse" />
            <div className="h-64 bg-secondary/70 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
