"use client";

import * as React from "react";

import { useI18n } from "@/hooks/useI18n";
import { fetchAPI } from "@/lib/api";
import { adminCatchMessage, adminJsonOrThrow, userRoleKey, userStatusKey } from "@/lib/admin-i18n";
import type { AdminUserSummary } from "@/lib/types";

export function AdminUsersManager({ adminId }: { adminId: string }) {
  const { t } = useI18n(["admin", "enums"]);
  const [users, setUsers] = React.useState<AdminUserSummary[]>([]);
  const [query, setQuery] = React.useState("");
  const [activeQuery, setActiveQuery] = React.useState("");
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async (
    search = "",
    cursor?: string,
    append = false,
  ) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("q", search);
      if (cursor) params.set("cursor", cursor);
      const response = await fetchAPI(`/admin/users?${params}`);
      const body = await adminJsonOrThrow<{
        users?: AdminUserSummary[];
        nextCursor?: string | null;
      }>(response, t, "admin.management.loadFailed");
      if (!body.users) throw new Error();
      const loadedUsers = body.users;
      setUsers((current) => append ? [...current, ...loadedUsers] : loadedUsers);
      setNextCursor(body.nextCursor ?? null);
    } catch (cause) {
      setError(adminCatchMessage(cause, t, "admin.management.loadFailed"));
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [t]);

  React.useEffect(() => { void load(); }, [load]);

  const changeRole = async (user: AdminUserSummary) => {
    const role = user.role === "admin" ? "user" : "admin";
    if (!window.confirm(t("admin.management.roleConfirm"))) return;
    try {
      const response = await fetchAPI(`/admin/users/${encodeURIComponent(user.id)}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await adminJsonOrThrow(response, t, "admin.management.saveFailed");
      setUsers((current) => current.map((candidate) =>
        candidate.id === user.id ? { ...candidate, role } : candidate,
      ));
    } catch (cause) {
      setError(adminCatchMessage(cause, t, "admin.management.saveFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => { event.preventDefault(); setActiveQuery(query); void load(query); }} role="search" className="flex gap-3 rounded-xl bg-card p-4 shadow-sm sm:p-5">
        <label className="grid flex-1 gap-1.5 text-sm font-medium">
          {t("admin.management.searchUsers")}
          <input type="search" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3" />
        </label>
        <button className="min-h-11 self-end rounded-lg bg-primary px-4 font-semibold text-primary-foreground">{t("admin.management.search")}</button>
      </form>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {loading ? <p role="status">{t("admin.management.loading")}</p> : users.length === 0 ? (
        <p role="status" className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">{t("admin.management.noUsers")}</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const isCurrent = user.id === adminId;
            return (
              <article key={user.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{user.nickname ?? user.name}</h2>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t(userStatusKey(user.status))} · {t(userRoleKey(user.role))}</p>
                </div>
                <button type="button" disabled={isCurrent} aria-label={isCurrent ? t("admin.management.currentUser") : undefined} onClick={() => void changeRole(user)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                  {isCurrent ? t("admin.management.currentUser") : t(user.role === "admin" ? "admin.management.revokeAdmin" : "admin.management.makeAdmin")}
                </button>
              </article>
            );
          })}
          {nextCursor && (
            <button type="button" disabled={loadingMore} onClick={() => void load(activeQuery, nextCursor, true)} className="min-h-11 w-full rounded-lg border border-border px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-60">
              {loadingMore ? t("admin.management.loading") : t("admin.management.loadMore")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
