"use client";

/**
 * 地点编辑页 · 极致优化版
 *
 * 整合8大Agent成果：
 * - 封面图拖拽上传（CoverImageUpload）
 * - 季节视觉化选择（SeasonPicker）
 * - 进度指示器（EditProgressBar）
 * - 城市搜索下拉（CitySelect）
 * - 自动草稿保存（useAutoDraft）
 * - 粘性底部操作栏（StickyActionBar）
 * - 字段实时校验（useFormValidation）
 * - 桌面端双栏布局 + 实时预览
 * - 骨架屏加载态
 */

import * as React from "react";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  FileText,
  Image as ImageIcon,
  Settings,
  Eye,
  EyeOff,
  Navigation,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI, apiPut } from "@/lib/api";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CoverImageUpload } from "@/components/ui/cover-image-upload";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import { SeasonPicker, EditProgressBar } from "@/components/ui/season-picker";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { CitySelect } from "@/components/ui/city-select";
import { useAutoDraft } from "@/hooks/useAutoDraft";
import { useFormValidation } from "@/hooks/useFormValidation";
import { cn } from "@/lib/utils";
import type { Location, City } from "@/lib/types";

/* ================================================================
   类型与常量
   ================================================================ */

interface LocationEditClientProps {
  locationId: string;
}

interface FormData {
  name: string;
  subtitle: string;
  description: string;
  address: string;
  cityId: string;
  bestSeason: string[];
  coverImage: string;
  images: string[];
  lat: number | string;
  lng: number | string;
}

const DEFAULT_FORM: FormData = {
  name: "",
  subtitle: "",
  description: "",
  address: "",
  cityId: "",
  bestSeason: [],
  coverImage: "",
  images: [],
  lat: "",
  lng: "",
};

/** 字段校验规则 */
const VALIDATION_RULES: Record<string, (v: string) => string | undefined> = {
  name: (v) => {
    if (!v.trim()) return copy.admin.validationNameRequired;
    if (v.trim().length > 50) return copy.admin.validationNameTooLong;
  },
  description: (v) => {
    if (!v.trim()) return copy.admin.validationDescRequired;
    if (v.trim().length < 10) return copy.admin.validationDescTooShort;
  },
  cityId: (v) => {
    if (!v) return copy.admin.validationCityRequired;
  },
  lat: (v) => {
    if (v === "" || v === undefined) return undefined; // 可选
    const n = parseFloat(String(v));
    if (isNaN(n) || n < -90 || n > 90) return copy.admin.validationLatInvalid;
  },
  lng: (v) => {
    if (v === "" || v === undefined) return undefined; // 可选
    const n = parseFloat(String(v));
    if (isNaN(n) || n < -180 || n > 180) return copy.admin.validationLngInvalid;
  },
};

/* ================================================================
   骨架屏组件
   ================================================================ */

function EditSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "#FAF7F4" }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        {/* 返回 + 标题 */}
        <div className="h-5 w-24 bg-stone-200 rounded mb-6" />
        <div className="h-7 w-48 bg-stone-200 rounded mb-8" />
        {/* 进度条骨架 */}
        <div className="h-10 bg-stone-100 rounded-2xl mb-8" />
        {/* 内容骨架 */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
          <div className="space-y-4">
            {[180, 220, 160].map((h, i) => (
              <div key={i} className="rounded-2xl bg-white border border-stone-100" style={{ height: h }} />
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="rounded-2xl bg-white border border-stone-100 h-80" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   章节卡片容器
   ================================================================ */

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}

function SectionCard({ icon, title, badge, children, defaultOpen = true, collapsible = false }: SectionCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <button
        type="button"
        onClick={() => collapsible && setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-5 py-4 text-left",
          collapsible && "hover:bg-stone-50/60 transition-colors cursor-pointer",
          !collapsible && "cursor-default"
        )}
      >
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(217,119,6,0.1)" }}>
          <span style={{ color: "#D97706" }}>{icon}</span>
        </span>
        <span className="text-sm font-semibold text-stone-800 flex-1">{title}</span>
        {badge && <span>{badge}</span>}
        {collapsible && (
          <svg
            className={cn("h-4 w-4 text-stone-400 transition-transform duration-200", open && "rotate-180")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-stone-50">
          <div className="pt-4 space-y-4">{children}</div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   字段组件
   ================================================================ */

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold" style={{ color: "#5C4033" }}>
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
          </svg>
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-xs text-stone-400">{hint}</p>
      )}
    </div>
  );
}

/** 通用输入框样式 */
function styledInput(hasError?: boolean) {
  return cn(
    "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-150",
    "border focus:ring-2",
    hasError
      ? "border-red-300 focus:ring-red-200 focus:border-red-400"
      : "border-stone-200 focus:ring-amber-200 focus:border-amber-400"
  );
}

/* ================================================================
   实时预览组件（桌面端右栏）
   ================================================================ */

interface PreviewPanelProps {
  data: FormData;
  cityName: string;
}

function PreviewPanel({ data, cityName }: PreviewPanelProps) {
  const seasonEmojis: Record<string, string> = {
    spring: "🌸", summer: "☀️", autumn: "🍂", winter: "❄️",
  };

  return (
    <div className="sticky top-20">
      <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {/* 预览标题 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-50">
          <Eye className="h-4 w-4" style={{ color: "#D97706" }} />
          <span className="text-xs font-semibold text-stone-600">实时预览</span>
        </div>

        {/* 封面图 */}
        <div className="w-full bg-stone-100" style={{ aspectRatio: "16/9" }}>
          {data.coverImage ? (
            <img src={data.coverImage} alt="封面预览" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-stone-300" />
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* 名称 */}
          <div>
            <h3 className="font-bold text-stone-900 text-base leading-snug">
              {data.name || <span className="text-stone-300">地点名称</span>}
            </h3>
            {data.subtitle && (
              <p className="text-sm text-stone-500 mt-0.5">{data.subtitle}</p>
            )}
          </div>

          {/* 城市 + 地址 */}
          {(cityName || data.address) && (
            <div className="flex items-start gap-1.5 text-xs text-stone-500">
              <MapPin className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
              <span>{[cityName, data.address].filter(Boolean).join(" · ")}</span>
            </div>
          )}

          {/* 描述 */}
          {data.description && (
            <p className="text-xs text-stone-500 leading-relaxed line-clamp-3">
              {data.description}
            </p>
          )}

          {/* 季节 */}
          {data.bestSeason.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.bestSeason.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-100">
                  {seasonEmojis[s]} {copy.admin[`season${s.charAt(0).toUpperCase() + s.slice(1)}` as keyof typeof copy.admin] as string}
                </span>
              ))}
            </div>
          )}

          {/* 坐标 */}
          {(data.lat || data.lng) && (
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <Navigation className="h-3 w-3" />
              <span>{data.lat}, {data.lng}</span>
            </div>
          )}
        </div>
      </div>

      {/* 预览提示 */}
      <p className="text-xs text-stone-400 text-center mt-2">
        编辑时自动同步预览
      </p>
    </div>
  );
}

/* ================================================================
   主组件
   ================================================================ */

export function LocationEditClient({ locationId }: LocationEditClientProps) {
  const [location, setLocation] = React.useState<Location | null>(null);
  const [cities, setCities] = React.useState<City[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDraftBanner, setShowDraftBanner] = React.useState(false);
  const [pendingDraft, setPendingDraft] = React.useState<FormData | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);

  const [formData, setFormData] = React.useState<FormData>(DEFAULT_FORM);

  // 字段校验
  const { errors, touch, validate, reset: resetValidation } = useFormValidation(VALIDATION_RULES);

  // 自动草稿保存
  const draftKey = `location-edit-draft-${locationId}`;
  const { lastSaved, restoreDraft, clearDraft } = useAutoDraft(draftKey, formData);

  // 前端权限守卫
  React.useEffect(() => {
    fetchAPI("/auth/get-session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.role !== "admin") window.location.href = "/";
      })
      .catch(() => { window.location.href = "/"; });
  }, []);

  // 并发加载数据
  React.useEffect(() => {
    Promise.all([
      fetchAPI(`/api/locations/${locationId}`).then((r) => r.json()),
      fetchAPI("/api/cities").then((r) => r.json()),
    ])
      .then(([locData, cityData]) => {
        if (locData.location) {
          const loc: Location = locData.location;
          setLocation(loc);

          const serverData: FormData = {
            name: loc.name,
            subtitle: loc.subtitle ?? "",
            description: loc.description,
            address: loc.address ?? "",
            cityId: loc.cityId,
            bestSeason: loc.bestSeason ?? [],
            coverImage: loc.coverImage,
            images: loc.images ?? [],
            lat: loc.coordinates?.lat ?? "",
            lng: loc.coordinates?.lng ?? "",
          };

          // 检查是否有未过期草稿
          const draft = restoreDraft();
          if (draft && JSON.stringify(draft) !== JSON.stringify(serverData)) {
            setPendingDraft(draft);
            setShowDraftBanner(true);
            setFormData(serverData); // 先用服务器数据，等用户决定
          } else {
            setFormData(serverData);
          }
        }
        if (cityData.cities) setCities(cityData.cities);
      })
      .catch(() => {
        setSaveMessage({ type: "error", text: "加载地点数据失败，请刷新重试" });
      })
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // 通用字段更新
  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveMessage(null);
    // 触发实时校验（字符串字段）
    if (typeof value === "string" && VALIDATION_RULES[key]) {
      touch(key, value);
    }
  };

  // 保存
  const handleSave = async () => {
    // 全量校验
    const validationData: Record<string, string> = {
      name: formData.name,
      description: formData.description,
      cityId: formData.cityId,
      lat: String(formData.lat),
      lng: String(formData.lng),
    };
    if (!validate(validationData)) return;

    if (!location) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await apiPut("/api/locations", {
        id: location.id,
        name: formData.name,
        subtitle: formData.subtitle || undefined,
        description: formData.description,
        address: formData.address || undefined,
        cityId: formData.cityId,
        bestSeason: formData.bestSeason,
        coverImage: formData.coverImage,
        images: formData.images,
        coordinates: {
          lat: parseFloat(String(formData.lat)) || 0,
          lng: parseFloat(String(formData.lng)) || 0,
        },
      });

      clearDraft();
      setIsDirty(false);
      resetValidation();
      setSaveMessage({ type: "success", text: "保存成功！" });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage({ type: "error", text: (err as Error).message || "保存失败，请重试" });
    } finally {
      setIsSaving(false);
    }
  };

  // 放弃更改
  const handleDiscard = () => {
    if (!location) return;
    if (!window.confirm("确定放弃所有未保存的更改？")) return;
    setFormData({
      name: location.name,
      subtitle: location.subtitle ?? "",
      description: location.description,
      address: location.address ?? "",
      cityId: location.cityId,
      bestSeason: location.bestSeason ?? [],
      coverImage: location.coverImage,
      images: location.images ?? [],
      lat: location.coordinates?.lat ?? "",
      lng: location.coordinates?.lng ?? "",
    });
    clearDraft();
    setIsDirty(false);
    resetValidation();
    setSaveMessage(null);
  };

  // 恢复草稿
  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setFormData(pendingDraft);
      setIsDirty(true);
    }
    setShowDraftBanner(false);
    setPendingDraft(null);
  };

  // 放弃草稿
  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftBanner(false);
    setPendingDraft(null);
  };

  // 计算进度步骤
  const progressSteps = [
    { id: "core", label: copy.admin.progressStep1, done: !!formData.name && !!formData.description },
    { id: "location", label: copy.admin.progressStep2, done: !!formData.cityId },
    { id: "media", label: copy.admin.progressStep3, done: !!formData.coverImage },
    { id: "finish", label: copy.admin.progressStep4, done: !!formData.name && !!formData.description && !!formData.cityId && !!formData.coverImage },
  ];

  // 当前城市名（用于预览）
  const currentCityName = React.useMemo(
    () => cities.find((c) => c.id === formData.cityId)?.name ?? "",
    [cities, formData.cityId]
  );

  // ── 加载中 ──
  if (isLoading) return <EditSkeleton />;

  return (
    <div className="min-h-screen pb-24" style={{ background: "#FAF7F4" }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── 顶部导航 ── */}
        <div className="flex items-center justify-between mb-6">
          <a
            href={`/locations/${locationId}`}
            className="inline-flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
            style={{ color: "#8B6E5A" }}
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.common.back}
          </a>

          {/* 移动端预览切换 */}
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="lg:hidden flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-600 transition-colors"
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? "关闭预览" : "预览效果"}
          </button>
        </div>

        {/* ── 标题 ── */}
        <div className="flex items-center gap-2 mb-6">
          <span className="w-1.5 h-6 rounded-full" style={{ background: "#D97706" }} />
          <h1 className="text-xl font-bold" style={{ color: "#1e1812" }}>
            {copy.admin.editLocation}
          </h1>
        </div>

        {/* ── 进度指示器 ── */}
        <div className="mb-8 px-2">
          <EditProgressBar steps={progressSteps} />
        </div>

        {/* ── 草稿恢复横幅 ── */}
        {showDraftBanner && (
          <div className="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <p className="text-sm text-amber-800">
              🗒 {copy.admin.draftRestorePrompt}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="text-xs text-amber-600 hover:text-amber-800 transition-colors"
              >
                {copy.admin.draftDiscardBtn}
              </button>
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="text-xs font-semibold px-3 py-1 rounded-lg text-white transition-colors"
                style={{ background: "#D97706" }}
              >
                {copy.admin.draftRestoreBtn}
              </button>
            </div>
          </div>
        )}

        {/* ── 保存结果消息 ── */}
        {saveMessage && (
          <div
            className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
            style={{
              background: saveMessage.type === "success" ? "#F0FDF4" : "#FEF2F2",
              color: saveMessage.type === "success" ? "#166534" : "#991B1B",
              border: `1px solid ${saveMessage.type === "success" ? "#BBF7D0" : "#FECACA"}`,
            }}
          >
            {saveMessage.type === "success" ? (
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
              </svg>
            )}
            {saveMessage.text}
          </div>
        )}

        {/* ── 主内容：双栏布局 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">

          {/* ── 左栏：编辑表单 ── */}
          <div className={cn("space-y-4", showPreview && "hidden lg:block")}>

            {/* 基本信息 */}
            <SectionCard
              icon={<FileText className="h-4 w-4" />}
              title="基本信息"
            >
              <Field label={copy.admin.formNameRequired} required error={errors.name}>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  onBlur={(e) => touch("name", e.target.value)}
                  placeholder="例如：梧桐山风景区"
                  className={cn(styledInput(!!errors.name), "bg-stone-50 text-stone-900")}
                  style={{ background: "#FAF7F4", color: "#1e1812" }}
                />
              </Field>

              <Field label={copy.admin.formSubtitle}>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  placeholder={copy.admin.placeholderSubtitle}
                  className={cn(styledInput(), "bg-stone-50 text-stone-900")}
                  style={{ background: "#FAF7F4", color: "#1e1812" }}
                />
              </Field>

              <Field
                label={copy.admin.formDescriptionRequired}
                required
                error={errors.description}
                hint={`已写 ${formData.description.length} 字 · 建议 100-500 字`}
              >
                <div className="relative">
                  <textarea
                    rows={6}
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    onBlur={(e) => touch("description", e.target.value)}
                    className={cn(
                      styledInput(!!errors.description),
                      "resize-none leading-relaxed"
                    )}
                    style={{ background: "#FAF7F4", color: "#1e1812" }}
                  />
                  {/* 字数指示条 */}
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5">
                    <div className="h-1 w-16 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          formData.description.length < 50 ? "bg-stone-300"
                          : formData.description.length < 100 ? "bg-amber-400"
                          : "bg-emerald-400"
                        )}
                        style={{ width: `${Math.min((formData.description.length / 500) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] tabular-nums",
                      formData.description.length > 450 ? "text-amber-500" : "text-stone-300"
                    )}>
                      {formData.description.length}
                    </span>
                  </div>
                </div>
              </Field>
            </SectionCard>

            {/* 位置信息 */}
            <SectionCard
              icon={<MapPin className="h-4 w-4" />}
              title="位置信息"
            >
              <Field label={copy.admin.formCity} required error={errors.cityId}>
                <CitySelect
                  value={formData.cityId}
                  onChange={(id) => {
                    updateField("cityId", id);
                    touch("cityId", id);
                  }}
                  cities={cities}
                  error={errors.cityId}
                />
              </Field>

              <Field label={copy.admin.formAddress}>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="例如：广东省深圳市盐田区"
                  className={cn(styledInput(), "text-stone-900")}
                  style={{ background: "#FAF7F4", color: "#1e1812" }}
                />
              </Field>

              <Field
                label={copy.admin.formCoordinates}
                hint={copy.admin.coordinatesHelp}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">{copy.admin.latLabel}</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.lat}
                      onChange={(e) => updateField("lat", e.target.value)}
                      onBlur={(e) => touch("lat", e.target.value)}
                      placeholder="22.5619"
                      className={cn(styledInput(!!errors.lat), "text-stone-900")}
                      style={{ background: "#FAF7F4", color: "#1e1812" }}
                    />
                    {errors.lat && <p className="text-xs text-red-500 mt-1">{errors.lat}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">{copy.admin.lngLabel}</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.lng}
                      onChange={(e) => updateField("lng", e.target.value)}
                      onBlur={(e) => touch("lng", e.target.value)}
                      placeholder="114.1985"
                      className={cn(styledInput(!!errors.lng), "text-stone-900")}
                      style={{ background: "#FAF7F4", color: "#1e1812" }}
                    />
                    {errors.lng && <p className="text-xs text-red-500 mt-1">{errors.lng}</p>}
                  </div>
                </div>
              </Field>
            </SectionCard>

            {/* 封面与季节 */}
            <SectionCard
              icon={<ImageIcon className="h-4 w-4" />}
              title="封面与季节"
            >
              <Field label={copy.admin.formCoverImageRequired} hint={copy.admin.coverImageAiHint}>
                <CoverImageUpload
                  value={formData.coverImage}
                  onChange={(url) => updateField("coverImage", url)}
                  disabled={isSaving}
                />
              </Field>

              <Field
                label="相册图片"
                hint="最多上传 9 张，展示在地点详情页图片画廊"
              >
                <MultiImageUpload
                  values={formData.images}
                  onChange={(urls) => updateField("images", urls)}
                  max={9}
                  disabled={isSaving}
                />
              </Field>

              <Field label={copy.admin.formBestSeason} hint={copy.admin.seasonSelectHint}>
                <SeasonPicker
                  value={formData.bestSeason}
                  onChange={(v) => updateField("bestSeason", v)}
                  disabled={isSaving}
                />
              </Field>
            </SectionCard>

            {/* 高级设置（可折叠） */}
            <SectionCard
              icon={<Settings className="h-4 w-4" />}
              title="高级设置"
              collapsible
              defaultOpen={false}
              badge={
                <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">可选</span>
              }
            >
              <p className="text-xs text-stone-400">更多字段（如标签、路线信息）请通过管理后台配置。</p>
            </SectionCard>

            {/* 移动端保存按钮（粘性栏未展示时的备选） */}
            {!isDirty && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)" }}
              >
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {copy.admin.saving}</>
                ) : (
                  copy.admin.save
                )}
              </button>
            )}
          </div>

          {/* ── 右栏：实时预览 ── */}
          <div className={cn(showPreview ? "block" : "hidden", "lg:block")}>
            <PreviewPanel data={formData} cityName={currentCityName} />
          </div>
        </div>
      </div>

      <Footer />

      {/* ── 粘性底部操作栏 ── */}
      <StickyActionBar
        isDirty={isDirty}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
