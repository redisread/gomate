import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, fetchCurrentUser, getApiErrorMessage } from "@/lib/api";
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
      setIsAuthenticated(true);

      try {
        const res = await fetchAPI(`/teams/${teamId}`);
        if (res.status === 404) {
          setError(t("errors.teamNotFound"));
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (data.success && data.team) {
          const loadedTeam = data.team as Team;
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
    if (!team) return;
    setIsSubmitting(true);
    setError("");

    if (!formData.title.trim()) {
      setError(t("errors.teamNameEmpty"));
      setIsSubmitting(false);
      return;
    }

    const maxParticipants = parseInt(formData.maxParticipants, 10);
    if (isNaN(maxParticipants) || maxParticipants < 1 || maxParticipants > 49) {
      setError(t("errors.maxMembersRange"));
      setIsSubmitting(false);
      return;
    }

    if (team && maxParticipants < team.activeParticipantCount) {
      setError(
        t("errors.maxMembersBelowCurrent", {
          current: team.activeParticipantCount,
        }),
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetchAPI(`/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editTeamPayload(formData, team.activityType)),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = `/teams/${teamId}`;
      } else {
        setError(getApiErrorMessage(data, t("errors.editTeamSaveFailed")));
        setIsSubmitting(false);
      }
    } catch {
      setError(t("errors.editTeamSaveFailed"));
      setIsSubmitting(false);
    }
  };

  return {
    t,
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
