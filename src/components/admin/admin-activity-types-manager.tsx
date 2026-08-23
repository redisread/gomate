"use client";

import * as React from "react";

import { useI18n } from "@/hooks/useI18n";
import { apiPatch, apiPost, fetchAPI, getApiErrorMessage } from "@/lib/api";
import type { ActivityTypeInfo } from "@/lib/types";

type ManagedActivityType = ActivityTypeInfo & {
  references: { teams: number; locations: number };
};

export function AdminActivityTypesManager() {
  const { t } = useI18n(["admin"]);
  const [items, setItems] = React.useState<ManagedActivityType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAPI("/activity-types?includeInactive=true");
      const body = await response.json() as {
        activityTypes?: ManagedActivityType[];
      };
      if (!response.ok || !body.activityTypes) {
        throw new Error(getApiErrorMessage(body, t("admin.management.loadFailed")));
      }
      setItems(body.activityTypes);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("admin.management.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => { void load(); }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingId("new");
    setError("");
    try {
      await apiPost("/activity-types", {
        name,
        ...(slug.trim() ? { slug: slug.trim() } : {}),
      });
      setName("");
      setSlug("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("admin.management.saveFailed"));
    } finally {
      setSavingId(null);
    }
  };

  const save = async (item: ManagedActivityType) => {
    setSavingId(item.id);
    setError("");
    try {
      await apiPatch(`/activity-types/${encodeURIComponent(item.id)}`, {
        name: item.name,
        sortOrder: item.sortOrder,
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("admin.management.saveFailed"));
    } finally {
      setSavingId(null);
    }
  };

  const toggle = async (item: ManagedActivityType) => {
    setSavingId(item.id);
    setError("");
    try {
      await apiPatch(`/activity-types/${encodeURIComponent(item.id)}`, {
        isActive: !item.isActive,
      });
      setItems((current) => current.map((candidate) =>
        candidate.id === item.id
          ? { ...candidate, isActive: !candidate.isActive }
          : candidate,
      ));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("admin.management.saveFailed"));
    } finally {
      setSavingId(null);
    }
  };

  const update = (id: string, changes: Partial<ManagedActivityType>) => {
    setItems((current) => current.map((item) =>
      item.id === id ? { ...item, ...changes } : item,
    ));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 rounded-xl bg-card p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:p-5">
        <label className="grid gap-1.5 text-sm font-medium">
          {t("admin.management.name")}
          <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          {t("admin.management.slugOptional")}
          <input value={slug} onChange={(event) => setSlug(event.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3" />
        </label>
        <button disabled={savingId === "new"} className="min-h-11 self-end rounded-lg bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">
          {t("admin.management.add")}
        </button>
      </form>

      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {loading ? <p role="status">{t("admin.management.loading")}</p> : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] md:items-end">
              <label className="grid gap-1 text-sm font-medium">
                {t("admin.management.name")}
                <input value={item.name} onChange={(event) => update(item.id, { name: event.target.value })} className="min-h-11 rounded-lg border border-border bg-background px-3" />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                {t("admin.management.sortOrder")}
                <input type="number" value={item.sortOrder} onChange={(event) => update(item.id, { sortOrder: Number(event.target.value) })} className="min-h-11 rounded-lg border border-border bg-background px-3" />
              </label>
              <div className="text-sm">
                <span className="block text-muted-foreground">{t("admin.management.teamLocationRefs")}</span>
                <span className="font-medium">{item.references.teams} / {item.references.locations}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={savingId === item.id} onClick={() => void save(item)} className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-50">{t("admin.management.save")}</button>
                <button type="button" disabled={savingId === item.id} onClick={() => void toggle(item)} className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-50">
                  {t(item.isActive ? "admin.management.deactivate" : "admin.management.activate")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
