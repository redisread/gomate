"use client";

import * as React from "react";
import {
  ArrowLeft,
  Clock,
  Users,
  Calendar,
  MapPin,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import type { Location, Route } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

/**
 * 创建队伍页 — 温暖引导风格
 * 分步感知 + 情感化文案 + 品牌色 focus 状态
 */
export function CreateTeamClient() {
  const { t } = useI18n(["teams", "errors", "common"]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [_selectedLocation, setSelectedLocation] = React.useState<Location | null>(null);
  const [_routes, setRoutes] = React.useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = React.useState<Route | null>(null);
  const [recommendedDuration, setRecommendedDuration] = React.useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [hasWechat, setHasWechat] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const durationManuallyEditedRef = React.useRef(false);

  // 获取默认日期/时间
  const now = new Date();
  const defaultDate = now.toISOString().split("T")[0];
  const futureTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const defaultTime = `${String(futureTime.getHours()).padStart(2, "0")}:${String(futureTime.getMinutes()).padStart(2, "0")}`;
  const defaultDuration = 240; // 4 小时默认值

  const [formData, setFormData] = React.useState({
    title: "",
    locationId: "",
    routeId: "",
    date: defaultDate,
    time: defaultTime,
    durationMin: "240",
    maxMembers: "",
    description: "",
  });

  React.useEffect(() => {
    (async () => {
      const u = await fetchCurrentUser(`/login?redirect=${encodeURIComponent("/teams/create")}`);
      if (!u) return;
      setIsAuthenticated(true);
      setHasWechat(!!(u.wechat));
    })();

    fetchAPI("/api/locations?pageSize=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLocations(data.locations || []);
      })
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const locId = params.get("locationId");
    if (locId) setFormData((prev) => ({ ...prev, locationId: locId }));
  }, []);

  // 当地点变化时，获取地点详情和路线列表
  React.useEffect(() => {
    if (!formData.locationId) {
      setSelectedLocation(null);
      setRoutes([]);
      setSelectedRoute(null);
      setRecommendedDuration(null);
      durationManuallyEditedRef.current = false;
      return;
    }

    // 获取地点详情（包含 routes）
    fetchAPI(`/api/locations/${formData.locationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.location) {
          const loc = data.location;
          setSelectedLocation(loc);
          setRoutes(loc.routes || []);
          durationManuallyEditedRef.current = false; // 新地点，重置手动编辑标记

          // 如果有路线，根据路线难度推荐时长
          if (loc.routes && loc.routes.length > 0) {
            // 默认选择第一条路线
            const firstRoute = loc.routes[0];
            setSelectedRoute(firstRoute);
            setFormData((prev) => ({ ...prev, routeId: firstRoute.id }));

            // 计算推荐时长
            const recommended = calculateRecommendedDuration(firstRoute);
            setRecommendedDuration(recommended);
            setFormData((prev) => ({ ...prev, durationMin: String(recommended) }));
          } else {
            // 无路线时，重置为默认值
            setRecommendedDuration(null);
            setFormData((prev) => ({ ...prev, durationMin: String(defaultDuration), routeId: "" }));
            setSelectedRoute(null);
          }
        }
      })
      .catch(() => {});
  }, [formData.locationId]);

  // 当路线变化时，重新计算推荐时长
  React.useEffect(() => {
    if (!selectedRoute) {
      durationManuallyEditedRef.current = false;
      return;
    }

    const recommended = calculateRecommendedDuration(selectedRoute);
    setRecommendedDuration(recommended);

    // 如果用户没有手动修改时长，则自动更新为推荐值
    if (!durationManuallyEditedRef.current) {
      setFormData((prev) => ({ ...prev, durationMin: String(recommended) }));
    }
  }, [selectedRoute?.id]);

  // 当用户手动修改时长时，标记为已手动编辑
  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    durationManuallyEditedRef.current = true;
    handleChange(e);
  };

  // 快捷设置时长
  const handleDurationQuickSelect = (minutes: number) => {
    durationManuallyEditedRef.current = true;
    setFormData((prev) => ({ ...prev, durationMin: String(minutes) }));
  };

  /**
   * 根据路线难度和时长推荐合适的活动时长（分钟）
   */
  const calculateRecommendedDuration = (route: Route): number => {
    // 优先使用 durationMin/durationMax（如果有）
    const routeWithDuration = route as Route & { durationMin?: number; durationMax?: number };
    if (routeWithDuration.durationMin && routeWithDuration.durationMax) {
      // 取平均值
      return Math.round((routeWithDuration.durationMin + routeWithDuration.durationMax) / 2);
    }
    if (routeWithDuration.durationMin) {
      return routeWithDuration.durationMin;
    }

    // 从 route.duration 解析（格式如 "2-3 小时" 或 "4 小时"）
    const durationStr = route.duration;
    if (durationStr) {
      const match = durationStr.match(/(\d+(?:\.\d+)?)\s*(-|~|至)\s*(\d+(?:\.\d+)?)\s*小时/);
      if (match) {
        const minHours = parseFloat(match[1]);
        const maxHours = parseFloat(match[3]);
        // 取平均值，转换为分钟
        return Math.round(((minHours + maxHours) / 2) * 60);
      }
      // 单一值格式
      const singleMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*小时/);
      if (singleMatch) {
        return Math.round(parseFloat(singleMatch[1]) * 60);
      }
    }

    // 根据难度推荐
    const difficultyDuration: Record<string, number> = {
      easy: 180,      // 简单：3 小时
      moderate: 300,  // 中等：5 小时
      hard: 420,      // 困难：7 小时
      expert: 600,    // 专家：10 小时
    };
    return difficultyDuration[route.difficulty] || 240;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetchAPI("/api/teams", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title,
          locationId: formData.locationId,
          routeId: formData.routeId || undefined,
          date: formData.date,
          time: formData.time,
          durationMin: parseInt(formData.durationMin, 10),
          maxMembers: parseInt(formData.maxMembers, 10),
          description: formData.description,
        }),
      });
      const data = await res.json();
      if (data.success && data.team?.id) {
        window.location.href = `/teams/${data.team.id}`;
      } else {
        setError(data.error || t("errors.createTeamFailed"));
        setIsSubmitting(false);
      }
    } catch {
      setError(t("errors.createTeamFailed"));
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#D97706" }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* 返回链接 */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-sm mb-8 text-muted-foreground hover:text-primary transition-colors duration-150"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("common.back")}
        </a>

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5" style={{ color: "#D97706" }} />
            <h1 className="text-2xl font-bold text-foreground">
              {t("teams.createTitle")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("teams.createSubtitle")}
          </p>
        </div>

        {/* 微信号提醒 */}
        {!hasWechat && (
          <div
            className="mb-6 rounded-2xl p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1 text-amber-800 dark:text-amber-300">
                  {t("teams.wechatRequiredTitle")}
                </p>
                <p className="text-sm mb-3 text-amber-700 dark:text-amber-400">
                  {t("teams.wechatRequiredDesc")}
                </p>
                <a href="/profile/edit">
                  <button
                    className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 bg-card border border-amber-300/50 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 hover:bg-accent"
                  >
                    {t("teams.fillWechatBtn")}
                  </button>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 表单卡片 */}
        <div
          className={`rounded-2xl p-6 sm:p-8 card-base ${!hasWechat ? "opacity-50 pointer-events-none" : ""}`}
        >
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* 队伍标题 */}
            <FormSection icon="✏️" label={t("teams.formLabel.name")} required>
              <input
                id="title"
                name="title"
                type="text"
                placeholder={t("teams.formPlaceholder.name")}
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
              />
            </FormSection>

            {/* 目的地 */}
            <FormSection icon="📍" label={t("teams.formLabel.location")} required>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
                <select
                  id="locationId"
                  name="locationId"
                  value={formData.locationId}
                  onChange={handleChange}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border bg-muted text-foreground text-sm transition-all duration-200 focus:outline-none appearance-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                >
                  <option value="">{t("teams.formPlaceholder.location")}</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </FormSection>

            {/* 路线选择（暂时隐藏） */}

            {/* 日期 + 时间 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormSection icon="📅" label={t("teams.formLabel.date")} required>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    min={defaultDate}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border bg-muted text-foreground text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                  />
                </div>
              </FormSection>

              <FormSection icon="⏰" label={t("teams.formLabel.meetTime")} required>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
                  <input
                    id="time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border bg-muted text-foreground text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                  />
                </div>
              </FormSection>
            </div>

            {/* 日期不可修改提示 */}
            <p className="text-xs flex items-center gap-1.5 -mt-2 text-amber-600 dark:text-amber-500">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {t("teams.dateImmutableTip")}
            </p>

            {/* 时长 + 最大人数 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormSection
                icon="⌛"
                label={t("teams.formLabel.duration")}
                required
                hint={recommendedDuration ? t("teams.durationRecommendHint", { hours: Math.round(recommendedDuration / 60) }) : t("teams.durationDefaultHint")}
              >
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
                  {recommendedDuration && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{t("teams.durationRecommendLabel")}</span>
                    </div>
                  )}
                  <select
                    id="durationMin"
                    name="durationMin"
                    value={formData.durationMin}
                    onChange={handleDurationChange}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border bg-muted text-foreground text-sm transition-all duration-200 focus:outline-none appearance-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                  >
                    {getDurationOptions(t).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} {recommendedDuration === opt.value ? `（${t("teams.durationRecommended")}）` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {/* 快捷选项按钮组 */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <QuickDurationButton
                    label={t("teams.durationHalfDay")}
                    minutes={240}
                    currentValue={formData.durationMin}
                    onClick={() => handleDurationQuickSelect(240)}
                  />
                  <QuickDurationButton
                    label={t("teams.durationFullDay")}
                    minutes={480}
                    currentValue={formData.durationMin}
                    onClick={() => handleDurationQuickSelect(480)}
                  />
                  <QuickDurationButton
                    label={t("teams.durationTwoDays")}
                    minutes={1200}
                    currentValue={formData.durationMin}
                    onClick={() => handleDurationQuickSelect(1200)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const select = document.getElementById("durationMin") as HTMLSelectElement;
                      if (select) {
                        select.focus();
                        select.click();
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    {t("teams.durationCustom")}
                  </button>
                </div>
              </FormSection>

              <FormSection icon="👥" label={t("teams.formLabel.maxSize")} required hint={t("teams.maxSizeHint")}>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
                  <input
                    id="maxMembers"
                    name="maxMembers"
                    type="number"
                    min={2}
                    max={50}
                    placeholder={t("teams.formPlaceholder.maxSize")}
                    value={formData.maxMembers}
                    onChange={handleChange}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
                  />
                </div>
              </FormSection>
            </div>

            {/* 队伍描述 */}
            <FormSection icon="📝" label={t("teams.formLabel.description")} required hint={t("teams.descriptionHint")}>
              <textarea
                id="description"
                name="description"
                placeholder={t("teams.formPlaceholder.description")}
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-3 rounded-xl border bg-muted text-foreground placeholder:text-muted-foreground text-sm transition-all duration-200 focus:outline-none resize-none focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10"
              />
            </FormSection>

            {/* 温馨提示 */}
            <div
              className="rounded-xl px-4 py-3.5 text-sm flex items-start gap-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40"
            >
              <span className="text-base flex-shrink-0 mt-0.5">💡</span>
              <p className="text-amber-800 dark:text-amber-300">{t("teams.createTip")}</p>
            </div>

            {/* 错误提示 */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-red-400 border border-destructive/20 dark:border-red-500/30"
              >
                <span className="text-base">⚠️</span>
                {error}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex-1 py-3 rounded-xl border text-sm font-medium transition-all duration-150 border-border text-muted-foreground hover:bg-muted"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !hasWechat}
                className="flex-2 flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: isSubmitting || !hasWechat ? "#D97706" : "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
                  boxShadow: isSubmitting || !hasWechat ? "none" : "0 4px 18px rgba(217,119,6,0.35)",
                  flex: "2",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting && hasWechat) {
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
                {!hasWechat
                  ? t("teams.wechatRequiredBtn")
                  : isSubmitting
                  ? t("teams.createBtnLoading")
                  : t("teams.createBtn")}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </main>
  );
}

/**
 * Build duration option labels with translation
 */
function getDurationOptions(t: (key: any, vars?: Record<string, string | number>) => string) {
  return [
    { value: 60, label: t("teams.duration1h") },
    { value: 90, label: t("teams.duration1_5h") },
    { value: 120, label: t("teams.duration2h") },
    { value: 180, label: t("teams.duration3h") },
    { value: 240, label: t("teams.duration4h") },
    { value: 300, label: t("teams.duration5h") },
    { value: 360, label: t("teams.duration6h") },
    { value: 420, label: t("teams.duration7h") },
    { value: 480, label: t("teams.duration8h") },
    { value: 540, label: t("teams.duration9h") },
    { value: 600, label: t("teams.duration10h") },
    { value: 720, label: t("teams.duration12h") },
    { value: 900, label: t("teams.duration15h") },
    { value: 1200, label: t("teams.duration20h") },
  ];
}

/* ── 快捷时长按钮 ── */
function QuickDurationButton({
  label,
  minutes,
  currentValue,
  onClick,
}: {
  label: string;
  minutes: number;
  currentValue: string;
  onClick: () => void;
}) {
  const isActive = String(minutes) === currentValue;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 border ${
        isActive
          ? "bg-primary/10 border-primary text-primary"
          : "bg-muted border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

/* ── 表单字段区块 ── */
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
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
        {hint && (
          <span className="text-xs ml-auto text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
