"use client";

import * as React from "react";

import { useI18n } from "@/hooks/useI18n";
import { fetchAPI } from "@/lib/api";
import { adminCatchMessage, adminJsonOrThrow } from "@/lib/admin-i18n";

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
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(
    async (targetPage = 1, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({
          includeReferences: "true",
          pageSize: "200",
          page: String(targetPage),
        });
        if (targetPage === 1) query.delete("page");
        const response = await fetchAPI(`/tags?${query}`);
        const body = await adminJsonOrThrow<{
          tags?: ManagedTag[];
          pagination?: { page?: number; hasMore?: boolean };
        }>(response, t, "admin.management.loadFailed");
        if (!body.tags) throw new Error();
        const loadedTags = body.tags;
        setItems((current) =>
          append ? [...current, ...loadedTags] : loadedTags,
        );
        setPage(body.pagination?.page ?? targetPage);
        setHasMore(body.pagination?.hasMore ?? false);
      } catch (cause) {
        setError(adminCatchMessage(cause, t, "admin.management.loadFailed"));
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [t],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetchAPI("/tags", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await adminJsonOrThrow(response, t, "admin.management.saveFailed");
      setName("");
      await load();
    } catch (cause) {
      setError(adminCatchMessage(cause, t, "admin.management.saveFailed"));
    }
  };

  const rename = async (tag: ManagedTag) => {
    try {
      const response = await fetchAPI(`/tags/${encodeURIComponent(tag.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ name: tag.name }),
      });
      await adminJsonOrThrow(response, t, "admin.management.saveFailed");
      await load();
    } catch (cause) {
      setError(adminCatchMessage(cause, t, "admin.management.saveFailed"));
    }
  };

  const remove = async (tag: ManagedTag) => {
    const total = Object.values(tag.references).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (total > 0 && !window.confirm(t("admin.management.detachTagConfirm")))
      return;
    if (total === 0 && !window.confirm(t("admin.management.deleteTagConfirm")))
      return;
    try {
      const response = await fetchAPI(
        `/tags/${encodeURIComponent(tag.id)}?confirmDetach=true`,
        { method: "DELETE" },
      );
      await adminJsonOrThrow(response, t, "admin.management.deleteFailed");
      setItems((current) =>
        current.filter((candidate) => candidate.id !== tag.id),
      );
    } catch (cause) {
      setError(adminCatchMessage(cause, t, "admin.management.deleteFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={create}
        className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-sm sm:flex-row sm:items-end sm:p-5"
      >
        <label className="grid flex-1 gap-1.5 text-sm font-medium">
          {t("admin.management.name")}
          <input
            required
            maxLength={50}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-11 rounded-lg border border-border bg-background px-3"
          />
        </label>
        <button className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-primary-foreground">
          {t("admin.management.add")}
        </button>
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">{t("admin.management.loading")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((tag) => (
            <article
              key={tag.id}
              className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_9rem_auto] md:items-end"
            >
              <label className="grid gap-1 text-sm font-medium">
                {t("admin.management.name")}
                <input
                  value={tag.name}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((item) =>
                        item.id === tag.id
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                  className="min-h-11 rounded-lg border border-border bg-background px-3"
                />
              </label>
              <div className="text-sm">
                <span className="block text-muted-foreground">
                  {t("admin.management.locationTeamStoryRefs")}
                </span>
                <span className="font-medium">
                  {tag.references.locations} / {tag.references.teams} /{" "}
                  {tag.references.stories}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void rename(tag)}
                  className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold"
                >
                  {t("admin.management.save")}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(tag)}
                  className="min-h-11 rounded-lg border border-destructive/30 px-3 text-sm font-semibold text-destructive"
                >
                  {t("admin.management.delete")}
                </button>
              </div>
            </article>
          ))}
          {hasMore && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void load(page + 1, true)}
              className="min-h-11 w-full rounded-lg border border-border px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
            >
              {loadingMore
                ? t("admin.management.loading")
                : t("admin.management.loadMore")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
