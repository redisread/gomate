"use client";

import * as React from "react";
import { fetchAPI, apiPut } from "@/lib/api";
import type { Location, City } from "@/lib/types";

/* ================================================================
   类型
   ================================================================ */

export interface FormData {
  name: string;
  type: string;
  subtitle: string;
  description: string;
  address: string;
  cityId: string;
  bestSeason: string[];
  coverImage: string;
  images: string[];
  lat: number | string;
  lng: number | string;
  extra: { facilities: string[]; tips: string[]; warnings: string[] };
  tagIds: string[];
  // P0-B T4（task #171）§8：停车 tri-state
  parkingAvailable: boolean | null;
  parkingInfo: string;
}

interface UseLocationFormReturn {
  // Data
  location: Location | null;
  cities: City[];
  allTags: Array<{ id: string; name: string; type: string }>;
  // Form state
  formData: FormData;
  errors: Record<string, string | undefined>;
  isSaving: boolean;
  isDirty: boolean;
  saveMessage: { type: "success" | "error"; text: string } | null;
  showDraftBanner: boolean;
  pendingDraft: FormData | null;
  // Field updates
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  touch: (key: string, value: string) => void;
  // Actions
  handleSave: () => Promise<void>;
  handleDiscard: () => void;
  handleRestoreDraft: () => void;
  handleDiscardDraft: () => void;
}

/* ================================================================
   常量
   ================================================================ */

const SEASON_ZH_TO_KEY: Record<string, string> = {
  春季: "spring", 夏季: "summer", 秋季: "autumn", 冬季: "winter",
};

function normalizeSeasons(seasons: string[]): string[] {
  return seasons.map((s) => SEASON_ZH_TO_KEY[s] ?? s);
}

const DEFAULT_FORM: FormData = {
  name: "", type: "", subtitle: "", description: "", address: "",
  cityId: "", bestSeason: [], coverImage: "", images: [],
  lat: "", lng: "", extra: { facilities: [], tips: [], warnings: [] },
  tagIds: [],
  parkingAvailable: null, parkingInfo: "",
};

const VALIDATION_RULES: Record<string, (v: string) => string | undefined> = {
  name: (v) => {
    if (!v.trim()) return "名称不能为空";
    if (v.trim().length > 50) return "名称不能超过50个字符";
  },
  description: (v) => {
    if (!v.trim()) return "描述不能为空";
    if (v.trim().length < 10) return "描述至少需要10个字符";
  },
  cityId: (v) => { if (!v) return "请选择城市"; },
  lat: (v) => {
    if (v === "" || v === undefined) return undefined;
    const n = parseFloat(String(v));
    if (isNaN(n) || n < -90 || n > 90) return "纬度无效 (-90 到 90)";
  },
  lng: (v) => {
    if (v === "" || v === undefined) return undefined;
    const n = parseFloat(String(v));
    if (isNaN(n) || n < -180 || n > 180) return "经度无效 (-180 到 180)";
  },
};

/* ================================================================
   Hook
   ================================================================ */

export function useLocationForm(locationId: string): UseLocationFormReturn {
  const [location, setLocation] = React.useState<Location | null>(null);
  const [cities, setCities] = React.useState<City[]>([]);
  const [allTags, setAllTags] = React.useState<Array<{ id: string; name: string; type: string }>>([]);
  const [formData, setFormData] = React.useState<FormData>(DEFAULT_FORM);
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDraftBanner, setShowDraftBanner] = React.useState(false);
  const [pendingDraft, setPendingDraft] = React.useState<FormData | null>(null);

  // Auth guard
  React.useEffect(() => {
    fetchAPI("/auth/get-session")
      .then((r) => r.json())
      .then((data) => { if (data?.user?.role !== "admin") window.location.href = "/"; })
      .catch(() => { window.location.href = "/"; });
  }, []);

  // Load data
  React.useEffect(() => {
    Promise.all([
      fetchAPI(`/api/locations/${locationId}`).then((r) => r.json()),
      fetchAPI("/api/cities").then((r) => r.json()),
      fetchAPI(`/api/locations/${locationId}/tags`).then((r) => r.json()).catch(() => ({ tags: [] })),
      fetchAPI("/api/tags?type=location&limit=200").then((r) => r.json()).catch(() => ({ tags: [] })),
    ])
      .then(([locData, cityData, locTagsData, allTagsData]) => {
        if (locData.location) {
          const loc: Location = locData.location;
          setLocation(loc);
          setAllTags(allTagsData.tags ?? []);

          const currentTagIds: string[] = (locTagsData.tags ?? []).map((t: { id: string }) => t.id);

          const serverData: FormData = {
            name: loc.name, type: loc.type ?? "", subtitle: loc.subtitle ?? "",
            description: loc.description, address: loc.address ?? "", cityId: loc.cityId,
            bestSeason: normalizeSeasons(loc.bestSeason ?? []), coverImage: loc.coverImage,
            images: loc.images ?? [], lat: loc.coordinates?.lat ?? "", lng: loc.coordinates?.lng ?? "",
            extra: {
              facilities: loc.extra?.facilities ?? [],
              tips: Array.isArray(loc.extra?.tips) ? loc.extra.tips : [],
              warnings: Array.isArray(loc.extra?.warnings) ? loc.extra.warnings : [],
            },
            tagIds: currentTagIds,
            parkingAvailable: loc.parkingAvailable ?? null,
            parkingInfo: loc.parkingInfo ?? "",
          };

          // Check for draft
          const draftKey = `location-edit-draft-${locationId}`;
          try {
            const raw = localStorage.getItem(draftKey);
            if (raw) {
              const parsed = JSON.parse(raw);
              const expiresAt = parsed._draftExpiresAt;
              if (expiresAt && Date.now() < expiresAt) {
                const { _draftExpiresAt: __draftExpiresAt, ...draftData } = parsed;
                if (JSON.stringify(draftData) !== JSON.stringify(serverData)) {
                  setPendingDraft(draftData);
                  setShowDraftBanner(true);
                  setFormData(serverData);
                  return;
                }
              }
            }
          } catch { /* ignore */ }
          setFormData(serverData);
        }
        if (cityData.cities) setCities(cityData.cities);
      })
      .catch(() => {
        setSaveMessage({ type: "error", text: "加载地点数据失败，请刷新重试" });
      });
   
  }, [locationId]);

  // Validation
  const validateField = React.useCallback((key: string, value: string) => {
    const rule = VALIDATION_RULES[key];
    if (!rule) return undefined;
    return rule(value);
  }, []);

  const touch = React.useCallback((key: string, value: string) => {
    const error = validateField(key, value);
    setErrors((prev) => ({ ...prev, [key]: error }));
    return error === undefined;
  }, [validateField]);

  // Auto-draft
  const saveDraft = React.useCallback((data: FormData) => {
    try {
      const draftKey = `location-edit-draft-${locationId}`;
      const draftData = { ...data, _draftExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    } catch { /* ignore */ }
  }, [locationId]);

  const clearDraft = React.useCallback(() => {
    try {
      const draftKey = `location-edit-draft-${locationId}`;
      localStorage.removeItem(draftKey);
    } catch { /* ignore */ }
  }, [locationId]);

  // Auto-save draft on change
  React.useEffect(() => {
    if (isDirty && formData.name) {
      const timer = setTimeout(() => saveDraft(formData), 2000);
      return () => clearTimeout(timer);
    }
  }, [formData, isDirty, saveDraft]);

  // Field update
  const updateField = React.useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveMessage(null);
    if (typeof value === "string" && VALIDATION_RULES[key]) {
      touch(key, value);
    }
  }, [touch]);

  // Save
  const handleSave = React.useCallback(async () => {
    const validationData: Record<string, string> = {
      name: formData.name, description: formData.description, cityId: formData.cityId,
      lat: String(formData.lat), lng: String(formData.lng),
    };
    let allValid = true;
    for (const [key, val] of Object.entries(validationData)) {
      const err = validateField(key, val);
      if (err) { allValid = false; }
      setErrors((prev) => ({ ...prev, [key]: err }));
    }
    if (!allValid || !location) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const extraPayload = {
        facilities: formData.extra.facilities.length > 0 ? formData.extra.facilities : undefined,
        tips: formData.extra.tips.filter((s) => s.trim()).length > 0 ? formData.extra.tips.filter((s) => s.trim()) : undefined,
        warnings: formData.extra.warnings.filter((s) => s.trim()).length > 0 ? formData.extra.warnings.filter((s) => s.trim()) : undefined,
      };
      const hasExtra = extraPayload.facilities || extraPayload.tips || extraPayload.warnings;

      await Promise.all([
        apiPut("/api/locations", {
          id: location.id, name: formData.name, type: formData.type || null,
          subtitle: formData.subtitle || undefined, description: formData.description,
          address: formData.address || undefined, cityId: formData.cityId,
          bestSeason: formData.bestSeason, coverImage: formData.coverImage,
          images: formData.images,
          coordinates: { lat: parseFloat(String(formData.lat)) || 0, lng: parseFloat(String(formData.lng)) || 0 },
          extra: hasExtra ? extraPayload : undefined,
          parkingAvailable: formData.parkingAvailable,
          parkingInfo: formData.parkingInfo.trim() || undefined,
        }),
        apiPut(`/api/locations/${location.id}/tags`, { tagIds: formData.tagIds }),
      ]);

      clearDraft();
      setIsDirty(false);
      setErrors({});
      setSaveMessage({ type: "success", text: "保存成功！正在跳转..." });
      setTimeout(() => { window.location.href = `/locations/${locationId}`; }, 800);
    } catch (err) {
      setSaveMessage({ type: "error", text: (err as Error).message || "保存失败，请重试" });
    } finally {
      setIsSaving(false);
    }
  }, [formData, location, locationId, clearDraft, validateField]);

  // Discard
  const handleDiscard = React.useCallback(() => {
    if (!location) return;
    if (!window.confirm("确定放弃所有未保存的更改？")) return;
    setFormData({
      name: location.name, type: location.type ?? "", subtitle: location.subtitle ?? "",
      description: location.description, address: location.address ?? "", cityId: location.cityId,
      bestSeason: normalizeSeasons(location.bestSeason ?? []), coverImage: location.coverImage,
      images: location.images ?? [], lat: location.coordinates?.lat ?? "", lng: location.coordinates?.lng ?? "",
      extra: {
        facilities: location.extra?.facilities ?? [],
        tips: Array.isArray(location.extra?.tips) ? location.extra.tips : [],
        warnings: Array.isArray(location.extra?.warnings) ? location.extra.warnings : [],
      },
      tagIds: formData.tagIds,
      parkingAvailable: location.parkingAvailable ?? null,
      parkingInfo: location.parkingInfo ?? "",
    });
    clearDraft();
    setIsDirty(false);
    setErrors({});
    setSaveMessage(null);
  }, [location, formData.tagIds, clearDraft]);

  // Draft restore/discard
  const handleRestoreDraft = React.useCallback(() => {
    if (pendingDraft) { setFormData(pendingDraft); setIsDirty(true); }
    setShowDraftBanner(false);
    setPendingDraft(null);
  }, [pendingDraft]);

  const handleDiscardDraft = React.useCallback(() => {
    clearDraft();
    setShowDraftBanner(false);
    setPendingDraft(null);
  }, [clearDraft]);

  return {
    location, cities, allTags, formData, errors, isSaving, isDirty, saveMessage,
    showDraftBanner, pendingDraft, updateField, touch, handleSave, handleDiscard,
    handleRestoreDraft, handleDiscardDraft,
  };
}
