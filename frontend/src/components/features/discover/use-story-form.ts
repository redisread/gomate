"use client";

import * as React from "react";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { useI18n } from "@/hooks/useI18n";
import type { SessionUser } from "@/lib/types";

export interface FormFields {
  title: string;
  summary: string;
  content: string;
  coverImage: string;
  locationId: string;
  locationName: string;
  tags: string[];
  status: string;
  authorId: string;
}

interface LocationOption {
  id: string;
  name: string;
  slug: string;
}

interface TagOption {
  id: string;
  name: string;
}

interface StoryEditData {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  locationId?: string;
  location?: { id: string; name: string; slug: string } | null;
  tags?: { id: string; name: string }[];
  status: string;
  author: { id: string } | null;
}

/** task #149：保存结果结构化，替代旧的字符串 saveMessage（旧实现把 API error 对象塞进字符串，下游 .includes 直接 TypeError 白屏） */
export interface SaveResult {
  type: "success" | "error";
  message: string;
}

export interface UseStoryFormReturn {
  form: FormFields;
  initialForm: React.MutableRefObject<FormFields | null>;
  currentUser: SessionUser | null;
  isLoading: boolean;
  isSaving: boolean;
  /** 仅由 handleSave 产生；成功 → toast，失败 → 内联 banner + 重试 */
  saveResult: SaveResult | null;
  /** 封面上传相关提示（走 toast） */
  uploadMessage: string | null;
  error: string | null;
  canEdit: boolean;
  allTags: TagOption[];
  locationSearch: string;
  locationResults: LocationOption[];
  isSearchingLocation: boolean;
  isUploadingCover: boolean;
  draftAvailable: boolean;
  updateField: <K extends keyof FormFields>(key: K, value: FormFields[K]) => void;
  handleCoverUpload: (file: File) => Promise<void>;
  handleLocationSearch: (value: string) => void;
  handleSave: () => Promise<void>;
  handleDiscardDraft: () => void;
  handleRestoreDraft: () => void;
}

const DRAFT_KEY_PREFIX = "story-edit-draft-";

function loadDraft(storyId: string): Partial<FormFields> | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${storyId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(storyId: string, form: FormFields): void {
  try {
    localStorage.setItem(`${DRAFT_KEY_PREFIX}${storyId}`, JSON.stringify(form));
  } catch { /* quota exceeded */ }
}

function clearDraft(storyId: string): void {
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${storyId}`);
  } catch { /* ignore */ }
}

export function useStoryForm(storyId: string): UseStoryFormReturn {
  const { t } = useI18n(["content"]);
  const [currentUser, setCurrentUser] = React.useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveResult, setSaveResult] = React.useState<SaveResult | null>(null);
  const [uploadMessage, setUploadMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<FormFields>({
    title: "", summary: "", content: "", coverImage: "", locationId: "",
    locationName: "", tags: [], status: "published", authorId: "",
  });
  const initialForm = React.useRef<FormFields | null>(null);
  const [allTags, setAllTags] = React.useState<TagOption[]>([]);

  // Location search
  const [locationSearch, setLocationSearch] = React.useState("");
  const [locationResults, setLocationResults] = React.useState<LocationOption[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = React.useState(false);

  // Cover upload
  const [isUploadingCover, setIsUploadingCover] = React.useState(false);

  // Draft
  const [draftAvailable, setDraftAvailable] = React.useState(false);
  const locSearchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);

        const [user, storyRes, tagsRes] = await Promise.all([
          fetchCurrentUser().catch(() => null),
          fetchAPI(`/stories/${storyId}`).then((r: Response) => r.ok ? r.json() : { success: false }).catch(() => ({ success: false })),
          fetchAPI("/stories/tags").then((r) => r.json()).catch(() => ({ tags: [] })),
        ]);

        if (cancelled) return;

        setCurrentUser(user);

        // Load tags
        setAllTags(tagsRes.tags ?? []);

        if (!storyRes.success || !storyRes.data) {
          // 存 i18n key，渲染层 t()（避免 load effect 依赖 t 重复拉取）
          setError("content.discover.storyNotFound");
          return;
        }

        const data: StoryEditData = storyRes.data;
        const tags = (data.tags ?? []).map((t: TagOption) => t.name);

        const f: FormFields = {
          title: data.title || "",
          summary: data.summary || "",
          content: data.content || "",
          coverImage: data.coverImage || "",
          locationId: data.location?.id || data.locationId || "",
          locationName: data.location?.name || "",
          tags,
          status: data.status || "published",
          authorId: data.author?.id || "",
        };

        // 权限检查
        const authorId = data.author?.id;
        const isAuthor = user && authorId === user.id;
        const isAdmin = user?.role === "admin";

        if (!isAuthor && !isAdmin) {
          window.location.href = `/discover/${storyId}`;
          return;
        }

        // 检查草稿
        const draft = loadDraft(storyId);
        if (draft) {
          setDraftAvailable(true);
        }

        setForm(f);
        initialForm.current = { ...f };
      } catch (err) {
        if (!cancelled) {
          setError("content.discover.loadStoryError");
          console.error("Load story error:", err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [storyId]);

  // 自动保存草稿（每 30 秒）
  React.useEffect(() => {
    if (initialForm.current) {
      draftTimer.current = setInterval(() => {
        saveDraft(storyId, form);
      }, 30000);
    }
    return () => {
      if (draftTimer.current) clearInterval(draftTimer.current);
    };
  }, [storyId, form, draftAvailable]);

  const isAuthor = Boolean(form.authorId && currentUser && form.authorId === currentUser.id);
  const isAdmin = currentUser?.role === "admin";
  const canEdit = Boolean(currentUser && (isAuthor || isAdmin));

  const updateField = React.useCallback(<K extends keyof FormFields>(key: K, value: FormFields[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleLocationSearch = React.useCallback((value: string) => {
    setLocationSearch(value);
    if (locSearchTimer.current) clearTimeout(locSearchTimer.current);
    if (!value.trim()) { setLocationResults([]); return; }
    setIsSearchingLocation(true);
    locSearchTimer.current = setTimeout(() => {
      fetchAPI(`/api/locations?search=${encodeURIComponent(value)}&limit=8`)
        .then((r) => r.json())
        .then((data) => setLocationResults(data.locations ?? []))
        .catch(() => setLocationResults([]))
        .finally(() => setIsSearchingLocation(false));
    }, 350);
  }, []);

  const handleCoverUpload = React.useCallback(async (file: File) => {
    setUploadMessage(null);
    if (file.size > 2 * 1024 * 1024) {
      setUploadMessage(t("content.discover.edit.coverTooLarge"));
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setUploadMessage(t("content.discover.edit.coverTypeError"));
      return;
    }
    try {
      setIsUploadingCover(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetchAPI("/upload/story", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        setForm((prev) => ({ ...prev, coverImage: data.url }));
      } else {
        setUploadMessage(t("content.discover.create.uploadFailed"));
      }
    } catch {
      setUploadMessage(t("content.discover.create.uploadFailed"));
    } finally {
      setIsUploadingCover(false);
    }
  }, [t]);

  const handleSave = React.useCallback(async () => {
    try {
      setIsSaving(true);
      setSaveResult(null);

      const res = await fetchAPI(`/stories/${storyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          summary: form.summary.trim(),
          content: form.content,
          coverImage: form.coverImage || undefined,
          locationId: form.locationId || undefined,
          status: form.status,
          tags: form.tags,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveResult({ type: "success", message: t("content.discover.edit.saveSuccess") });
        clearDraft(storyId);
        initialForm.current = { ...form };
      } else {
        // API 错误契约 {success:false, error:{code,message}}；容错 string 形 error
        const apiMessage =
          typeof data.error === "string"
            ? data.error
            : data.error?.message;
        setSaveResult({
          type: "error",
          message: apiMessage || t("content.discover.edit.saveFailed"),
        });
      }
    } catch {
      setSaveResult({ type: "error", message: t("content.discover.edit.saveNetworkError") });
    } finally {
      setIsSaving(false);
    }
  }, [storyId, form, t]);

  const handleDiscardDraft = React.useCallback(() => {
    clearDraft(storyId);
    setDraftAvailable(false);
  }, [storyId]);

  const handleRestoreDraft = React.useCallback(() => {
    const draft = loadDraft(storyId);
    if (draft) {
      setForm((prev) => ({ ...prev, ...draft }));
      clearDraft(storyId);
      setDraftAvailable(false);
    }
  }, [storyId]);

  return {
    form, initialForm, currentUser, isLoading, isSaving, saveResult, uploadMessage, error, canEdit,
    allTags, locationSearch, locationResults, isSearchingLocation, isUploadingCover, draftAvailable,
    updateField, handleCoverUpload, handleLocationSearch, handleSave, handleDiscardDraft, handleRestoreDraft,
  };
}
