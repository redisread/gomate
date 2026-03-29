"use client";

import * as React from "react";
import { ArrowLeft, Clock, Users, AlertCircle, Loader2, ArrowRight, Pencil } from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import type { Team, Location } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

interface EditTeamClientProps {
  teamId: string;
}

export function EditTeamClient({ teamId }: EditTeamClientProps) {
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
    requirements: "",
  });

  React.useEffect(() => {
    (async () => {
      const u = await fetchCurrentUser(`/login?redirect=${encodeURIComponent(`/teams/${teamId}/edit`)}`);
      if (!u) return;
      setIsAuthenticated(true);

      try {
        const res = await fetchAPI(`/api/teams/${teamId}`);
        if (res.status === 404) {
          setError("队伍不存在");
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (data.success && data.team) {
          const t = data.team as Team;
          if (t.leader?.id !== u.id) {
            setError("只有队长可以编辑队伍");
            setIsLoading(false);
            return;
          }
          setIsLeader(true);
          setTeam(t);
          setLocation((t as any).location || null);

          const startTime = new Date((t as any).startTime || t.date);
          const timeStr = `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`;

          setFormData({
            title: t.title || "",
            time: t.time || timeStr,
            durationMin: String(t.durationMin || 240),
            maxMembers: String(t.maxMembers || ""),
            description: t.description || "",
            requirements: Array.isArray(t.requirements) ? t.requirements.join("\n") : "",
          });
        } else {
          setError("获取队伍信息失败");
        }
      } catch (err) {
        console.error("[EditTeam] 获取队伍详情失败:", err);
        setError("获取队伍信息失败");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [teamId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!formData.title.trim()) {
      setError("队伍名称不能为空");
      setIsSubmitting(false);
      return;
    }

    const maxMembersNum = parseInt(formData.maxMembers, 10);
    if (isNaN(maxMembersNum) || maxMembersNum < 2 || maxMembersNum > 50) {
      setError("人数限制需在 2-50 之间");
      setIsSubmitting(false);
      return;
    }

    if (team && maxMembersNum < team.currentMembers) {
      setError(`人数上限不能低于当前成员数（${team.currentMembers} 人）`);
      setIsSubmitting(false);
      return;
    }

    try {
      const reqList = formData.requirements.split("\n").map((s) => s.trim()).filter(Boolean);
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
        setError(data.error || "保存失败，请稍后重试");
        setIsSubmitting(false);
      }
    } catch {
      setError("保存失败，请稍后重试");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#FDFAF6" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#D97706" }} />
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isLeader || !team) {
    return (
      <main className="min-h-screen" style={{ background: "#FDFAF6" }}>
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
            style={{ background: "rgba(255,122,101,0.08)", color: "#c0392b", border: "1px solid rgba(255,122,101,0.20)" }}
          >
            <span className="text-base">⚠️</span>
            {error || "无权限编辑此队伍"}
          </div>
          <a href={`/teams/${teamId}`} className="mt-4 inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700">
            <ArrowLeft className="h-3.5 w-3.5" />
            返回队伍详情
          </a>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "#FDFAF6" }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <a
          href={`/teams/${teamId}`}
          className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors duration-150"
          style={{ color: "#8f7f6e" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#D97706"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#8f7f6e"; }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回队伍详情
        </a>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Pencil className="h-5 w-5" style={{ color: "#D97706" }} />
            <h1 className="text-2xl font-bold" style={{ color: "#1e1812" }}>
              编辑队伍
            </h1>
          </div>
          <p className="text-sm" style={{ color: "#8f7f6e" }}>
            修改队伍信息，让更多伙伴了解这次活动
          </p>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ background: "#fff", border: "1px solid #f0ebe3", boxShadow: "0 2px 16px rgba(30,24,18,0.06)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">

            <FormSection icon="✏️" label={copy.teams.formLabel.name} required>
              <input
                id="title"
                name="title"
                type="text"
                placeholder={copy.teams.formPlaceholder.name}
                value={formData.title}
                onChange={handleChange}
                required
                maxLength={60}
                className="w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none"
                style={{ background: "#fdfaf6", borderColor: "#e8e0d7", color: "#1e1812" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#D97706";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217,119,6,0.10)";
                  e.currentTarget.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e8e0d7";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "#fdfaf6";
                }}
              />
            </FormSection>

            <FormSection icon="📍" label={copy.teams.formLabel.location}>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-stone-100 border border-stone-200">
                <span className="text-sm text-stone-800">{location?.name || team.date}</span>
                {location && (
                  <a href={`/locations/${location.id}`} className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
                    查看详情 <ArrowRight className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                队伍创建后地点不可修改
              </p>
            </FormSection>

            <FormSection icon="📅" label={copy.teams.formLabel.date}>
              <div className="px-4 py-3 rounded-xl bg-stone-100 border border-stone-200">
                <span className="text-sm text-stone-800">{team.date}</span>
              </div>
              <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                队伍创建后日期不可修改
              </p>
            </FormSection>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormSection icon="⏰" label={copy.teams.formLabel.meetTime}>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#8f7f6e" }} />
                  <input
                    id="time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none"
                    style={{ background: "#fdfaf6", borderColor: "#e8e0d7", color: "#1e1812" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#D97706";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217,119,6,0.10)";
                      e.currentTarget.style.background = "#fff";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e8e0d7";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.background = "#fdfaf6";
                    }}
                  />
                </div>
              </FormSection>

              <FormSection icon="⌛" label={copy.teams.formLabel.duration}>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#8f7f6e" }} />
                  <select
                    id="durationMin"
                    name="durationMin"
                    value={formData.durationMin}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none appearance-none"
                    style={{ background: "#fdfaf6", borderColor: "#e8e0d7", color: "#1e1812" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#D97706";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217,119,6,0.10)";
                      e.currentTarget.style.background = "#fff";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e8e0d7";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.background = "#fdfaf6";
                    }}
                  >
                    {[120, 180, 240, 300, 360, 420, 480, 540, 600, 720].map((m) => (
                      <option key={m} value={m}>{m / 60} 小时</option>
                    ))}
                  </select>
                </div>
              </FormSection>
            </div>

            <FormSection icon="👥" label={copy.teams.formLabel.maxSize} required hint={`至少 ${team.currentMembers} 人（当前成员）`}>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#8f7f6e" }} />
                <input
                  id="maxMembers"
                  name="maxMembers"
                  type="number"
                  min={team.currentMembers}
                  max={50}
                  placeholder={copy.teams.formPlaceholder.maxSize}
                  value={formData.maxMembers}
                  onChange={handleChange}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none"
                  style={{ background: "#fdfaf6", borderColor: "#e8e0d7", color: "#1e1812" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#D97706";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217,119,6,0.10)";
                    e.currentTarget.style.background = "#fff";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e8e0d7";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.background = "#fdfaf6";
                  }}
                />
              </div>
              <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                当前已有 {team.currentMembers} 名成员，人数上限不能低于此数
              </p>
            </FormSection>

            <FormSection icon="📝" label={copy.teams.formLabel.description}>
              <textarea
                id="description"
                name="description"
                placeholder={copy.teams.formPlaceholder.description}
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none resize-none"
                style={{ background: "#fdfaf6", borderColor: "#e8e0d7", color: "#1e1812" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#D97706";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217,119,6,0.10)";
                  e.currentTarget.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e8e0d7";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "#fdfaf6";
                }}
              />
            </FormSection>

            <FormSection icon="📋" label="参与要求" hint="每行一条，将展示给申请者">
              <textarea
                id="requirements"
                name="requirements"
                placeholder="例如：需要有徒步经验&#10;自备充足饮用水&#10;穿着合适的徒步鞋"
                value={formData.requirements}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none resize-none"
                style={{ background: "#fdfaf6", borderColor: "#e8e0d7", color: "#1e1812" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#D97706";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217,119,6,0.10)";
                  e.currentTarget.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e8e0d7";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "#fdfaf6";
                }}
              />
            </FormSection>

            <div
              className="rounded-xl px-4 py-3.5 text-sm flex items-start gap-2.5"
              style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.15)" }}
            >
              <span className="text-base flex-shrink-0 mt-0.5">💡</span>
              <p style={{ color: "#92400E" }}>
                修改后的信息会立即生效，已申请的成员会看到更新后的内容。
              </p>
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
                style={{ background: "rgba(255,122,101,0.08)", color: "#c0392b", border: "1px solid rgba(255,122,101,0.20)" }}
              >
                <span className="text-base">⚠️</span>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.href = `/teams/${teamId}`}
                className="flex-1 py-3 rounded-xl border text-sm font-medium transition-all duration-150"
                style={{ borderColor: "#e8e0d7", color: "#4a3f35" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f5f0e8"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                {copy.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: isSubmitting ? "#D97706" : "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
                  boxShadow: isSubmitting ? "none" : "0 4px 18px rgba(217,119,6,0.35)",
                  flex: "2",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.transform = "translateY(-1px)";
                    el.style.boxShadow = "0 6px 24px rgba(217,119,6,0.45)";
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 4px 18px rgba(217,119,6,0.35)";
                }}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "保存中..." : "保存修改"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function FormSection({
  icon,
  label,
  required,
  hint,
  children,
}: {
  icon: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-base">{icon}</span>
        <label className="text-sm font-medium" style={{ color: "#4a3f35" }}>
          {label}
          {required && <span className="ml-0.5" style={{ color: "#ff7a65" }}>*</span>}
        </label>
        {hint && (
          <span className="text-xs ml-auto" style={{ color: "#c4b5a8" }}>{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}