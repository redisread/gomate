import type { ActivityType, Location, LocationStatus } from "@/lib/types";

export interface LocationFormData {
  name: string;
  slug: string;
  supportedActivityTypes: ActivityType[];
  status: LocationStatus;
  subtitle: string;
  description: string;
  address: string;
  regionId: string;
  latitude: number | string;
  longitude: number | string;
  coverImageUrl: string;
  images: string[];
  extra: {
    hiking: {
      bestSeasons: string[];
    };
    facilities: string[];
  };
  tagIds: string[];
}

export type FormData = LocationFormData;
export type LocationSaveIntent = "keep" | "publish" | "restore";
export type LocationSaveResult =
  { ok: true } | { ok: false; firstInvalidField?: string };

export interface LocationMutationPayload {
  regionId: string;
  name: string;
  slug?: string;
  supportedActivityTypes: ActivityType[];
  status: LocationStatus;
  subtitle: string | null;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  coverImageUrl: string | null;
  images: string[];
  extra: {
    hiking?: {
      bestSeasons?: string[];
    };
    facilities?: string[];
  };
}

const EMPTY_HIKING: LocationFormData["extra"]["hiking"] = {
  bestSeasons: [],
};

export const DEFAULT_LOCATION_FORM: LocationFormData = {
  name: "",
  slug: "",
  supportedActivityTypes: [],
  status: "draft",
  subtitle: "",
  description: "",
  address: "",
  regionId: "",
  latitude: "",
  longitude: "",
  coverImageUrl: "",
  images: [],
  extra: {
    hiking: { ...EMPTY_HIKING },
    facilities: [],
  },
  tagIds: [],
};

function cleanStrings(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function getCoordinatePairErrors(
  latitude: number | string,
  longitude: number | string,
  message: string,
): Record<"latitude" | "longitude", string | undefined> {
  const latitudeBlank = latitude === "";
  const longitudeBlank = longitude === "";
  return {
    latitude: latitudeBlank && !longitudeBlank ? message : undefined,
    longitude: longitudeBlank && !latitudeBlank ? message : undefined,
  };
}

export function locationToFormData(location: Location): LocationFormData {
  const hiking = location.extra.hiking;
  return {
    name: location.name,
    slug: location.slug,
    supportedActivityTypes: [...location.supportedActivityTypes],
    status: location.status,
    subtitle: location.subtitle ?? "",
    description: location.description,
    address: location.address ?? "",
    regionId: location.regionId,
    latitude: location.latitude ?? "",
    longitude: location.longitude ?? "",
    coverImageUrl: location.coverImageUrl ?? "",
    images: [...location.images],
    extra: {
      hiking: {
        bestSeasons: [...(hiking?.bestSeasons ?? [])],
      },
      facilities: [...(location.extra.facilities ?? [])],
    },
    tagIds: (location.tags ?? []).map((tag) => tag.id),
  };
}

export function resolveLocationSaveStatus(
  currentStatus: LocationStatus,
  intent: LocationSaveIntent,
): LocationStatus {
  if (intent === "restore")
    return currentStatus === "archived" ? "draft" : currentStatus;
  if (intent === "publish")
    return currentStatus === "archived" ? currentStatus : "published";
  return currentStatus;
}

export function locationSaveDestination(
  mode: "create" | "edit",
  locationId: string,
): string | null {
  return mode === "create" ? `/admin/locations/${locationId}/edit` : null;
}

export function formDataToLocationPayload(
  form: LocationFormData,
): LocationMutationPayload {
  const hiking = form.extra.hiking;
  const hikingPayload: NonNullable<LocationMutationPayload["extra"]["hiking"]> =
    {
      bestSeasons: cleanStrings(hiking.bestSeasons),
    };
  const hasHiking = Object.values(hikingPayload).some((value) =>
    Array.isArray(value)
      ? value.length > 0
      : value !== undefined && value !== null && value !== "",
  );

  return {
    regionId: form.regionId,
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    supportedActivityTypes: [...form.supportedActivityTypes],
    status: form.status,
    subtitle: form.subtitle.trim() || null,
    description: form.description.trim(),
    address: form.address.trim() || null,
    latitude: form.latitude === "" ? null : Number(form.latitude),
    longitude: form.longitude === "" ? null : Number(form.longitude),
    coverImageUrl: form.coverImageUrl.trim() || null,
    images: form.images,
    extra: {
      hiking: hasHiking ? hikingPayload : undefined,
      facilities: cleanStrings(form.extra.facilities),
    },
  };
}
