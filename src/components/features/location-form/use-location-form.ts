"use client";

import * as React from "react";
import { apiPost, apiPut, fetchAPI } from "@/lib/api";
import { fetchSelectableRegions } from "@/lib/regions";
import { useI18n } from "@/hooks/useI18n";
import { ACTIVITY_TYPES } from "@/contracts";
import type {
  ActivityType,
  Difficulty,
  Location,
  LocationStatus,
  Region,
  Tag,
} from "@/lib/types";

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
      difficulty: Difficulty | "";
      durationMin: number | string;
      durationMax: number | string;
      distanceKm: number | string;
      elevationGainM: number | string;
      bestSeasons: string[];
      overview: string;
      tips: string[];
      warnings: string[];
    };
    facilities: string[];
  };
  tagIds: string[];
}

export type FormData = LocationFormData;
export type LocationSaveIntent = "keep" | "publish" | "restore";

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
      difficulty?: Difficulty;
      durationMin?: number;
      durationMax?: number;
      distanceKm?: number;
      elevationGainM?: number;
      bestSeasons?: string[];
      overview?: string | null;
      tips?: string[];
      warnings?: string[];
    };
    facilities?: string[];
  };
}

interface LocationResponse {
  success: boolean;
  location: Location;
}

interface UseLocationFormReturn {
  mode: "create" | "edit";
  location: Location | null;
  regions: Region[];
  allTags: Tag[];
  activityTypes: readonly ActivityType[];
  formData: LocationFormData;
  errors: Record<string, string | undefined>;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  saveMessage: { type: "success" | "error"; text: string } | null;
  showDraftBanner: boolean;
  pendingDraft: LocationFormData | null;
  updateField: <K extends keyof LocationFormData>(key: K, value: LocationFormData[K]) => void;
  touch: (key: string, value: string) => void;
  handleSave: (intent?: LocationSaveIntent) => Promise<void>;
  handleDiscard: () => void;
  handleRestoreDraft: () => void;
  handleDiscardDraft: () => void;
}

const EMPTY_HIKING: LocationFormData["extra"]["hiking"] = {
  difficulty: "",
  durationMin: "",
  durationMax: "",
  distanceKm: "",
  elevationGainM: "",
  bestSeasons: [],
  overview: "",
  tips: [],
  warnings: [],
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

function optionalNumber(value: number | string): number | undefined {
  if (value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
        difficulty: hiking?.difficulty ?? "",
        durationMin: hiking?.durationMin ?? "",
        durationMax: hiking?.durationMax ?? "",
        distanceKm: hiking?.distanceKm ?? "",
        elevationGainM: hiking?.elevationGainM ?? "",
        bestSeasons: [...(hiking?.bestSeasons ?? [])],
        overview: hiking?.overview ?? "",
        tips: [...(hiking?.tips ?? [])],
        warnings: [...(hiking?.warnings ?? [])],
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
  if (intent === "restore") return currentStatus === "archived" ? "draft" : currentStatus;
  if (intent === "publish") return currentStatus === "archived" ? currentStatus : "published";
  return currentStatus;
}

export function locationSaveDestination(
  mode: "create" | "edit",
  locationId: string,
): string | null {
  return mode === "create" ? `/admin/locations/${locationId}/edit` : null;
}

export function formDataToLocationPayload(form: LocationFormData): LocationMutationPayload {
  const hiking = form.extra.hiking;
  const hikingPayload: NonNullable<LocationMutationPayload["extra"]["hiking"]> = {
    difficulty: hiking.difficulty || undefined,
    durationMin: optionalNumber(hiking.durationMin),
    durationMax: optionalNumber(hiking.durationMax),
    distanceKm: optionalNumber(hiking.distanceKm),
    elevationGainM: optionalNumber(hiking.elevationGainM),
    bestSeasons: cleanStrings(hiking.bestSeasons),
    overview: hiking.overview.trim() || null,
    tips: cleanStrings(hiking.tips),
    warnings: cleanStrings(hiking.warnings),
  };
  const hasHiking = Object.values(hikingPayload).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== "",
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

function draftKey(locationId?: string): string {
  return `location-${locationId ? `edit-${locationId}` : "create"}-draft`;
}

async function jsonOrThrow<T>(response: Response, message: string): Promise<T> {
  if (!response.ok) throw new Error(message);
  return response.json() as Promise<T>;
}

export function useLocationForm(locationId?: string): UseLocationFormReturn {
  const { t } = useI18n(["admin"]);
  const mode = locationId ? "edit" : "create";
  const [location, setLocation] = React.useState<Location | null>(null);
  const [regions, setRegions] = React.useState<Region[]>([]);
  const [allTags, setAllTags] = React.useState<Tag[]>([]);
  const [formData, setFormData] = React.useState<LocationFormData>(DEFAULT_LOCATION_FORM);
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDraftBanner, setShowDraftBanner] = React.useState(false);
  const [pendingDraft, setPendingDraft] = React.useState<LocationFormData | null>(null);

  React.useEffect(() => {
    fetchAPI("/auth/get-session")
      .then((response) => response.json())
      .then((data) => {
        if (data?.user?.role !== "admin") window.location.href = "/";
      })
      .catch(() => {
        window.location.href = "/";
      });
  }, []);

  React.useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([
      fetchSelectableRegions(),
      fetchAPI("/tags?limit=200").then((response) =>
        jsonOrThrow<{ success: boolean; tags: Tag[] }>(response, t("admin.loadLocationFailed")),
      ),
      locationId
        ? fetchAPI(`/locations/${locationId}/admin`).then((response) =>
            jsonOrThrow<LocationResponse>(response, t("admin.loadLocationFailed")),
          )
        : Promise.resolve(null),
    ])
      .then(([nextRegions, tagsData, locationData]) => {
        if (!active) return;
        setRegions(nextRegions);
        setAllTags(tagsData.tags ?? []);
        const serverForm = locationData?.location
          ? locationToFormData(locationData.location)
          : DEFAULT_LOCATION_FORM;
        if (locationData?.location) setLocation(locationData.location);

        try {
          const raw = localStorage.getItem(draftKey(locationId));
          const draft = raw ? JSON.parse(raw) as {
            version?: number;
            expiresAt?: number;
            data?: LocationFormData;
          } : null;
          if (draft?.version === 2 && draft.expiresAt && draft.expiresAt > Date.now() && draft.data) {
            setPendingDraft(draft.data);
            setShowDraftBanner(JSON.stringify(draft.data) !== JSON.stringify(serverForm));
          }
        } catch {
          localStorage.removeItem(draftKey(locationId));
        }
        setFormData(serverForm);
      })
      .catch((error) => {
        if (active) {
          setSaveMessage({
            type: "error",
            text: error instanceof Error ? error.message : t("admin.loadLocationFailed"),
          });
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [locationId, t]);

  const validateField = React.useCallback((key: string, value: string) => {
    if (key === "name") {
      if (!value.trim()) return t("admin.validationNameRequired");
      if (value.trim().length > 200) return t("admin.validationNameTooLong");
    }
    if (key === "description" && !value.trim()) return t("admin.validationDescRequired");
    if (key === "regionId" && !value) return t("admin.validationRegionRequired");
    if (key === "coverImageUrl" && !value.trim()) return undefined;
    if (key === "latitude" || key === "longitude") {
      if (value === "") return undefined;
      const number = Number(value);
      const [min, max] = key === "latitude" ? [-90, 90] : [-180, 180];
      if (!Number.isFinite(number) || number < min || number > max) {
        return key === "latitude" ? t("admin.validationLatInvalid") : t("admin.validationLngInvalid");
      }
    }
    return undefined;
  }, [t]);

  const touch = React.useCallback((key: string, value: string) => {
    setErrors((previous) => ({ ...previous, [key]: validateField(key, value) }));
  }, [validateField]);

  React.useEffect(() => {
    if (!isDirty || !formData.name) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(draftKey(locationId), JSON.stringify({
        version: 2,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        data: formData,
      }));
    }, 2_000);
    return () => window.clearTimeout(timer);
  }, [formData, isDirty, locationId]);

  const updateField = React.useCallback(<K extends keyof LocationFormData>(
    key: K,
    value: LocationFormData[K],
  ) => {
    setFormData((previous) => ({ ...previous, [key]: value }));
    setIsDirty(true);
    setSaveMessage(null);
    if (typeof value === "string") touch(key, value);
  }, [touch]);

  const clearDraft = React.useCallback(() => {
    localStorage.removeItem(draftKey(locationId));
  }, [locationId]);

  const handleSave = React.useCallback(async (intent: LocationSaveIntent = "keep") => {
    const nextStatus = resolveLocationSaveStatus(formData.status, intent);
    const nextErrors: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries({
      name: formData.name,
      description: formData.description,
      regionId: formData.regionId,
    })) {
      nextErrors[key] = validateField(key, value);
    }
    if (nextStatus === "published") {
      nextErrors.coverImageUrl = formData.coverImageUrl.trim()
        ? validateField("coverImageUrl", formData.coverImageUrl)
        : t("admin.validationCoverRequired");
      nextErrors.latitude = formData.latitude === ""
        ? t("admin.validationLatInvalid")
        : validateField("latitude", String(formData.latitude));
      nextErrors.longitude = formData.longitude === ""
        ? t("admin.validationLngInvalid")
        : validateField("longitude", String(formData.longitude));
    }
    const min = optionalNumber(formData.extra.hiking.durationMin);
    const max = optionalNumber(formData.extra.hiking.durationMax);
    if (min !== undefined && max !== undefined && max < min) {
      nextErrors.durationMax = t("admin.validationDurationRange");
    }
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const payload = formDataToLocationPayload({ ...formData, status: nextStatus });
      const response = locationId
        ? await apiPut<LocationResponse>("/locations", { id: locationId, ...payload })
        : await apiPost<LocationResponse>("/locations", payload);
      await apiPut(`/locations/${response.location.id}/tags`, { tagIds: formData.tagIds });
      setLocation(response.location);
      setFormData((previous) => ({ ...previous, status: response.location.status }));
      clearDraft();
      setIsDirty(false);
      setSaveMessage({ type: "success", text: t("admin.saveSuccess") });
      const destination = locationSaveDestination(mode, response.location.id);
      if (destination) window.location.href = destination;
    } catch (error) {
      setSaveMessage({
        type: "error",
        text: error instanceof Error ? error.message : t("admin.saveFailed"),
      });
    } finally {
      setIsSaving(false);
    }
  }, [clearDraft, formData, locationId, mode, t, validateField]);

  const handleDiscard = React.useCallback(() => {
    if (!window.confirm(t("admin.discardConfirm"))) return;
    setFormData(location ? locationToFormData(location) : DEFAULT_LOCATION_FORM);
    clearDraft();
    setIsDirty(false);
    setErrors({});
    setSaveMessage(null);
  }, [clearDraft, location, t]);

  const handleRestoreDraft = React.useCallback(() => {
    if (pendingDraft) {
      setFormData(pendingDraft);
      setIsDirty(true);
    }
    setShowDraftBanner(false);
    setPendingDraft(null);
  }, [pendingDraft]);

  const handleDiscardDraft = React.useCallback(() => {
    clearDraft();
    setShowDraftBanner(false);
    setPendingDraft(null);
  }, [clearDraft]);

  return {
    mode,
    location,
    regions,
    allTags,
    activityTypes: ACTIVITY_TYPES,
    formData,
    errors,
    isLoading,
    isSaving,
    isDirty,
    saveMessage,
    showDraftBanner,
    pendingDraft,
    updateField,
    touch,
    handleSave,
    handleDiscard,
    handleRestoreDraft,
    handleDiscardDraft,
  };
}
