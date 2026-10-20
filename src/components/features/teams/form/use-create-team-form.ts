import type { ApiResult, LocationResponse, LocationsResponse } from "@/contracts/http-responses";
import type { TeamResponse } from "@/contracts/team-api";
import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, fetchCurrentUser, getApiErrorMessage } from "@/lib/api";
import {
  orderActivityTypesForLocation,
  isActivityType,
} from "@/lib/activity-types";
import { ACTIVITY_TYPES } from "@/contracts";
import type { Location } from "@/lib/types";
import { createTeamPayload } from "./team-form-data";
import type { CreateTeamFormData } from "./team-form-data";

export function useCreateTeamForm() {
  const { t } = useI18n(["teams", "errors", "common", "enums"]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [locationSearch, setLocationSearch] = React.useState("");
  const [locationSearchVersion, setLocationSearchVersion] = React.useState(0);
  const [locationsLoading, setLocationsLoading] = React.useState(true);
  const [locationsError, setLocationsError] = React.useState(false);
  const [locationDetailLoading, setLocationDetailLoading] = React.useState(false);
  const [locationDetailError, setLocationDetailError] = React.useState(false);
  const [locationDetailVersion, setLocationDetailVersion] = React.useState(0);
  const [selectedLocation, setSelectedLocation] =
    React.useState<Location | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(
    null,
  );
  const [hasWechat, setHasWechat] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sessionFailed, setSessionFailed] = React.useState(false);
  const [error, setError] = React.useState("");

  // 获取默认日期/时间
  const now = new Date();
  const defaultDate = now.toISOString().split("T")[0];
  const futureTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const defaultTime = `${String(futureTime.getHours()).padStart(2, "0")}:${String(futureTime.getMinutes()).padStart(2, "0")}`;

  const [formData, setFormData] = React.useState<CreateTeamFormData>({
    title: "",
    locationId: "",
    activityType: "",
    startDateInput: defaultDate,
    startClockInput: defaultTime,
    durationMinutes: "240",
    maxParticipants: "",
    description: "",
    meetingPoint: "",
    requirementsInput: "",
  });

  React.useEffect(() => {
    (async () => {
      const u = await fetchCurrentUser(
        `/login?redirect=${encodeURIComponent("/teams/create")}`,
      );
      if (!u) return;
      setIsAuthenticated(true);
      setHasWechat(!!u.extra.wechat);
    })().catch(() => setSessionFailed(true));

    const params = new URLSearchParams(window.location.search);
    const locId = params.get("locationId");
    if (locId) setFormData((prev) => ({ ...prev, locationId: locId }));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const query = locationSearch.trim();
    setLocationsLoading(true);
    setLocationsError(false);
    const timer = window.setTimeout(
      () => {
        const path = query
          ? `/locations?search=${encodeURIComponent(query)}&limit=20`
          : "/locations?limit=20";
        fetchAPI(path)
          .then((response) => response.json<ApiResult<LocationsResponse>>())
          .then((data) => {
            if (cancelled) return;
            if (!data.success) throw new Error("Location search failed");
            setLocations(data.locations ?? []);
          })
          .catch(() => {
            if (!cancelled) {
              setLocations([]);
              setLocationsError(true);
            }
          })
          .finally(() => {
            if (!cancelled) setLocationsLoading(false);
          });
      },
      query ? 300 : 0,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [locationSearch, locationSearchVersion]);

  // 当地点变化时，获取地点详情
  React.useEffect(() => {
    setLocationDetailError(false);
    setLocationDetailLoading(Boolean(formData.locationId));
    if (!formData.locationId) {
      setSelectedLocation(null);
      setFormData((prev) =>
        prev.activityType ? { ...prev, activityType: "" } : prev,
      );
      return;
    }

    const controller = new AbortController();
    setSelectedLocation(null);
    setFormData((prev) =>
      prev.activityType ? { ...prev, activityType: "" } : prev,
    );

    // 获取地点详情
    fetchAPI(`/locations/${formData.locationId}`, { signal: controller.signal })
      .then((r) => r.json<ApiResult<LocationResponse>>())
      .then((data) => {
        if (!data.success || !data.location) throw new Error("Location detail request failed");
        if (!controller.signal.aborted) {
          const loc = data.location;
          setSelectedLocation(loc);

          setFormData((prev) => ({
            ...prev,
            activityType: "",
            durationMinutes: "240",
          }));
        }
      })
      .catch(() => { if (!controller.signal.aborted) setLocationDetailError(true); })
      .finally(() => { if (!controller.signal.aborted) setLocationDetailLoading(false); });

    return () => controller.abort();
  }, [formData.locationId, locationDetailVersion]);

  const orderedActivityTypes = React.useMemo(
    () =>
      orderActivityTypesForLocation(
        ACTIVITY_TYPES,
        selectedLocation?.supportedActivityTypes ?? [],
      ),
    [selectedLocation],
  );

  // 快捷设置时长
  const handleDurationQuickSelect = (minutes: number) => {
    setFormData((prev) => ({ ...prev, durationMinutes: String(minutes) }));
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(null);
    setFormData((prev) => ({ ...prev, locationId, activityType: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const activityType = formData.activityType;
      if (
        !activityType ||
        selectedLocation?.id !== formData.locationId ||
        !isActivityType(activityType)
      ) {
        setError(t("errors.createTeamFailed"));
        setIsSubmitting(false);
        return;
      }
      const res = await fetchAPI("/teams", {
        method: "POST",
        body: JSON.stringify(createTeamPayload(formData, activityType)),
      });
      const data = await res.json<ApiResult<TeamResponse>>();
      if (data.success && data.team?.id) {
        window.location.href = `/teams/${data.team.id}`;
      } else {
        setError(getApiErrorMessage(data, t("errors.createTeamFailed")));
        setIsSubmitting(false);
      }
    } catch {
      setError(t("errors.createTeamFailed"));
      setIsSubmitting(false);
    }
  };

  return {
    t,
    formData,
    defaultDate,
    locations,
    locationsLoading,
    locationsError,
    selectedLocation,
    locationDetailLoading,
    locationDetailError,
    retryLocationDetail: () => setLocationDetailVersion((version) => version + 1),
    setLocationSearch,
    setLocationSearchVersion,
    isAuthenticated,
    hasWechat,
    isSubmitting,
    sessionFailed,
    error,
    orderedActivityTypes,
    handleDurationQuickSelect,
    handleChange,
    handleLocationChange,
    handleSubmit,
  };
}
