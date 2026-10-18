"use client";

import * as React from "react";
import { fetchAPI } from "@/lib/api";
import { adminCatchMessage, adminJsonOrThrow } from "@/lib/admin-i18n";
import { fetchSelectableRegions } from "@/lib/regions";
import { useI18n } from "@/hooks/useI18n";
import { ACTIVITY_TYPES } from "@/contracts";
import type { ActivityType, Location, Region, Tag } from "@/lib/types";

import {
  DEFAULT_LOCATION_FORM,
  getCoordinatePairErrors,
  locationToFormData,
  resolveLocationSaveStatus,
  locationSaveDestination,
  formDataToLocationPayload,
} from "./location-form-data";
import type {
  LocationFormData,
  LocationSaveIntent,
  LocationSaveResult,
} from "./location-form-data";
import {
  loadLocationDraft,
  saveLocationDraft,
  removeLocationDraft,
} from "./location-form-draft";


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
  resetVersion: number;
  saveMessage: { type: "success" | "error"; text: string } | null;
  showDraftBanner: boolean;
  pendingDraft: LocationFormData | null;
  updateField: <K extends keyof LocationFormData>(
    key: K,
    value: LocationFormData[K],
  ) => void;
  touch: (key: string, value: string) => void;
  handleSave: (intent?: LocationSaveIntent) => Promise<LocationSaveResult>;
  handleDiscard: () => void;
  handleRestoreDraft: () => void;
  handleDiscardDraft: () => void;
}


export function useLocationForm(locationId?: string): UseLocationFormReturn {
  const { t } = useI18n(["admin"]);
  const mode = locationId ? "edit" : "create";
  const [location, setLocation] = React.useState<Location | null>(null);
  const [regions, setRegions] = React.useState<Region[]>([]);
  const [allTags, setAllTags] = React.useState<Tag[]>([]);
  const [formData, setFormData] = React.useState<LocationFormData>(
    DEFAULT_LOCATION_FORM,
  );
  const [errors, setErrors] = React.useState<
    Record<string, string | undefined>
  >({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [resetVersion, setResetVersion] = React.useState(0);
  const [saveMessage, setSaveMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showDraftBanner, setShowDraftBanner] = React.useState(false);
  const [pendingDraft, setPendingDraft] =
    React.useState<LocationFormData | null>(null);

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
        adminJsonOrThrow<{ success: boolean; tags: Tag[] }>(
          response,
          t,
          "admin.loadLocationFailed",
        ),
      ),
      locationId
        ? fetchAPI(`/locations/${locationId}/admin`).then((response) =>
            adminJsonOrThrow<LocationResponse>(
              response,
              t,
              "admin.loadLocationFailed",
            ),
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

        const draft = loadLocationDraft(locationId);
        setPendingDraft(draft);
        setShowDraftBanner(
          draft !== null &&
            JSON.stringify(draft) !== JSON.stringify(serverForm),
        );
        setFormData(serverForm);
      })
      .catch((error) => {
        if (active) {
          setSaveMessage({
            type: "error",
            text: adminCatchMessage(error, t, "admin.loadLocationFailed"),
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

  const validateField = React.useCallback(
    (key: string, value: string) => {
      if (key === "name") {
        if (!value.trim()) return t("admin.validationNameRequired");
        if (value.trim().length > 200) return t("admin.validationNameTooLong");
      }
      if (key === "description" && !value.trim())
        return t("admin.validationDescRequired");
      if (key === "regionId" && !value)
        return t("admin.validationRegionRequired");
      if (key === "coverImageUrl" && !value.trim()) return undefined;
      if (key === "latitude" || key === "longitude") {
        if (value === "") return undefined;
        const number = Number(value);
        const [min, max] = key === "latitude" ? [-90, 90] : [-180, 180];
        if (!Number.isFinite(number) || number < min || number > max) {
          return key === "latitude"
            ? t("admin.validationLatInvalid")
            : t("admin.validationLngInvalid");
        }
      }
      return undefined;
    },
    [t],
  );

  const touch = React.useCallback(
    (key: string, value: string) => {
      setErrors((previous) => ({
        ...previous,
        [key]: validateField(key, value),
      }));
    },
    [validateField],
  );

  React.useEffect(() => {
    if (!isDirty || !formData.name) return;
    const timer = window.setTimeout(() => {
      saveLocationDraft(formData, locationId);
    }, 2_000);
    return () => window.clearTimeout(timer);
  }, [formData, isDirty, locationId]);

  const updateField = React.useCallback(
    <K extends keyof LocationFormData>(key: K, value: LocationFormData[K]) => {
      setFormData((previous) => ({ ...previous, [key]: value }));
      setIsDirty(true);
      setSaveMessage(null);
      if (typeof value === "string") touch(key, value);
    },
    [touch],
  );

  const clearDraft = React.useCallback(() => {
    removeLocationDraft(locationId);
  }, [locationId]);

  const handleSave = React.useCallback(
    async (
      intent: LocationSaveIntent = "keep",
    ): Promise<LocationSaveResult> => {
      const nextStatus = resolveLocationSaveStatus(formData.status, intent);
      const nextErrors: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries({
        name: formData.name,
        description: formData.description,
        regionId: formData.regionId,
      })) {
        nextErrors[key] = validateField(key, value);
      }
      const coordinatePairErrors = getCoordinatePairErrors(
        formData.latitude,
        formData.longitude,
        t("admin.coordinatesPairRequired"),
      );
      nextErrors.latitude =
        coordinatePairErrors.latitude ??
        (formData.latitude === ""
          ? undefined
          : validateField("latitude", String(formData.latitude)));
      nextErrors.longitude =
        coordinatePairErrors.longitude ??
        (formData.longitude === ""
          ? undefined
          : validateField("longitude", String(formData.longitude)));
      if (nextStatus === "published") {
        nextErrors.coverImageUrl = formData.coverImageUrl.trim()
          ? validateField("coverImageUrl", formData.coverImageUrl)
          : t("admin.validationCoverRequired");
      }
      setErrors(nextErrors);
      const firstInvalidField = Object.entries(nextErrors).find(([, error]) =>
        Boolean(error),
      )?.[0];
      if (firstInvalidField) return { ok: false, firstInvalidField };

      setIsSaving(true);
      setSaveMessage(null);
      try {
        const payload = formDataToLocationPayload({
          ...formData,
          status: nextStatus,
        });
        const mutationResponse = await fetchAPI("/locations", {
          method: locationId ? "PUT" : "POST",
          body: JSON.stringify(
            locationId ? { id: locationId, ...payload } : payload,
          ),
        });
        const response = await adminJsonOrThrow<LocationResponse>(
          mutationResponse,
          t,
          "admin.saveFailed",
        );
        const tagsResponse = await fetchAPI(
          `/locations/${response.location.id}/tags`,
          {
            method: "PUT",
            body: JSON.stringify({ tagIds: formData.tagIds }),
          },
        );
        await adminJsonOrThrow(tagsResponse, t, "admin.saveFailed");
        setLocation(response.location);
        setFormData((previous) => ({
          ...previous,
          status: response.location.status,
        }));
        clearDraft();
        setIsDirty(false);
        setSaveMessage({ type: "success", text: t("admin.saveSuccess") });
        const destination = locationSaveDestination(mode, response.location.id);
        if (destination) window.location.href = destination;
        return { ok: true };
      } catch (error) {
        setSaveMessage({
          type: "error",
          text: adminCatchMessage(error, t, "admin.saveFailed"),
        });
        return { ok: false };
      } finally {
        setIsSaving(false);
      }
    },
    [clearDraft, formData, locationId, mode, t, validateField],
  );

  const handleDiscard = React.useCallback(() => {
    if (!window.confirm(t("admin.discardConfirm"))) return;
    setResetVersion((version) => version + 1);
    setFormData(
      location ? locationToFormData(location) : DEFAULT_LOCATION_FORM,
    );
    clearDraft();
    setIsDirty(false);
    setErrors({});
    setSaveMessage(null);
  }, [clearDraft, location, t]);

  const handleRestoreDraft = React.useCallback(() => {
    if (pendingDraft) {
      setResetVersion((version) => version + 1);
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
    resetVersion,
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
