"use client";

import * as React from "react";
import type {
  TeamChecklist,
  ActionbookAssignment,
  ActionbookTransportMode,
} from "@gomate/types";
import { fetchAPI } from "@/lib/api";

// Team checklist edit hook.
//
// draft key: team-checklist-draft-{teamId}; 3s debounce + unmount flush
// draft shape validated on load (aligned with PR #388 isValidDraftShape)
// pre-check <2KB before save (mirrors server CHECKLIST_MAX_BYTES)
// error.code 3-tier fallback: mapped i18n / apiMessage / default saveFailed

export interface FormChecklist {
  meetingPointName: string;
  meetingPointTime: string;
  meetingPointNote: string;
  transportMode: ActionbookTransportMode | "";
  transportDetail: string;
  gearEssential: string[];
  gearOptional: string[];
  gearNote: string;
  /**
   * local client id; server may reuse or issue uuid v4 on PUT.
   * assigneeIds 由 form 持有 —— 队长编辑其他字段并保存时，把已有认领原样送回，
   * server 覆盖语义（normalizeAssignments）才不会把认领关系抹掉（task #166 CR B1）
   */
  assignments: Array<{ id: string; task: string; assigneeIds: string[] }>;
  notes: string;
}

export const EMPTY_FORM: FormChecklist = {
  meetingPointName: "",
  meetingPointTime: "",
  meetingPointNote: "",
  transportMode: "",
  transportDetail: "",
  gearEssential: [],
  gearOptional: [],
  gearNote: "",
  assignments: [],
  notes: "",
};

/** spec section 2.1: <2KB soft cap (aligned with server CHECKLIST_MAX_BYTES) */
export const CHECKLIST_MAX_BYTES = 2048;
export const DRAFT_KEY_PREFIX = "team-checklist-draft-";
const TRANSPORT_MODES: readonly ActionbookTransportMode[] = [
  "self_drive",
  "public",
  "charter",
  "other",
];

// ============================================================================
// draft shape validation (mirrors PR #388 pattern)
// non-object / unknown keys / wrong types => discard + toast, don't spread
// ============================================================================

const STRING_FIELDS = [
  "meetingPointName",
  "meetingPointTime",
  "meetingPointNote",
  "transportDetail",
  "gearNote",
  "notes",
] as const;

const STRING_ARRAY_FIELDS = ["gearEssential", "gearOptional"] as const;

export function isValidChecklistDraftShape(draft: unknown): draft is Partial<FormChecklist> {
  if (typeof draft !== "object" || draft === null || Array.isArray(draft)) return false;
  const d = draft as Record<string, unknown>;
  for (const key of Object.keys(d)) {
    if ((STRING_FIELDS as readonly string[]).includes(key)) {
      if (typeof d[key] !== "string") return false;
    } else if (key === "transportMode") {
      const v = d.transportMode;
      if (v !== "" && !TRANSPORT_MODES.includes(v as ActionbookTransportMode)) return false;
    } else if ((STRING_ARRAY_FIELDS as readonly string[]).includes(key)) {
      const arr = d[key];
      if (!Array.isArray(arr) || arr.some((x) => typeof x !== "string")) return false;
    } else if (key === "assignments") {
      const arr = d.assignments;
      if (!Array.isArray(arr)) return false;
      for (const item of arr) {
        if (typeof item !== "object" || item === null || Array.isArray(item)) return false;
        const o = item as Record<string, unknown>;
        if (typeof o.id !== "string" || typeof o.task !== "string") return false;
        if (
          o.assigneeIds !== undefined &&
          (!Array.isArray(o.assigneeIds) ||
            o.assigneeIds.some((x) => typeof x !== "string"))
        ) {
          return false;
        }
        // unknown extra keys on assignment => reject
        for (const k of Object.keys(o)) {
          if (k !== "id" && k !== "task" && k !== "assigneeIds") return false;
        }
      }
    } else {
      return false; // unknown top-level field
    }
  }
  return true;
}

// ============================================================================
// TeamChecklist (server shape) <-> FormChecklist (form shape) converters
// ============================================================================

export function checklistToForm(cl: TeamChecklist | null | undefined): FormChecklist {
  if (!cl) return { ...EMPTY_FORM };
  return {
    meetingPointName: cl.meetingPoint?.name ?? "",
    meetingPointTime: cl.meetingPoint?.time ?? "",
    meetingPointNote: cl.meetingPoint?.note ?? "",
    transportMode: cl.transport?.mode ?? "",
    transportDetail: cl.transport?.detail ?? "",
    gearEssential: cl.gear?.essential ? [...cl.gear.essential] : [],
    gearOptional: cl.gear?.optional ? [...cl.gear.optional] : [],
    gearNote: cl.gear?.note ?? "",
    assignments: (cl.assignments ?? []).map((a) => ({
      id: a.id,
      task: a.task,
      assigneeIds: [...a.assigneeIds],
    })),
    notes: cl.notes ?? "",
  };
}

/**
 * Build the PUT payload from form state. Empty optional groups collapse to undefined
 * so the server's overwrite-semantic (B1) treats them as cleared.
 */
export function formToChecklistPayload(form: FormChecklist): TeamChecklist {
  const meetingName = form.meetingPointName.trim();
  const transportMode = form.transportMode;
  const gearEssential = form.gearEssential.map((s) => s.trim()).filter(Boolean);
  const gearOptional = form.gearOptional.map((s) => s.trim()).filter(Boolean);
  const gearNote = form.gearNote.trim();
  const notes = form.notes.trim();
  // task #166 CR B1：保留已有认领 —— server normalizeAssignments 会按入参覆盖，
  // 把 form 里持有的 assigneeIds 原样送回，避免队长编辑其他字段时抹掉认领关系。
  // M1：filter 改为「空 task 且无认领」才丢 —— task 被误清空时保留行 + 认领，
  // 避免「编辑一次整个分工就没了连带认领」（误编辑不毁数据原则）。
  const assignments = form.assignments
    .map((a) => ({
      id: a.id,
      task: a.task.trim(),
      assigneeIds: Array.from(new Set(a.assigneeIds)),
    }))
    .filter((a) => a.task || a.assigneeIds.length > 0);

  const payload: TeamChecklist = {};
  if (meetingName) {
    payload.meetingPoint = {
      name: meetingName,
      ...(form.meetingPointTime.trim() ? { time: form.meetingPointTime.trim() } : {}),
      ...(form.meetingPointNote.trim() ? { note: form.meetingPointNote.trim() } : {}),
    };
  }
  if (transportMode) {
    payload.transport = {
      mode: transportMode,
      ...(form.transportDetail.trim() ? { detail: form.transportDetail.trim() } : {}),
    };
  }
  if (gearEssential.length || gearOptional.length || gearNote) {
    payload.gear = {
      essential: gearEssential,
      optional: gearOptional,
      ...(gearNote ? { note: gearNote } : {}),
    };
  }
  // assignments: only emit if non-empty so overwrite-semantic can clear them
  if (assignments.length) {
    payload.assignments = assignments as ActionbookAssignment[];
  }
  if (notes) {
    payload.notes = notes;
  }
  return payload;
}

// ============================================================================
// localStorage helpers
// ============================================================================

function loadDraft(teamId: string): Partial<FormChecklist> | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${teamId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraftToStorage(teamId: string, form: FormChecklist): void {
  try {
    localStorage.setItem(`${DRAFT_KEY_PREFIX}${teamId}`, JSON.stringify(form));
  } catch {
    /* quota exceeded */
  }
}

function clearDraftFromStorage(teamId: string): void {
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${teamId}`);
  } catch {
    /* ignore */
  }
}

// ============================================================================
// SaveResult (aligned with use-story-form.ts SaveResult)
// ============================================================================

export interface SaveResult {
  type: "success" | "error";
  /** i18n-resolved message ready to display */
  message: string;
  /** VALIDATION_ERROR marker — parent can highlight the form */
  code?: string;
}

// mapped error.code -> i18n key (VALIDATION_ERROR intentionally NOT mapped so
// server byte-count message passes through; caller can still fall back to mapped)
const ERROR_CODE_I18N: Record<string, string> = {
  UNAUTHORIZED: "errors.loginRequired",
  FORBIDDEN: "errors.noPermission",
  NOT_FOUND: "errors.teamNotFound",
  INTERNAL_ERROR: "teams.actionbook.saveFailed",
};

interface UseTeamChecklistFormArgs {
  teamId: string;
  initialChecklist: TeamChecklist | null | undefined;
  /** i18n resolver; caller passes t bound to teams+errors namespace */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export interface UseTeamChecklistFormReturn {
  form: FormChecklist;
  setField: <K extends keyof FormChecklist>(key: K, value: FormChecklist[K]) => void;
  addAssignment: () => void;
  updateAssignment: (id: string, task: string) => void;
  removeAssignment: (id: string) => void;
  reset: () => void;
  isSaving: boolean;
  saveResult: SaveResult | null;
  clearSaveResult: () => void;
  draftAvailable: boolean;
  handleRestoreDraft: () => void;
  handleDiscardDraft: () => void;
  /** returns true on success */
  handleSave: () => Promise<boolean>;
  /** current serialized-payload byte count (for user-visible 2KB indicator) */
  currentBytes: number;
  overflowing: boolean;
}

export function useTeamChecklistForm({
  teamId,
  initialChecklist,
  t,
}: UseTeamChecklistFormArgs): UseTeamChecklistFormReturn {
  const [form, setForm] = React.useState<FormChecklist>(() =>
    checklistToForm(initialChecklist ?? null),
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveResult, setSaveResult] = React.useState<SaveResult | null>(null);
  const [draftAvailable, setDraftAvailable] = React.useState(false);
  const initialFormRef = React.useRef<FormChecklist>(checklistToForm(initialChecklist ?? null));
  // task #166 CR B2：spec §5「pre-submit + 3s debounce」—— 单次 setTimeout 替换 30s setInterval
  // unmount 时如果 timer 未 fire 主动 flush 一次，避免用户敲完就关页面丢改动
  const draftTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = React.useRef<FormChecklist>(form);
  const invalidToastRef = React.useRef(false);

  // 保持 formRef 与最新 form 同步（debounce 回调读 formRef，避免闭包陈旧）
  React.useEffect(() => {
    formRef.current = form;
  }, [form]);

  // Detect draft once on mount (guard against React 18 strict-mode double-invoke)
  React.useEffect(() => {
    const draft = loadDraft(teamId);
    if (!draft) return;
    if (isValidChecklistDraftShape(draft)) {
      setDraftAvailable(true);
    } else {
      clearDraftFromStorage(teamId);
      if (!invalidToastRef.current) {
        invalidToastRef.current = true;
        setSaveResult({ type: "error", message: t("teams.actionbook.draftInvalid") });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  // task #166 CR B2：3s debounce 草稿写入 —— 表单变化时重置计时器，
  // 用户停止输入 3s 后才落 localStorage。
  React.useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      saveDraftToStorage(teamId, formRef.current);
      draftTimer.current = null;
    }, 3000);
    return () => {
      // 表单变化触发 effect 重入：清掉旧 timer 即可，不要 flush（避免每次重渲染都写一次）
      if (draftTimer.current) {
        clearTimeout(draftTimer.current);
        draftTimer.current = null;
      }
    };
  }, [teamId, form]);

  // task #166 CR B2：组件卸载时同步 flush 一次 —— 避免用户敲完就关页面丢改动
  // 不论 timer 是否还在排队都 flush（last-known-good 永远是有用的），并把 timer 清掉避免 effect 1 重入时混淆
  React.useEffect(() => {
    return () => {
      if (draftTimer.current) {
        clearTimeout(draftTimer.current);
        draftTimer.current = null;
      }
      saveDraftToStorage(teamId, formRef.current);
    };
  }, [teamId]);

  const setField = React.useCallback(
    <K extends keyof FormChecklist>(key: K, value: FormChecklist[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const addAssignment = React.useCallback(() => {
    setForm((prev) => {
      if (prev.assignments.length >= 50) return prev;
      // crypto.randomUUID only guaranteed in browser; fallback for older jsdom
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      return {
        ...prev,
        assignments: [...prev.assignments, { id, task: "", assigneeIds: [] }],
      };
    });
  }, []);

  const updateAssignment = React.useCallback((id: string, task: string) => {
    setForm((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) => (a.id === id ? { ...a, task } : a)),
    }));
  }, []);

  const removeAssignment = React.useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((a) => a.id !== id),
    }));
  }, []);

  const reset = React.useCallback(() => {
    setForm({ ...initialFormRef.current });
  }, []);

  const clearSaveResult = React.useCallback(() => setSaveResult(null), []);

  const handleDiscardDraft = React.useCallback(() => {
    clearDraftFromStorage(teamId);
    setDraftAvailable(false);
  }, [teamId]);

  const handleRestoreDraft = React.useCallback(() => {
    const draft = loadDraft(teamId);
    if (!draft) {
      setDraftAvailable(false);
      return;
    }
    if (!isValidChecklistDraftShape(draft)) {
      // draft written by another tab between load & restore -> discard + toast
      clearDraftFromStorage(teamId);
      setDraftAvailable(false);
      setSaveResult({ type: "error", message: t("teams.actionbook.draftInvalid") });
      return;
    }
    setForm((prev) => ({ ...prev, ...draft } as FormChecklist));
    clearDraftFromStorage(teamId);
    setDraftAvailable(false);
  }, [teamId, t]);

  // Live byte count for user-visible 2KB indicator + submit guard
  const currentBytes = React.useMemo(() => {
    try {
      return new TextEncoder().encode(JSON.stringify(formToChecklistPayload(form))).length;
    } catch {
      return 0;
    }
  }, [form]);
  const overflowing = currentBytes > CHECKLIST_MAX_BYTES;

  const handleSave = React.useCallback(async (): Promise<boolean> => {
    setSaveResult(null);
    const payload = formToChecklistPayload(form);
    // Front-end 2KB pre-check (spec section 5: pre-submit, not per-keystroke)
    const serialized = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(serialized).length;
    if (bytes > CHECKLIST_MAX_BYTES) {
      setSaveResult({
        type: "error",
        code: "VALIDATION_ERROR",
        message: t("teams.actionbook.overflowError", {
          bytes,
          max: CHECKLIST_MAX_BYTES,
        }),
      });
      return false;
    }
    try {
      setIsSaving(true);
      const res = await fetchAPI(`/teams/${teamId}/checklist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: serialized,
      });
      const data = await res.json();
      if (data.success) {
        setSaveResult({ type: "success", message: t("teams.actionbook.saveSuccess") });
        clearDraftFromStorage(teamId);
        setDraftAvailable(false);
        // rebase initial form to server-confirmed state (converter drops empties)
        const refreshed = checklistToForm(data.checklist ?? payload);
        initialFormRef.current = refreshed;
        setForm(refreshed);
        return true;
      }
      // API failure -> 3-tier fallback
      const apiCode =
        typeof data.error === "object" && data.error !== null
          ? (data.error as { code?: string }).code
          : undefined;
      const apiMessage =
        typeof data.error === "string"
          ? data.error
          : (data.error as { message?: string } | undefined)?.message;
      // For VALIDATION_ERROR let apiMessage pass through (server carries "2397 bytes")
      const mapped =
        apiCode && apiCode !== "VALIDATION_ERROR" ? ERROR_CODE_I18N[apiCode] : undefined;
      setSaveResult({
        type: "error",
        code: apiCode,
        message:
          (mapped && t(mapped)) || apiMessage || t("teams.actionbook.saveFailed"),
      });
      return false;
    } catch {
      setSaveResult({ type: "error", message: t("teams.actionbook.saveNetworkError") });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [form, teamId, t]);

  return {
    form,
    setField,
    addAssignment,
    updateAssignment,
    removeAssignment,
    reset,
    isSaving,
    saveResult,
    clearSaveResult,
    draftAvailable,
    handleRestoreDraft,
    handleDiscardDraft,
    handleSave,
    currentBytes,
    overflowing,
  };
}
