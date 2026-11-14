import type { ApiResult, LocationResponse, LocationsResponse } from "@/contracts/http-responses";
import type { TeamResponse } from "@/contracts/team-api";
import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, fetchCurrentUser, refreshCurrentUser, getApiErrorMessage } from "@/lib/api";
import {
  orderActivityTypesForLocation,
  isActivityType,
} from "@/lib/activity-types";
import { ACTIVITY_TYPES } from "@/contracts";
import type { Location } from "@/lib/types";
import { authPageHref } from "@/lib/login-return-path";
import { createTeamPayload } from "./team-form-data";
import type { CreateTeamFormData } from "./team-form-data";
import { teamDefaultSchedule } from "./team-default-schedule";

import {
  clearTeamCreateOperation, clearSignedOutTeamCreate, discardTeamCreateRecord, newTeamCreateOperation, readTeamCreateOperation, readTeamCreateRaw,
  saveTeamCreateOperation, type TeamCreateOperation,
} from "./team-create-operation";

import { synchronizeTeamCreateLogout, watchTeamCreateLogout } from "./team-create-logout";

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
  const [pendingCreate, setPendingCreate] = React.useState<TeamCreateOperation | null>(null);
  const [storageBlocked, setStorageBlocked] = React.useState(false);
  const userId = React.useRef<string | null>(null);
  const savedRecord = React.useRef<string | null>(null);
  const submitting = React.useRef(false);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const defaultSchedule = teamDefaultSchedule(new Date());
  const defaultDate = defaultSchedule.minDate;

  const [formData, setFormData] = React.useState<CreateTeamFormData>({
    title: "",
    locationId: "",
    activityType: "",
    startDateInput: defaultSchedule.startDateInput,
    startClockInput: defaultSchedule.startClockInput,
    durationMinutes: "240",
    maxParticipants: "",
    description: "",
    meetingPoint: "",
    requirementsInput: "",
  });

  React.useEffect(() => {
    let active = true;
    let removeLogoutListener: (() => void) | undefined;
    const invalidatePrivateState = () => {
      if (!active) return;
      userId.current = null;
      savedRecord.current = null;
      setPendingCreate(null);
      const schedule = teamDefaultSchedule(new Date());
      setFormData({
        title: "", locationId: "", activityType: "",
        startDateInput: schedule.startDateInput, startClockInput: schedule.startClockInput,
        durationMinutes: "240", maxParticipants: "", description: "", meetingPoint: "", requirementsInput: "",
      });
      setHasWechat(false);
      setSessionFailed(true);
    };
    const checkSession = async () => {
      const owner = userId.current;
      if (!owner) return;
      try {
        if (synchronizeTeamCreateLogout(owner)) { invalidatePrivateState(); return; }
      } catch { /* Continue with an authoritative session check. */ }
      try {
        const current = await refreshCurrentUser();
        if (!active || userId.current !== owner) return;
        if (current?.id !== owner) {
          try { clearSignedOutTeamCreate(window.sessionStorage, owner); }
          finally { invalidatePrivateState(); }
        }
      } catch { /* An unavailable identity service is not confirmation of logout. */ }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void checkSession(); };
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) void checkSession(); };
    const onFocus = () => { void checkSession(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    (async () => {
      const u = await fetchCurrentUser(
        authPageHref("login", `${window.location.pathname}${window.location.search}`),
      );
      if (!u || !mounted.current || !active) return;
      userId.current = u.id;
      removeLogoutListener = watchTeamCreateLogout(u.id, invalidatePrivateState);
      try {
        synchronizeTeamCreateLogout(u.id);
        savedRecord.current = readTeamCreateRaw(window.sessionStorage, u.id);
        setPendingCreate(readTeamCreateOperation(window.sessionStorage, u.id));
      } catch {
        setStorageBlocked(true);
      }
      setIsAuthenticated(true);
      setHasWechat(!!u.extra.wechat);
    })().catch(() => setSessionFailed(true));

    const params = new URLSearchParams(window.location.search);
    const locId = params.get("locationId");
    if (locId) setFormData((prev) => ({ ...prev, locationId: locId }));
    return () => {
      active = false;
      removeLogoutListener?.();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
    };
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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (locationId: string) => {
    if (locationId === formData.locationId) return;
    setSelectedLocation(null);
    setFormData((prev) => ({ ...prev, locationId, activityType: "" }));
  };

  const sendOperation = async (operation: TeamCreateOperation, retry = false) => {
    const owner = userId.current;
    if (!owner || submitting.current || storageBlocked) return;
    submitting.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      const currentUser = await refreshCurrentUser();
      if (!mounted.current || userId.current !== owner) return;
      if (currentUser?.id !== owner) {
        setSessionFailed(true);
        return;
      }
      const res = await fetchAPI("/teams", {
        method: "POST", body: JSON.stringify(operation),
      });
      const data = await res.json<ApiResult<TeamResponse>>();
      if (!mounted.current || userId.current !== owner) return;
      if (data.success && data.team?.id) {
        clearTeamCreateOperation(window.sessionStorage, owner, operation.requestId);
        setPendingCreate(null);
        if (mounted.current) window.location.href = `/teams/${data.team.id}`;
      } else {
        // Only definite input/auth rejection releases the saved operation. A
        // conflict or unknown result must retain its original identity/content.
        if (!retry && [400, 401, 403, 404, 422].includes(res.status)) {
          clearTeamCreateOperation(window.sessionStorage, owner, operation.requestId);
          setPendingCreate(null);
        }
        setError(getApiErrorMessage(data, t("errors.createTeamFailed")));
      }
    } catch {
      setError(t("teams.createOutcomeUnknown"));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasWechat || submitting.current || pendingCreate || storageBlocked || !userId.current) return;
    const activityType = formData.activityType;
    if (!activityType || selectedLocation?.id !== formData.locationId || !isActivityType(activityType)) {
      setError(t("errors.createTeamFailed"));
      return;
    }
    let operation: TeamCreateOperation;
    try {
      operation = newTeamCreateOperation({
        ...createTeamPayload(formData, activityType), requestId: crypto.randomUUID(),
      });
    } catch {
      setError(t("errors.createTeamFailed"));
      return;
    }
    try {
      saveTeamCreateOperation(window.sessionStorage, userId.current, operation);
      savedRecord.current = JSON.stringify(operation);
    } catch {
      setError(t("teams.createStorageUnavailable"));
      return;
    }
    setPendingCreate(operation);
    await sendOperation(operation);
  };

  const reconcileCreate = async () => {
    const owner = userId.current;
    if (!owner || submitting.current || !window.confirm(t("teams.discardCheckedCreateConfirm"))) return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      const current = await refreshCurrentUser();
      if (!mounted.current || userId.current !== owner) return;
      if (current?.id !== owner) { setSessionFailed(true); return; }
      discardTeamCreateRecord(window.sessionStorage, owner, savedRecord.current);
      savedRecord.current = null;
      setPendingCreate(null);
      setStorageBlocked(false);
      setError("");
    } catch {
      setError(t("teams.createStorageUnavailable"));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    t,
    pendingCreate,
    storageBlocked,
    reconcileCreate,
    retryCreate: () => pendingCreate && sendOperation(pendingCreate, true),
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
    contactSaved: () => setHasWechat(true),
    isSubmitting,
    sessionFailed,
    error: storageBlocked ? t("teams.createStorageUnavailable") : error,
    orderedActivityTypes,
    handleChange,
    handleLocationChange,
    handleSubmit,
  };
}
