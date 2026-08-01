"use client";

import * as React from "react";
import { ArrowLeft, Clock, Users, AlertCircle, Loader2, ArrowRight, Pencil } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import type { Team, Location } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { FieldGroup } from "@/components/ui/field-group";
import { SubmitButton } from "@/components/ui/submit-button";
import { Footer } from "@/components/layout/footer";
import { TeamActionbookForm } from "./team-detail/team-actionbook-form";

interface EditTeamClientProps {
  teamId: string;
}

export function EditTeamClient({ teamId }: EditTeamClientProps) {
  const { t } = useI18n(["teams", "errors", "common"]);
  const [team, setTeam] = React.useState<Team | null>(null);
  const [location, setLocation] = React.useState<Location | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [isLeader, setIsLeader] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  const [formData, setFormData] = React.useState({
    title: "",
    time: "",
    durationMin: "240",
    maxMembers: "",
    description: "",
    requirements: [] as string[],
  });

  React.useEffect(() => {
    (async () => {
      const u = await fetchCurrentUser(`/login?redirect=${encodeURIComponent(`/teams/${teamId}/edit`)}`);
      if (!u) return;
      setIsAuthenticated(true);

      try {
        const res = await fetchAPI(`/api/teams/${teamId}`);
        if (res.status === 404) {
          setError(t("errors.teamNotFound"));
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (data.success && data.team) {
          const t2 = data.team as Team;
          if (t2.leader?.id !== u.id) {
            setError(t("errors.noPermission"));
            setIsLoading(false);
            return;
          }
          setIsLeader(true);
          setTeam(t2);
          setLocation(t2.location || null);

          const startTime = new Date(t2.startTime || t2.date);
          const timeStr = `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`;

          setFormData({
            title: t2.title || "",
            time: t2.time || timeStr,
            durationMin: String(t2.durationMin || 240),
            maxMembers: String(t2.maxMembers || ""),
            description: t2.description || "",
            requirements: Array.isArray(t2.requirements) ? t2.requirements : [],
          });
        } else {
          setError(t("errors.editTeamInfoFailed"));
        }
      } catch (err) {
        console.error("[EditTeam] 获取队伍详情失败:", err);
        setError(t("errors.editTeamInfoFailed"));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [teamId, t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addRequirement = () => {
    if (formData.requirements.length < 10) {
      setFormData((prev) => ({ ...prev, requirements: [...prev.requirements, ""] }));
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
    setIsSubmitting(true);
    setError("");

    if (!formData.title.trim()) {
      setError(t("errors.teamNameEmpty"));
      setIsSubmitting(false);
      return;
    }

    const maxMembersNum = parseInt(formData.maxMembers, 10);
    if (isNaN(maxMembersNum) || maxMembersNum < 2 || maxMembersNum > 50) {
      setError(t("errors.maxMembersRange"));
      setIsSubmitting(false);
      return;
    }

    if (team && maxMembersNum < team.currentMembers) {
      setError(t("errors.maxMembersBelowCurrent", { current: team.currentMembers }));
      setIsSubmitting(false);
      return;
    }

    try {
      const reqList = formData.requirements.map((s) => s.trim()).filter(Boolean);
      const res = await fetchAPI(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          maxMembers: maxMembersNum,
          time: formData.time,
          durationMin: parseInt(formData.durationMin, 10) || 240,
          requirements: reqList,
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = `/teams/${teamId}`;
      } else {
        setError(data.error || t("errors.editTeamSaveFailed"));
        setIsSubmitting(false);
      }
    } catch {
      setError(t("errors.editTeamSaveFailed"));
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary)" }} />
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isLeader || !team) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-red-400 border border-destructive/20 dark:border-red-500/30"
          >
            <span className="text-base">⚠️</span>
            {error || t("errors.editNoPermission")}
          </div>
          <a href={`/teams/${teamId}`} className="mt-4 inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("teams.backToTeamDetail")}
          </a>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <a
          href={`/teams/${teamId}`}
          className="inline-flex items-center gap-1.5 text-sm mb-8 text-muted-foreground hover:text-primary transition-colors duration-150"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("teams.backToTeamDetail")}
        </a>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Pencil className="h-5 w-5" style={{ color: "var(--primary)" }} />
            <h1 className="text-2xl font-bold text-foreground">
              {t("teams.editTitle")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("teams.editSubtitle")}
          </p>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8 card-base"
        >
          <form onSubmit={handleSubmit} className="space-y-6">

            <FieldGroup icon="✏️" label={t("teams.formLabel.name")} required>
              <input
                id="title"
                name="title"
                type="text"
                placeholder={t("teams.formPlaceholder.name")}
                value={formData.title}
                onChange={handleChange}
                required
                maxLength={60}
                className="w-full px-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
              />
            </FieldGroup>

            <FieldGroup icon="📍" label={t("teams.formLabel.location")}>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted border border-border">
                <span className="text-sm text-foreground">{location?.name || team.date}</span>
                {location && (
                  <a href={`/locations/${location.id}`} className="text-xs text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 flex items-center gap-1">
                    {t("teams.viewDetailShort")} <ArrowRight className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                {t("teams.editLocationLocked")}
              </p>
            </FieldGroup>

            <FieldGroup icon="📅" label={t("teams.formLabel.date")}>
              <div className="px-4 py-3 rounded-xl bg-muted border border-border">
                <span className="text-sm text-foreground">{team.date}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                {t("teams.editDateLocked")}
              </p>
            </FieldGroup>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup icon="⏰" label={t("teams.formLabel.meetTime")}>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
                  <input
                    id="time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border bg-muted text-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                  />
                </div>
              </FieldGroup>

              <FieldGroup icon="⌛" label={t("teams.formLabel.duration")}>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
                  <select
                    id="durationMin"
                    name="durationMin"
                    value={formData.durationMin}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border bg-muted text-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none appearance-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                  >
                    {[120, 180, 240, 300, 360, 420, 480, 540, 600, 720].map((m) => (
                      <option key={m} value={m}>{t("teams.editDurationHours", { hours: m / 60 })}</option>
                    ))}
                  </select>
                </div>
              </FieldGroup>
            </div>

            <FieldGroup icon="👥" label={t("teams.formLabel.maxSize")} required hint={t("teams.editMaxSizeHint", { current: team.currentMembers })}>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                <input
                  id="maxMembers"
                  name="maxMembers"
                  type="number"
                  min={team.currentMembers}
                  max={50}
                  placeholder={t("teams.formPlaceholder.maxSize")}
                  value={formData.maxMembers}
                  onChange={handleChange}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                {t("teams.editMaxMembersTip", { current: team.currentMembers })}
              </p>
            </FieldGroup>

            <FieldGroup icon="📝" label={t("teams.formLabel.description")}>
              <textarea
                id="description"
                name="description"
                placeholder={t("teams.formPlaceholder.description")}
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none resize-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
              />
            </FieldGroup>

            <FieldGroup icon="📋" label={t("teams.editRequirementsLabel")} hint={t("teams.editRequirementsHint")}>
              <ul className="space-y-2">
                {formData.requirements.map((req, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                    >
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={req}
                      onChange={(e) => updateRequirement(i, e.target.value)}
                      placeholder={t("teams.editRequirementPlaceholder")}
                      maxLength={100}
                      className="flex-1 px-3 py-2 rounded-lg border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10"
                    />
                    <button
                      type="button"
                      onClick={() => removeRequirement(i)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 text-stone-400 dark:text-stone-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              {formData.requirements.length < 10 && (
                <button
                  type="button"
                  onClick={addRequirement}
                  className="w-full mt-2 py-2.5 rounded-lg border text-sm font-medium transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 flex items-center justify-center gap-1.5 border-border text-muted-foreground hover:bg-muted hover:border-primary hover:text-primary"
                >
                  <span>{t("teams.editAddRequirement")}</span>
                </button>
              )}
              {formData.requirements.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" />
                  {t("teams.editRequirementsEmptyTip")}
                </p>
              )}
            </FieldGroup>

            <div
              className="rounded-xl px-4 py-3.5 text-sm flex items-start gap-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40"
            >
              <span className="text-base flex-shrink-0 mt-0.5">💡</span>
              <p className="text-amber-800 dark:text-amber-300">
                {t("teams.editSaveTip")}
              </p>
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-red-400 border border-destructive/20 dark:border-red-500/30"
              >
                <span className="text-base">⚠️</span>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.href = `/teams/${teamId}`}
                className="flex-1 py-3 rounded-xl border text-sm font-medium transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 border-border text-muted-foreground hover:bg-muted"
              >
                {t("common.cancel")}
              </button>
              <SubmitButton
                loading={isSubmitting}
                loadingText={t("common.saving")}
                className="flex-2"
              >
                {isSubmitting ? t("common.saving") : t("teams.editSaveBtn")}
              </SubmitButton>
            </div>
          </form>
        </div>

        {/* task #166 P0-A T3：行动本编辑（独立保存，不与基本信息表单混淆） */}
        <div className="mt-6">
          <TeamActionbookForm
            teamId={teamId}
            initialChecklist={team.checklist}
            isLeader={isLeader}
          />
        </div>
      </div>

      <Footer />
    </main>
  );
}
