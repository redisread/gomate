"use client";

import * as React from "react";
import { BookOpenText, Loader2, Plus } from "lucide-react";

import { useI18n } from "@/hooks/useI18n";
import { apiGet } from "@/lib/api";
import type { Team } from "@/lib/types";
import { StoryCard } from "./story-card";
import {
  buildStoriesPath,
  type StoryListResponse,
  type StoryV2,
} from "./story-contract";

const PAGE_SIZE = 4;

type StoryRecapScope =
  | { type: "location"; id: string }
  | { type: "team"; id: string };

interface StoryRecapFeedProps {
  scope: StoryRecapScope;
  canPublish?: boolean;
}

function buildRecapPath(
  scopeType: StoryRecapScope["type"],
  scopeId: string,
  cursor?: string | null,
) {
  return buildStoriesPath({
    limit: PAGE_SIZE,
    cursor,
    ...(scopeType === "location"
      ? { locationId: scopeId }
      : { teamId: scopeId }),
  });
}

function StoryRecapSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="grid gap-4 sm:grid-cols-2"
    >
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-lg border border-border/60 bg-card"
        >
          <div className="aspect-[4/3] animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function StoryRecapFeed({
  scope,
  canPublish = false,
}: StoryRecapFeedProps) {
  const { t } = useI18n(["content"]);
  const scopeType = scope.type;
  const scopeId = scope.id;
  const [stories, setStories] = React.useState<StoryV2[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const requestGeneration = React.useRef(0);

  const loadFirstPage = React.useCallback(async () => {
    const generation = ++requestGeneration.current;
    setIsLoading(true);
    setHasError(false);
    try {
      const result = await apiGet<StoryListResponse>(
        buildRecapPath(scopeType, scopeId),
      );
      if (
        generation !== requestGeneration.current ||
        result.success !== true ||
        !Array.isArray(result.data?.items)
      ) {
        if (generation === requestGeneration.current) {
          throw new Error("Invalid Story feed");
        }
        return;
      }
      setStories(result.data.items);
      setNextCursor(result.data.nextCursor);
    } catch {
      if (generation === requestGeneration.current) {
        setStories([]);
        setNextCursor(null);
        setHasError(true);
      }
    } finally {
      if (generation === requestGeneration.current) setIsLoading(false);
    }
  }, [scopeId, scopeType]);

  React.useEffect(() => {
    void loadFirstPage();
    return () => {
      requestGeneration.current += 1;
    };
  }, [loadFirstPage]);

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    const generation = requestGeneration.current;
    setIsLoadingMore(true);
    setHasError(false);
    try {
      const result = await apiGet<StoryListResponse>(
        buildRecapPath(scopeType, scopeId, nextCursor),
      );
      if (
        generation !== requestGeneration.current ||
        result.success !== true ||
        !Array.isArray(result.data?.items)
      ) {
        if (generation === requestGeneration.current) {
          throw new Error("Invalid Story feed");
        }
        return;
      }
      setStories((current) => [...current, ...result.data.items]);
      setNextCursor(result.data.nextCursor);
    } catch {
      if (generation === requestGeneration.current) setHasError(true);
    } finally {
      if (generation === requestGeneration.current) setIsLoadingMore(false);
    }
  };

  const titleId = `story-recap-${scopeType}-${scopeId}`;
  const titleKey =
    scopeType === "location"
      ? "content.storyRecap.locationTitle"
      : "content.storyRecap.teamTitle";
  const emptyKey =
    scopeType === "location"
      ? "content.storyRecap.emptyLocation"
      : "content.storyRecap.emptyTeam";

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-[20px] bg-card px-5 py-6 shadow-[0_8px_28px_rgba(82,58,31,0.08)] sm:px-7 sm:py-7"
      data-testid={`${scopeType}-story-recap-feed`}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id={titleId}
            className="flex items-center gap-2 text-lg font-bold text-foreground"
          >
            <BookOpenText className="h-5 w-5 text-amber-600" aria-hidden="true" />
            {t(titleKey)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("content.storyRecap.subtitle")}
          </p>
        </div>
        {scopeType === "team" && canPublish && (
          <a
            href={`/discover/create?teamId=${encodeURIComponent(scopeId)}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("content.storyRecap.publish")}
          </a>
        )}
      </div>

      {isLoading ? (
        <StoryRecapSkeleton label={t("content.storyRecap.loading")} />
      ) : hasError ? (
        <div
          role="alert"
          className="rounded-xl bg-secondary/70 px-4 py-6 text-center"
        >
          <p className="text-sm text-muted-foreground">
            {t("content.storyRecap.loadError")}
          </p>
          <button
            type="button"
            onClick={() => void loadFirstPage()}
            className="mt-3 min-h-10 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("content.storyRecap.retry")}
          </button>
        </div>
      ) : stories.length === 0 ? (
        <div className="rounded-xl bg-secondary/70 px-4 py-8 text-center">
          <BookOpenText
            className="mx-auto h-8 w-8 text-muted-foreground/60"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">{t(emptyKey)}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onClick={() => {
                  window.location.href = `/discover/${story.id}`;
                }}
                className="mb-0"
              />
            ))}
          </div>
          {nextCursor && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isLoadingMore && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {t("content.storyRecap.loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function LocationStoryRecapFeed({ locationId }: { locationId: string }) {
  return <StoryRecapFeed scope={{ type: "location", id: locationId }} />;
}

export function TeamStoryRecapFeed({
  team,
  isLeader,
  isMember,
}: {
  team: Pick<Team, "id" | "lifecycle">;
  isLeader: boolean;
  isMember: boolean;
}) {
  const canPublish =
    team.lifecycle === "completed" && (isLeader || isMember);
  return (
    <StoryRecapFeed
      scope={{ type: "team", id: team.id }}
      canPublish={canPublish}
    />
  );
}
