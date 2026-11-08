import { useCallback } from "react";
import { useI18n } from "@/hooks/useI18n";
import { fetchPublicAPI } from "@/lib/api";
import type { ApiResult, LocationResponse } from "@/contracts/http-responses";
import { SharePoster } from "../share-poster/share-poster";
import { createLocationPosterContent } from "./location-poster-content";

export function LocationSharePoster({ locationId }: { locationId: string }) {
  const { t, locale } = useI18n(["locationDetail", "enums", "common", "teams"]);
  const generate = useCallback(
    async (signal: AbortSignal) => {
      const response = await fetchPublicAPI(
        `/locations/${encodeURIComponent(locationId)}`,
        { signal, cache: "no-store" },
      );
      if (!response.ok) throw new Error("poster_location_unavailable");
      const data = await response.json<ApiResult<LocationResponse>>();
      if (!data.success) throw new Error("poster_location_unavailable");
      const content = createLocationPosterContent(
        data.location,
        locale,
        window.location.origin,
        t,
      );
      const { renderLocationPoster } = await import("./render-location-poster");
      signal.throwIfAborted();
      const result = await renderLocationPoster(content, signal);
      return {
        ...result,
        title: content.title,
        accessibleText: [
          content.title,
          content.region,
          content.activity,
          content.seasons,
          content.introduction,
          content.note,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    },
    [locationId, locale, t],
  );
  return (
    <SharePoster
      t={t}
      namespace="locationDetail"
      generate={generate}
      filename={`gomate-location-${locationId}.png`}
    />
  );
}
