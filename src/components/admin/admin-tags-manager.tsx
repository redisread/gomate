"use client";

import * as React from "react";

import { useI18n } from "@/hooks/useI18n";
import { apiPatch, apiPost, fetchAPI, getApiErrorMessage } from "@/lib/api";

interface ManagedTag {
  id: string;
  name: string;
  slug: string;
  references: { locations: number; teams: number; stories: number };
}

export function AdminTagsManager() {
  const { t } = useI18n(["admin"]);
  const [items, setItems] = React.useState<ManagedTag[]>([]);
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAPI("/tags?includeReferences=true&pageSize=200");
      const body = await response.json() as { tags?: ManagedTag[] };
      if (!response.ok || !body.tags) throw new Error(getApiErrorMessage(body, t("admin.management.loadFailed")));
      setItems(body.tags);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("admin.management.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => { void load(); }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiPost("/tags", { name });
      setName("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("admin.management.saveFailed"));
    }
  };

  const rename = async (tag: ManagedTag) => {
    try {
      await apiPatch(`/tags/${encodeURIComponent(tag.id)}`, { name: tag.name });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("admin.management.saveFailed"));
    }
  };

  const remove = async (tag: ManagedTag) => {
    const total = Object.values(tag.references).reduce((sum, count) => sum + count, 0);
    if (total > 0 && !window.confirm(t("admin.management.detachTagConfirm"))) return;
    if (total === 0 && !window.confirm(t("admin.management.deleteTagConfirm"))) return;
    const response = await fetchAPI(`/tags/${encodeURIComponent(tag.id)}?confirmDetach=true`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json();
      setError(getApiErrorMessage(body, t("admin.management.deleteFailed")));
      return;
    }
    setItems((current) => current.filter((candidate) => candidate.id !== tag.id));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-sm sm:flex-row sm:items-end sm:p-5">
        <label className="grid flex-1 gap-1.5 text-sm font-medium">
          {t("admin.management.name")}
          <input required maxLength={50} value={name} onChange={(event) => setName(event.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3" />
        </label>
        <button className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-primary-foreground">{t("admin.management.add")}</button>
      </form>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {loading ? <p role="status">{t("admin.management.loading")}</p> : (
        <div className="space-y-3">
          {items.map((tag) => (
            <article key={tag.id} className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_9rem_auto] md:items-end">
              <label className="grid gap-1 text-sm font-medium">
                {t("admin.management.name")}
                <input value={tag.name} onChange={(event) => setItems((current) => current.map((item) => item.id === tag.id ? { ...item, name: event.target.value } : item))} className="min-h-11 rounded-lg border border-border bg-background px-3" />
              </label>
              <div className="text-sm">
                <span className="block text-muted-foreground">{t("admin.management.locationTeamStoryRefs")}</span>
                <span className="font-medium">{tag.references.locations} / {tag.references.teams} / {tag.references.stories}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void rename(tag)} className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold">{t("admin.management.save")}</button>
                <button type="button" onClick={() => void remove(tag)} className="min-h-11 rounded-lg border border-destructive/30 px-3 text-sm font-semibold text-destructive">{t("admin.management.delete")}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
