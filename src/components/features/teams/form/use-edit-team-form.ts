import type { ApiResult } from "@/contracts/http-responses";
import type { TeamResponse } from "@/contracts/team-api";
import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, fetchCurrentUser, refreshCurrentUser, getApiErrorMessage } from "@/lib/api";
import type { Team } from "@/lib/types";
import { editTeamPayload, teamToFormData } from "./team-form-data";
import type { EditTeamFormData } from "./team-form-data";

export function useEditTeamForm(teamId: string) {
  const { t } = useI18n(["teams", "errors", "common", "enums"]);
  const [team, setTeam] = React.useState<Team | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sessionFailed, setSessionFailed] = React.useState(false);
  const [error, setError] = React.useState("");
  const [conflict, setConflict] = React.useState(false);
  const ownerId = React.useRef<string | null>(null);
  const submitting = React.useRef(false);

  const [formData, setFormData] = React.useState<EditTeamFormData>({
    title: "",
    startDateInput: "",
    startClockInput: "",
    durationMinutes: "240",
    maxParticipants: "",
    description: "",
    meetingPoint: "",
    requirements: [],
    activityType: "",
  });

  React.useEffect(() => {
    (async () => {
      const u = await fetchCurrentUser(
        `/login?redirect=${encodeURIComponent(`/teams/${teamId}/edit`)}`,
      );
      if (!u) return;
      ownerId.current = u.id;
      setIsAuthenticated(true);

      try {
        const res = await fetchAPI(`/teams/${teamId}`);
        if (res.status === 404) {
          setError(t("errors.teamNotFound"));
          setIsLoading(false);
          return;
        }
        const data = await res.json<ApiResult<TeamResponse>>();
        if (data.success && data.team) {
          const loadedTeam = data.team;
          if (loadedTeam.leaderId !== u.id) {
            setError(t("errors.noPermission"));
            setIsLoading(false);
            return;
          }
          setTeam(loadedTeam);

          setFormData(teamToFormData(loadedTeam));
        } else {
          setError(t("errors.editTeamInfoFailed"));
        }
      } catch {
        setError(t("errors.editTeamInfoFailed"));
      } finally {
        setIsLoading(false);
      }
    })().catch(() => setSessionFailed(true));
  }, [teamId, t]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addRequirement = () => {
    if (formData.requirements.length < 10) {
      setFormData((prev) => ({
        ...prev,
        requirements: [...prev.requirements, ""],
      }));
    }
  };

  const removeRequirement = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  const updateRequirement = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r, i) => (i === index ? value : r)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || submitting.current || conflict) return;
    submitting.current = true;
    setIsSubmitting(true);
    setError("");

    if (!formData.title.trim()) {
      setError(t("errors.teamNameEmpty"));
      setIsSubmitting(false);
      submitting.current = false;
      return;
    }

    const maxParticipants = parseInt(formData.maxParticipants, 10);
    if (isNaN(maxParticipants) || maxParticipants < 1 || maxParticipants > 49) {
      setError(t("errors.maxMembersRange"));
      setIsSubmitting(false);
      submitting.current = false;
      return;
    }

    if (team && maxParticipants < team.activeParticipantCount) {
      setError(
        t("errors.maxMembersBelowCurrent", {
          current: team.activeParticipantCount,
        }),
      );
      setIsSubmitting(false);
      submitting.current = false;
      return;
    }

    try {
      const res = await fetchAPI(`/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editTeamPayload(formData, team.activityType), expectedVersion: team.version }),
      });
      const data = await res.json<ApiResult<TeamResponse>>();
      if (data.success) {
        window.location.href = `/teams/${teamId}`;
      } else {
        if (res.status === 409) setConflict(true);
        setError(res.status === 409 ? t("teams.editConflict") : getApiErrorMessage(data, t("errors.editTeamSaveFailed")));
        setIsSubmitting(false);
        submitting.current = false;
      }
    } catch {
      setError(t("errors.editTeamSaveFailed"));
      setIsSubmitting(false);
      submitting.current = false;
    }
  };

  const loadLatest = async () => {
    if (submitting.current || !window.confirm(t("teams.replaceEditsConfirm"))) return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      const current = await refreshCurrentUser();
      if (!current || current.id !== ownerId.current) {
        setSessionFailed(true);
        return;
      }
      const res = await fetchAPI(`/teams/${teamId}`);
      const data = await res.json<ApiResult<TeamResponse>>();
      if (!data.success || !data.team || data.team.leaderId !== current.id) {
        setError(t("errors.editTeamInfoFailed"));
        return;
      }
      setTeam(data.team);
      setFormData(teamToFormData(data.team));
      setConflict(false);
      setError("");
    } catch {
      setError(t("errors.editTeamInfoFailed"));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    t,
    conflict,
    loadLatest,
    team,
    isLoading,
    isAuthenticated,
    isSubmitting,
    sessionFailed,
    error,
    formData,
    handleChange,
    addRequirement,
    removeRequirement,
    updateRequirement,
    handleSubmit,
  };
}
