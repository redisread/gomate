"use client";

import * as React from "react";

const LocationCreateClient = React.lazy(
  () => import("@/components/features/location-edit-client").then((module) => ({
    default: module.LocationCreateClient,
  })),
);

export function LazyLocationCreateClient() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-stone-50 dark:bg-stone-950" />}>
      <LocationCreateClient />
    </React.Suspense>
  );
}
