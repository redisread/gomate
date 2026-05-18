"use client";

/**
 * LocationEditClient 懒加载包装器
 * 减少首屏 bundle 82KB
 */

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// 动态导入 LocationEditClient
const LocationEditClient = React.lazy(
  () => import("@/components/features/location-edit-client").then((m) => ({
    default: m.LocationEditClient,
  }))
);

interface LazyLocationEditClientProps {
  locationId: string;
}

export function LazyLocationEditClient({
  locationId,
}: LazyLocationEditClientProps) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
          <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
            <div className="h-5 w-24 bg-stone-200 dark:bg-stone-800 rounded mb-6" />
            <div className="h-7 w-48 bg-stone-200 dark:bg-stone-800 rounded mb-8" />
            <div className="h-10 bg-stone-100 dark:bg-stone-900 rounded-2xl mb-8" />
          </div>
        </div>
      }
    >
      <LocationEditClient locationId={locationId} />
    </React.Suspense>
  );
}
