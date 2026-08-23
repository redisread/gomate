"use client";

import * as React from "react";

import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, getApiErrorMessage } from "@/lib/api";
import type { Location, LocationStatus } from "@/lib/types";

export function AdminLocationsManager() {
  const { t } = useI18n(["admin"]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<LocationStatus | "">("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async (filters?: { search: string; status: string }) => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ limit: "100" });
      if (filters?.search) query.set("search", filters.search);
      if (filters?.status) query.set("status", filters.status);
      const response = await fetchAPI(`/locations/admin?${query}`);
      const body = await response.json() as { locations?: Location[] };
      if (!response.ok || !body.locations) throw new Error(getApiErrorMessage(body, t("admin.management.loadFailed")));
      setLocations(body.locations);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("admin.management.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => { void load(); }, [load]);

  const archive = async (location: Location) => {
    if (!window.confirm(t("admin.locationsManagement.archiveConfirm"))) return;
    const response = await fetchAPI(`/locations/${encodeURIComponent(location.id)}`, { method: "DELETE" });
    if (!response.ok) {
      setError(getApiErrorMessage(await response.json(), t("admin.management.saveFailed")));
      return;
    }
    setLocations((current) => current.map((candidate) =>
      candidate.id === location.id ? { ...candidate, status: "archived" } : candidate,
    ));
  };

  const permanentlyDelete = async (location: Location) => {
    const confirmation = window.prompt(t("admin.locationsManagement.permanentPrompt"), "");
    if (confirmation !== location.id) return;
    const query = new URLSearchParams({ permanent: "true", confirm: confirmation });
    const response = await fetchAPI(`/locations/${encodeURIComponent(location.id)}?${query}`, { method: "DELETE" });
    if (!response.ok) {
      setError(getApiErrorMessage(await response.json(), t("admin.locationsManagement.permanentBlocked")));
      return;
    }
    setLocations((current) => current.filter((candidate) => candidate.id !== location.id));
  };

  const statusCopy = (locationStatus: LocationStatus) => ({
    draft: t("admin.statusDraft"),
    published: t("admin.statusPublished"),
    archived: t("admin.statusArchived"),
  })[locationStatus];

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => { event.preventDefault(); void load({ search, status }); }} role="search" className="grid gap-3 rounded-xl bg-card p-4 shadow-sm sm:grid-cols-[1fr_12rem_auto] sm:items-end sm:p-5">
        <label className="grid gap-1.5 text-sm font-medium">
          {t("admin.locationsManagement.search")}
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          {t("admin.locationsManagement.status")}
          <select value={status} onChange={(event) => setStatus(event.target.value as LocationStatus | "")} className="min-h-11 rounded-lg border border-border bg-background px-3">
            <option value="">{t("admin.locationsManagement.allStatuses")}</option>
            <option value="draft">{t("admin.statusDraft")}</option>
            <option value="published">{t("admin.statusPublished")}</option>
            <option value="archived">{t("admin.statusArchived")}</option>
          </select>
        </label>
        <button className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-primary-foreground">{t("admin.management.search")}</button>
      </form>

      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {loading ? <p role="status">{t("admin.management.loading")}</p> : locations.length === 0 ? (
        <p role="status" className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">{t("admin.noLocations")}</p>
      ) : (
        <div className="space-y-3">
          {locations.map((location) => (
            <article key={location.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{location.name}</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{statusCopy(location.status)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{location.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{location.region?.name}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`/admin/locations/${location.id}/edit`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold">{t("admin.editLocation")}</a>
                {location.status !== "archived" && <button type="button" onClick={() => void archive(location)} className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold">{t("admin.locationsManagement.archive")}</button>}
                {location.status === "archived" && <button type="button" onClick={() => void permanentlyDelete(location)} className="min-h-11 rounded-lg border border-destructive/30 px-3 text-sm font-semibold text-destructive">{t("admin.locationsManagement.permanentDelete")}</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
