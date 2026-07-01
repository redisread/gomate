"use client";

import * as React from "react";

const DiscoverMain = React.lazy(
  () => import("@/components/features/discover-client").then((m) => ({
    default: m.DiscoverMain,
  }))
);

const StoryDetail = React.lazy(
  () => import("@/components/features/discover-client").then((m) => ({
    default: m.StoryDetail,
  }))
);

interface LazyDiscoverMainProps {
  [key: string]: unknown;
}

export function LazyDiscoverMain(props: LazyDiscoverMainProps) {
  return (
    <React.Suspense fallback={<DiscoverLoadingSkeleton />}>
      <DiscoverMain {...props} />
    </React.Suspense>
  );
}

interface LazyStoryDetailProps {
  [key: string]: unknown;
}

export function LazyStoryDetail(props: LazyStoryDetailProps) {
  return (
    <React.Suspense fallback={<StoryDetailLoadingSkeleton />}>
      <StoryDetail {...props} />
    </React.Suspense>
  );
}

function DiscoverLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 sm:pt-24 pb-5 sm:pb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

function StoryDetailLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[400px] bg-muted rounded-xl animate-pulse mb-8" />
          <div className="space-y-4">
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
