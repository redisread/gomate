/**
 * P1b API Key 管理 UI（#210）
 *
 * 使用 authClient.apiKey SDK 方法对接 better-auth api-key 插件，
 * 不依赖 P1a /v1/ 端点。
 */

"use client";

import * as React from "react";
import {
  Key,
  Plus,
  Copy,
  Check,
  Loader2,
  Trash2,
  AlertCircle,
  X,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useToast } from "@/hooks/useToast";
import { authClient } from "@/lib/auth-client";


/** 每用户 Key 上限（与后端 P1a 配置对齐） */
const USER_KEY_LIMIT = 10;

function formatDate(date: Date | string | undefined | null): string {
  if (!date) return "-";
  try {
    const d = new Date(date);
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(date ?? "-");
  }
}

export function ApiKeysClient() {
  const { t } = useI18n(["common"]);
  const { show: showToast } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [keys, setKeys] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // Success state
  const [createdKey, setCreatedKey] = React.useState<{ name: string; value: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Revoke confirm
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [revoking, setRevoking] = React.useState(false);

  // Load keys
  const loadKeys = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await authClient.apiKey.list({});
      if (err) {
        setError(err.message || t("common.loadFailed"));
        return;
      }
      setKeys((data?.apiKeys ?? data ?? []).filter((k: Record<string, unknown>) => k.enabled !== false));
    } catch (err) {
      console.error("[ApiKeys] load failed:", err);
      setError(t("common.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  // Create key
  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const { data, error: err } = await authClient.apiKey.create({
        name: newKeyName.trim(),
      });
      if (err) {
        showToast({ type: "error", message: err.message || t("common.createFailed") });
        return;
      }
      if (data) {
        setCreatedKey({ name: data.name ?? "", value: data.key ?? "" });
        setShowCreate(false);
        setNewKeyName("");
        await loadKeys();
      }
    } catch (err) {
      console.error("[ApiKeys] create failed:", err);
      showToast({ type: "error", message: t("common.createFailed") });
    } finally {
      setCreating(false);
    }
  };

  // Delete key
  const handleDelete = async (keyId: string) => {
    setRevoking(true);
    try {
      const { error: err } = await authClient.apiKey.delete({ keyId });
      if (err) {
        showToast({ type: "error", message: err.message || t("common.revokeFailed") });
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      showToast({ type: "success", message: t("common.apiKeyRevoked") || "API Key 已撤销" });
    } catch {
      showToast({ type: "error", message: t("common.revokeFailed") });
    } finally {
      setRevoking(false);
      setRevokingId(null);
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.warn("[ApiKeys] clipboard write failed");
    }
  };

  const atLimit = keys.length >= USER_KEY_LIMIT;

  // ==================== Render ====================

  return (
    <main className="min-h-screen bg-[var(--anthropic-bg)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("common.apiKeys")}</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t("common.apiKeysDesc")}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            disabled={atLimit}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            {t("common.createKey")}
          </button>
        </div>

        {/* At limit hint */}
        {atLimit && (
          <div className="mb-6 p-3 rounded-xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-sm text-stone-600 dark:text-stone-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            已达到上限（{USER_KEY_LIMIT} 个 Key）。请撤销旧的 Key 后再创建。
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </span>
            <button type="button" onClick={() => void loadKeys()} className="underline hover:no-underline">
              {t("common.retry")}
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-stone-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && keys.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/30 mb-4">
              <Key className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{t("common.noApiKeys")}</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 max-w-md mx-auto">
              {t("common.apiKeysEmptyDesc")}
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t("common.createFirstKey")}
            </button>
          </div>
        )}

        {/* Key list */}
        {!isLoading && !error && keys.length > 0 && (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="rounded-xl border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="h-4 w-4 text-stone-400" />
                    <span title={key.name} className="text-sm font-semibold text-foreground truncate">{key.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                    <span>{key.prefix}...</span>
                    <span>创建于 {formatDate(key.createdAt)}</span>
                    {key.lastRequest && <span>最后使用 {formatDate(key.lastRequest)}</span>}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-medium">
                      {t("common.active")}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRevokingId(key.id)}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-stone-400 hover:text-red-500 transition-colors"
                  title={t("common.revoke")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Create Modal ─── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{t("common.createApiKey")}</h2>
              <button type="button" onClick={() => { setShowCreate(false); setNewKeyName(""); }} className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  {t("common.name")} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t("common.apiKeyNamePlaceholder")}
                  maxLength={50}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Scope — P1b 只开放读 scope */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">{t("common.scope")}</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50/60 dark:bg-zinc-800/40">
                    <Check className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-foreground">{t("common.readScope")}</span>
                    <span className="text-xs text-stone-400 ml-auto">{t("common.defaultEnabled")}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 dark:border-zinc-800 opacity-50">
                    <X className="h-4 w-4 text-stone-300" />
                    <span className="text-sm text-stone-400">{t("common.writeScope")}</span>
                    <span className="text-xs text-stone-400 ml-auto">{t("common.comingSoon")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => { setShowCreate(false); setNewKeyName(""); }} className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating || !newKeyName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 dark:disabled:bg-zinc-700 text-white text-sm font-semibold transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("common.create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Key Reveal Modal ─── */}
      {createdKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
              <Key className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-center text-foreground mb-2">{t("common.apiKeyCreated")}</h2>
            <p className="text-sm text-center text-stone-500 dark:text-stone-400 mb-1">
              "{createdKey.name}" 的密钥如下
            </p>
            <p className="text-xs text-center text-amber-600 dark:text-amber-400 mb-4 font-medium">
              {t("common.apiKeyOnceWarning")}
            </p>

            <div className="bg-stone-50 dark:bg-zinc-800 rounded-xl border border-stone-200 dark:border-zinc-700 p-4 mb-4">
              <code className="block text-sm font-mono text-foreground break-all select-all">
                {createdKey.value}
              </code>
            </div>

            <button
              type="button"
              onClick={() => void handleCopy(createdKey.value)}
              className="w-full py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 mb-2"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? t("common.copied") : t("common.copyKey")}
            </button>

            <button
              type="button"
              onClick={() => setCreatedKey(null)}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}

      {/* ─── Revoke Confirmation ─── */}
      {revokingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-center text-foreground mb-2">{t("common.revokeApiKey")}</h2>
            <p className="text-sm text-center text-stone-500 dark:text-stone-400 mb-6">{t("common.revokeApiKeyDesc")}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setRevokingId(null)} className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(revokingId)}
                disabled={revoking}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {revoking && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("common.confirmRevoke")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
