"use client";

/**
 * POI 编辑弹窗组件
 *
 * 支持两种模式：
 * - create: 创建新打卡点
 * - edit: 编辑已有打卡点
 *
 * 功能：
 * - 名称、坐标、描述、分类、图片字段
 * - 表单验证
 * - 提交后回调
 */

import * as React from "react";
import { X, Loader2, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { PoiDetail, PoiCreateInput, PoiUpdateInput } from "@/lib/types";

/* ================================================================
   类型与常量
   ================================================================ */

interface PoiEditModalProps {
  /** 模式：create 或 edit */
  mode: "create" | "edit";
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交成功回调 */
  onSuccess: (poi: { id: string; name: string; coordinates: { lat: number; lng: number } }) => void;
  /** 编辑模式时的初始数据 */
  initialData?: PoiDetail | null;
}

interface FormData {
  name: string;
  lat: string;
  lng: string;
  description: string;
}

const DEFAULT_FORM: FormData = {
  name: "",
  lat: "",
  lng: "",
  description: "",
};

/* ================================================================
   弹窗组件
   ================================================================ */

export function PoiEditModal({
  mode,
  open,
  onClose,
  onSuccess,
  initialData,
}: PoiEditModalProps) {
  const { t } = useI18n(["pois", "common"]);
  const [formData, setFormData] = React.useState<FormData>(DEFAULT_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // 编辑模式时，用初始数据填充表单
  React.useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData({
        name: initialData.name ?? "",
        lat: initialData.coordinates?.lat?.toString() ?? "",
        lng: initialData.coordinates?.lng?.toString() ?? "",
        description: initialData.description ?? "",
      });
    } else if (mode === "create") {
      setFormData(DEFAULT_FORM);
    }
    setErrors({});
    setSubmitError(null);
  }, [mode, initialData, open]);

  // 关闭时重置
  const handleClose = () => {
    setFormData(DEFAULT_FORM);
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  // 更新字段
  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // 验证表单
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('pois.nameRequired');
    } else if (formData.name.length > 50) {
      newErrors.name = t('pois.nameMaxLength');
    }

    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);

    if (!formData.lat.trim() || !formData.lng.trim()) {
      newErrors.coordinates = t('pois.coordinatesRequired');
    } else if (isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.coordinates = t('pois.latRangeInvalid');
    } else if (isNaN(lng) || lng < -180 || lng > 180) {
      newErrors.coordinates = t('pois.lngRangeInvalid');
    }

    if (formData.description.length > 500) {
      newErrors.description = t('pois.descMaxLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const coordinates = {
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng),
    };

    try {
      if (mode === "create") {
        // 创建 POI
        const res = await fetch("/api/pois", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: formData.name.trim(),
            coordinates,
            description: formData.description.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "创建失败");

        onSuccess({
          id: data.poiId,
          name: formData.name.trim(),
          coordinates,
        });
        handleClose();
      } else {
        // 编辑 POI
        if (!initialData?.id) throw new Error("缺少 POI ID");

        const res = await fetch(`/api/pois/${initialData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: formData.name.trim(),
            coordinates,
            description: formData.description.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "更新失败");

        onSuccess({
          id: initialData.id,
          name: formData.name.trim(),
          coordinates,
        });
        handleClose();
      }
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const title = mode === "create" ? t('pois.createTitle') : t('pois.editTitle');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* 弹窗主体 */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="poi-modal-title"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 id="poi-modal-title" className="text-base font-semibold text-stone-800">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            aria-label={t("common.wechat.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="px-5 py-4 space-y-4">
          {/* 名称 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700">
              {t('pois.nameLabel')}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder={t('pois.namePlaceholder')}
              className={cn(
                "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all",
                "bg-stone-50 text-stone-800 placeholder:text-stone-400",
                errors.name
                  ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-stone-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              )}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* 坐标 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700">
              {t('pois.coordinatesLabel')}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <p className="text-xs text-stone-400 mb-2">{t('pois.coordinatesHint')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">{t('pois.latLabel')}</label>
                <input
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => updateField("lat", e.target.value)}
                  placeholder="22.5431"
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all",
                    "bg-stone-50 text-stone-800 placeholder:text-stone-400",
                    errors.coordinates
                      ? "border-red-300 focus:border-red-400"
                      : "border-stone-200 focus:border-amber-400"
                  )}
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">{t('pois.lngLabel')}</label>
                <input
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) => updateField("lng", e.target.value)}
                  placeholder="114.0579"
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all",
                    "bg-stone-50 text-stone-800 placeholder:text-stone-400",
                    errors.coordinates
                      ? "border-red-300 focus:border-red-400"
                      : "border-stone-200 focus:border-amber-400"
                  )}
                />
              </div>
            </div>
            {errors.coordinates && (
              <p className="text-xs text-red-500">{errors.coordinates}</p>
            )}
          </div>

          {/* 描述 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700">
              {t('pois.descriptionLabel')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={t('pois.descriptionPlaceholder')}
              rows={3}
              className={cn(
                "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all resize-none",
                "bg-stone-50 text-stone-800 placeholder:text-stone-400",
                errors.description
                  ? "border-red-300 focus:border-red-400"
                  : "border-stone-200 focus:border-amber-400"
              )}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          {/* 提交错误 */}
          {submitError && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
              {submitError}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-stone-100 bg-stone-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-50"
          >
            {t('pois.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity",
              "bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90",
              "disabled:opacity-60"
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('pois.loading')}
              </span>
            ) : (
              t('pois.save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   删除确认弹窗
   ================================================================ */

interface PoiDeleteConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  poiName: string;
  associationCount: number;
  isDeleting?: boolean;
}

export function PoiDeleteConfirm({
  open,
  onClose,
  onConfirm,
  poiName,
  associationCount,
  isDeleting = false,
}: PoiDeleteConfirmProps) {
  const { t } = useI18n(["pois", "common"]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 弹窗主体 */}
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="poi-delete-title"
      >
        <div className="px-5 py-6 text-center">
          {/* 图标 */}
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <MapPin className="h-6 w-6 text-red-500" />
          </div>

          {/* 标题 */}
          <h3 id="poi-delete-title" className="text-base font-semibold text-stone-800 mb-2">
            {t('pois.deleteConfirmTitle')}
          </h3>

          {/* 描述 */}
          <p className="text-sm text-stone-500 mb-1">
            确定要删除「<span className="font-medium text-stone-700">{poiName}</span>」吗？
          </p>
          <p className="text-xs text-stone-400 mb-4">
            {t('pois.deleteConfirmDesc')}
          </p>

          {/* 关联数量提示 */}
          {associationCount > 0 && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-700 mb-4">
              {t('pois.deleteConfirmAssociations').replace("{count}", String(associationCount))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-center gap-3 px-5 py-4 border-t border-stone-100 bg-stone-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-50"
          >
            {t('pois.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {isDeleting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('pois.deleting')}
              </span>
            ) : (
              t('pois.confirm')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}