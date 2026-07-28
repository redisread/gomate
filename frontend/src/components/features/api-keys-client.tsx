/**
 * P1b API Key 管理 UI（#210）
 *
 * 对接 better-auth api-key 插件端点（/auth/api-key/*），
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
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/hooks/useToast";
import { fetchAPI } from "@/lib/api";

// ==================== Types ====================

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  /** 完整 key 值，仅在创建时返回 */
  key?: string;
  scope: string[];
  createdAt: string;
  lastUsedAt: string | null;
  status: "active" | "revoked";
}

interface ApiKeyListResponse {
  success: boolean;
  keys: ApiKey[];
}

interface ApiKeyCreateResponse {
  success: boolean;
  key: ApiKey;
}

interface ApiKeyRevokeResponse {
  success: boolean;
}

// ==================== Constants ====================

// P1a 配置后由服务端下发，UI 不做硬编码
const USER_KEY_LIMIT = 10;
const SCOPE_OPTIONS = [
  { value: "read", label: "读取", enabled: true },
  { value: "write", label: "写入", enabled: false },
] as const;

// ==================== Helpers ====================

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ==================== Component ====================

export function ApiKeysClient() {

  const { show: showToast } = useToast();

  const [keys, setKeys] = React.useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [showScopeRead] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  // Success state - showing the key value once
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
      const res = await fetchAPI("/auth/api-key/list", { method: "GET" });
      const json = (await res.json()) as ApiKeyListResponse;
      if (json.success) {
        setKeys(json.keys.filter((k) => k.status === "active"));
      } else {
        setError("无法加载 API Key 列表");
      }
    } catch (err) {
      console.error("[ApiKeys] load failed:", err);
      setError("加载失败，请稍后重试");
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
      const scope: string[] = [];
      if (showScopeRead) scope.push("read");
      const res = await fetchAPI("/auth/api-key/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim(), scope }),
      });
      const json = (await res.json()) as ApiKeyCreateResponse;
      if (json.success && json.key) {
        setCreatedKey({ name: json.key.name, value: json.key.key ?? "" });
        setShowCreate(false);
        setNewKeyName("");
        // Reload key list
        await loadKeys();
      } else {
        showToast({ type: "error", message: "创建失败" });
      }
    } catch (err) {
      console.error("[ApiKeys] create failed:", err);
      showToast({ type: "error", message: "创建失败，请稍后重试" });
    } finally {
      setCreating(false);
    }
  };

  // Revoke key
  const handleRevoke = async (id: string) => {
    setRevoking(true);
    try {
      const res = await fetchAPI("/auth/api-key/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json()) as ApiKeyRevokeResponse;
      if (json.success) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        showToast({ type: "success", message: "API Key 已撤销" });
      } else {
        showToast({ type: "error", message: "撤销失败" });
      }
    } catch {
      showToast({ type: "error", message: "撤销失败" });
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
      // Clipboard API not available, silently fail
      console.warn("[ApiKeys] clipboard write failed");
    }
  };

  const atLimit = keys.length >= USER_KEY_LIMIT;

  // ==================== Render ====================

  return (
    <main className="min-h-screen bg-[var(--anthropic-bg)]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">API Key 管理</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              管理你的 API Key，用于第三方应用访问 gomate 数据
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            disabled={atLimit}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            创建 Key
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
              重试
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
            <h3 className="text-lg font-semibold text-foreground mb-2">还没有 API Key</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 max-w-md mx-auto">
              API Key 可以让你的第三方应用安全地访问 gomate 数据。创建第一个 Key 即可开始集成。
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="h-4 w-4" />
              创建第一个 Key
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
                    <span className="text-sm font-semibold text-foreground truncate">{key.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                    <span>{key.prefix}...</span>
                    <span>创建于 {formatDate(key.createdAt)}</span>
                    {key.lastUsedAt && <span>最后使用 {formatDate(key.lastUsedAt)}</span>}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-medium">
                      活跃
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRevokingId(key.id)}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-stone-400 hover:text-red-500 transition-colors"
                  title="撤销"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />

      {/* ─── Create Modal ─── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">创建 API Key</h2>
              <button type="button" onClick={() => { setShowCreate(false); setNewKeyName(""); }} className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  名称 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="例如：我的应用"
                  maxLength={50}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Scope */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">权限范围</label>
                <div className="space-y-2">
                  {SCOPE_OPTIONS.map((opt) => (
                    <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border ${!opt.enabled ? "border-stone-100 dark:border-zinc-800 opacity-50" : "border-stone-200 dark:border-zinc-700"} cursor-pointer`}>
                      <input
                        type="checkbox"
                        checked={opt.value === "read" ? showScopeRead : false}
                        onChange={() => {}}
                        disabled={!opt.enabled}
                        className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm text-foreground">{opt.label}</span>
                      {!opt.enabled && (
                        <span className="text-xs text-stone-400 ml-auto">即将开放</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => { setShowCreate(false); setNewKeyName(""); }} className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating || !newKeyName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 dark:disabled:bg-zinc-700 text-white text-sm font-semibold transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                创建
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
            <h2 className="text-lg font-bold text-center text-foreground mb-2">API Key 已创建</h2>
            <p className="text-sm text-center text-stone-500 dark:text-stone-400 mb-1">
              "{createdKey.name}" 的密钥如下
            </p>
            <p className="text-xs text-center text-amber-600 dark:text-amber-400 mb-4 font-medium">
              ⚠ 关闭后不再可见。请立即复制并妥善保存。
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
              {copied ? "已复制" : "复制密钥"}
            </button>

            <button
              type="button"
              onClick={() => setCreatedKey(null)}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
            >
              关闭
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
            <h2 className="text-lg font-bold text-center text-foreground mb-2">撤销 API Key？</h2>
            <p className="text-sm text-center text-stone-500 dark:text-stone-400 mb-6">
              使用此 Key 的应用将立即无法访问 gomate 数据。此操作不可撤销。
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setRevokingId(null)} className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleRevoke(revokingId)}
                disabled={revoking}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {revoking && <Loader2 className="h-4 w-4 animate-spin" />}
                确认撤销
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
