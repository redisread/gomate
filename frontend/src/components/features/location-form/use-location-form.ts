"use client";

import * as React from "react";
import { fetchAPI, apiPut } from "@/lib/api";
import type { Location, City, PoiDetail } from "@/lib/types";

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
  poiLinks: Array<{ poiId: string; roleType: string; order: number }>;
}

interface UseLocationFormReturn {
  // Data
  location: Location | null;
  cities: City[];
  allTags: Array<{ id: string; name: string; type: string }>;
  allPois: Array<{ id: string; name: string; description?: string | null }>;
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
  // POI
  poiModalOpen: boolean;
  poiModalMode: "create" | "edit";
  editingPoi: PoiDetail | null;
  deleteConfirmOpen: boolean;
  deletingPoi: { id: string; name: string } | null;
  deletingPoiAssociations: number;
  isDeletingPoi: boolean;
  poiSearch: string;
  poiSearchResults: Array<{ id: string; name: string; description?: string | null }>;
  handleOpenCreatePoi: () => void;
  handleOpenEditPoi: (poiId: string) => Promise<void>;
  handlePoiModalSuccess: (poi: { id: string; name: string; coordinates: { lat: number; lng: number } }) => void;
  handleOpenDeletePoi: (poiId: string, poiName: string) => Promise<void>;
  handleConfirmDeletePoi: () => Promise<void>;
  handlePoiSearch: (value: string) => void;
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
  tagIds: [], poiLinks: [],
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
  const [allPois, setAllPois] = React.useState<Array<{ id: string; name: string; description?: string | null }>>([]);
  const [formData, setFormData] = React.useState<FormData>(DEFAULT_FORM);
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDraftBanner, setShowDraftBanner] = React.useState(false);
  const [pendingDraft, setPendingDraft] = React.useState<FormData | null>(null);

  // POI state
  const [poiModalOpen, setPoiModalOpen] = React.useState(false);
  const [poiModalMode, setPoiModalMode] = React.useState<"create" | "edit">("create");
  const [editingPoi, setEditingPoi] = React.useState<PoiDetail | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deletingPoi, setDeletingPoi] = React.useState<{ id: string; name: string } | null>(null);
  const [deletingPoiAssociations, setDeletingPoiAssociations] = React.useState(0);
  const [isDeletingPoi, setIsDeletingPoi] = React.useState(false);
  const [poiSearch, setPoiSearch] = React.useState("");
  const [poiSearchResults, setPoiSearchResults] = React.useState<typeof allPois>([]);

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
      fetchAPI(`/api/locations/${locationId}/pois`).then((r) => r.json()).catch(() => ({ pois: [] })),
      fetchAPI("/api/tags?type=location&limit=200").then((r) => r.json()).catch(() => ({ tags: [] })),
      fetchAPI("/pois?limit=200").then((r) => r.json()).catch(() => ({ pois: [] })),
    ])
      .then(([locData, cityData, locTagsData, locPoisData, allTagsData, allPoisData]) => {
        if (locData.location) {
          const loc: Location = locData.location;
          setLocation(loc);
          setAllTags(allTagsData.tags ?? []);
          setAllPois(allPoisData.pois ?? []);

          const currentTagIds: string[] = (locTagsData.tags ?? []).map((t: { id: string }) => t.id);
          const currentPoiLinks: FormData["poiLinks"] = (locPoisData.pois ?? []).map(
            (p: { id: string; roleType: string; order?: number }, idx: number) => ({
              poiId: p.id, roleType: p.roleType ?? "poi", order: p.order ?? idx,
            })
          );

          const serverData: FormData = {
            name: loc.name, type: loc.type ?? "", subtitle: loc.subtitle ?? "",
            description: loc.description, address: loc.address ?? "", cityId: loc.cityId,
            bestSeason: normalizeSeasons(loc.bestSeason ?? []), coverImage: loc.coverImage,
            images: loc.images ?? [], lat: loc.coordinates?.lat ?? "", lng: loc.coordinates?.lng ?? "",
            extra: {
              facilities: (loc.extra as any)?.facilities ?? [],
              tips: Array.isArray((loc.extra as any)?.tips) ? (loc.extra as any)?.tips : [],
              warnings: Array.isArray((loc.extra as any)?.warnings) ? (loc.extra as any)?.warnings : [],
            },
            tagIds: currentTagIds, poiLinks: currentPoiLinks,
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
          extra: hasExtra ? extraPayload : null,
        }),
        apiPut(`/api/locations/${location.id}/tags`, { tagIds: formData.tagIds }),
        apiPut(`/api/locations/${location.id}/pois`, { pois: formData.poiLinks }),
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
        facilities: (location.extra as any)?.facilities ?? [],
        tips: Array.isArray((location.extra as any)?.tips) ? (location.extra as any)?.tips : [],
        warnings: Array.isArray((location.extra as any)?.warnings) ? (location.extra as any)?.warnings : [],
      },
      tagIds: formData.tagIds, poiLinks: formData.poiLinks,
    });
    clearDraft();
    setIsDirty(false);
    setErrors({});
    setSaveMessage(null);
  }, [location, formData.tagIds, formData.poiLinks, clearDraft]);

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

  // POI handlers
  const handleOpenCreatePoi = React.useCallback(() => {
    setPoiModalMode("create"); setEditingPoi(null); setPoiModalOpen(true);
  }, []);

  const handleOpenEditPoi = React.useCallback(async (poiId: string) => {
    try {
      const res = await fetchAPI(`/api/pois/${poiId}`);
      const data = await res.json();
      if (data.success && data.poi) { setEditingPoi(data.poi); setPoiModalMode("edit"); setPoiModalOpen(true); }
    } catch (err) { console.error("获取 POI 详情失败:", err); }
  }, []);

  const handlePoiModalSuccess = React.useCallback((poi: { id: string; name: string; coordinates: { lat: number; lng: number } }) => {
    setAllPois((prev) => {
      const exists = prev.find((p) => p.id === poi.id);
      if (exists) return prev.map((p) => (p.id === poi.id ? { ...p, name: poi.name } : p));
      return [...prev, { id: poi.id, name: poi.name }];
    });
    if (poiModalMode === "create") {
      setFormData((prev) => ({
        ...prev,
        poiLinks: [...prev.poiLinks, { poiId: poi.id, roleType: "poi", order: prev.poiLinks.length }],
      }));
    }
    setPoiModalOpen(false);
    setEditingPoi(null);
  }, [poiModalMode]);

  const handleOpenDeletePoi = React.useCallback(async (poiId: string, poiName: string) => {
    try {
      const res = await fetchAPI(`/api/locations/${locationId}/pois`);
      const data = await res.json();
      const count = (data.pois ?? []).filter((p: { id: string }) => p.id === poiId).length;
      setDeletingPoiAssociations(count);
    } catch { setDeletingPoiAssociations(0); }
    setDeletingPoi({ id: poiId, name: poiName });
    setDeleteConfirmOpen(true);
  }, [locationId]);

  const handleConfirmDeletePoi = React.useCallback(async () => {
    if (!deletingPoi) return;
    setIsDeletingPoi(true);
    try {
      const res = await fetchAPI(`/api/pois/${deletingPoi.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setAllPois((prev) => prev.filter((p) => p.id !== deletingPoi.id));
        setFormData((prev) => ({ ...prev, poiLinks: prev.poiLinks.filter((l) => l.poiId !== deletingPoi.id) }));
        setDeleteConfirmOpen(false);
        setDeletingPoi(null);
      } else {
        throw new Error(data.error || "删除失败");
      }
    } catch (err) { console.error("删除 POI 失败:", err); }
    finally { setIsDeletingPoi(false); }
  }, [deletingPoi]);

  const handlePoiSearch = React.useCallback((value: string) => {
    setPoiSearch(value);
    if (!value.trim()) { setPoiSearchResults([]); return; }
    const q = value.toLowerCase();
    setPoiSearchResults(allPois.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8));
  }, [allPois]);

  return {
    location, cities, allTags, allPois, formData, errors, isSaving, isDirty, saveMessage,
    showDraftBanner, pendingDraft, updateField, touch, handleSave, handleDiscard,
    handleRestoreDraft, handleDiscardDraft,
    poiModalOpen, poiModalMode, editingPoi, deleteConfirmOpen, deletingPoi,
    deletingPoiAssociations, isDeletingPoi, poiSearch, poiSearchResults,
    handleOpenCreatePoi, handleOpenEditPoi, handlePoiModalSuccess,
    handleOpenDeletePoi, handleConfirmDeletePoi, handlePoiSearch,
    clearPoiSearchResults: () => setPoiSearchResults([]),
  };
}
