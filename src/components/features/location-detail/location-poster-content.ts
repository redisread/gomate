import type { Location } from "@/contracts";

type Translate = (key: string) => string;

export function createLocationPosterContent(
  location: Location,
  locale: string,
  origin: string,
  t: Translate,
) {
  const seasons: Record<string, string> = {
    spring: "spring",
    春季: "spring",
    summer: "summer",
    夏季: "summer",
    autumn: "autumn",
    秋季: "autumn",
    winter: "winter",
    冬季: "winter",
  };
  return {
    title: location.name,
    location: location.name,
    region: location.region?.name ?? "",
    coverUrl:
      location.coverImageUrl?.trim() ||
      location.images.find((image) => image.trim()) ||
      null,
    activity: location.supportedActivityTypes
      .map((activity) => t(`enums.locationType.${activity}`))
      .join(" · "),
    seasons: (location.extra.hiking?.bestSeasons ?? [])
      .map((season) =>
        Object.hasOwn(seasons, season)
          ? t(`enums.season.${seasons[season]}`)
          : season,
      )
      .join(" · "),
    seasonsLabel: t("locationDetail.seasons"),
    introduction: location.subtitle?.trim() || location.description.trim(),
    scanLabel: t("locationDetail.poster.scan"),
    note: t("locationDetail.poster.detailNote"),
    url: new URL(
      `${locale === "en" ? "/en" : ""}/locations/${encodeURIComponent(location.id)}`,
      origin,
    ).href,
  };
}

export type LocationPosterContent = ReturnType<
  typeof createLocationPosterContent
>;
