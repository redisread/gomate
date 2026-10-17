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
          .then((response) => response.json())
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
    if (!formData.locationId) {
      setSelectedLocation(null);
      setFormData((prev) =>
        prev.activityType ? { ...prev, activityType: "" } : prev,
      );
      return;
    }

    let cancelled = false;
    setSelectedLocation(null);
    setFormData((prev) =>
      prev.activityType ? { ...prev, activityType: "" } : prev,
    );

    // 获取地点详情
    fetchAPI(`/locations/${formData.locationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success && data.location) {
          const loc = data.location as Location;
          setSelectedLocation(loc);

          setFormData((prev) => ({
            ...prev,
            activityType: "",
            durationMinutes: "240",
          }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [formData.locationId]);

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
      const data = await res.json();
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
