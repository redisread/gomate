import * as React from "react";
import { fetchAPI } from "@/lib/api";
import type { LocationStatsResponse, Region } from "@/contracts";

export type MapPoint = Pick<
  LocationStatsResponse["points"][number],
  "id" | "name" | "latitude" | "longitude" | "region" | "coverImageUrl"
> & {
  provinceName: string | null;
};
export interface ProvincePath {
  name: string;
  d: string;
}
interface MapData {
  points: MapPoint[];
  counts: Map<string, number>;
}
interface Resource<T> {
  status: "loading" | "ready" | "error";
  value: T | null;
}

async function loadMap(signal: AbortSignal): Promise<ProvincePath[]> {
  const response = await fetch("/maps/china-provinces.svg", { signal });
  if (!response.ok) throw new Error("Map unavailable");
  const document = new DOMParser().parseFromString(
    await response.text(),
    "image/svg+xml",
  );
  const paths = Array.from(document.querySelectorAll("path[data-name]"))
    .map((path) => ({
      name: path.getAttribute("data-name") || "",
      d: path.getAttribute("d") || "",
    }))
    .filter((path) => path.name && path.d);
  if (!paths.length) throw new Error("Map unavailable");
  return paths;
}

async function loadData(signal: AbortSignal): Promise<MapData> {
  const [statsResponse, regionsResponse] = await Promise.all([
    fetchAPI("/locations/stats", { signal }),
    fetchAPI("/regions?countryCode=CN&level=province&serviceEnabled=false", {
      signal,
    }),
  ]);
  if (!statsResponse.ok || !regionsResponse.ok)
    throw new Error("Map data unavailable");
  const stats = (await statsResponse.json()) as LocationStatsResponse;
  const provinces = (await regionsResponse.json()) as {
    success: boolean;
    regions: Region[];
  };
  if (!stats.success || !provinces.success)
    throw new Error("Map data unavailable");
  const names = new Map(
    provinces.regions.map((region) => [region.id, region.name]),
  );
  const counts = new Map<string, number>();
  for (const entry of stats.regions) {
    const name = entry.region.parentId
      ? names.get(entry.region.parentId)
      : undefined;
    if (name) counts.set(name, (counts.get(name) ?? 0) + entry.count);
  }
  return {
    counts,
    points: stats.points
      .filter((point) => point.latitude !== null && point.longitude !== null)
      .map((point) => ({
        ...point,
        provinceName: point.region.parentId
          ? (names.get(point.region.parentId) ?? null)
          : null,
      })),
  };
}

function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = React.useState(0);
  const [resource, setResource] = React.useState<Resource<T>>({
    status: "loading",
    value: null,
  });
  React.useEffect(() => {
    const controller = new AbortController();
    setResource((previous) => ({ ...previous, status: "loading" }));
    load(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setResource({ status: "ready", value });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResource((previous) => ({ ...previous, status: "error" }));
      });
    return () => controller.abort();
  }, [load, attempt]);
  return { ...resource, retry: () => setAttempt((previous) => previous + 1) };
}

export function useMapData() {
  const map = useResource(loadMap);
  const data = useResource(loadData);
  return {
    map,
    data,
    loading: map.status === "loading" || data.status === "loading",
    failed: map.status === "error" || data.status === "error",
    retry: () => {
      if (map.status === "error") map.retry();
      if (data.status === "error") data.retry();
    },
  };
}
