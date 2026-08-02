import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Eye,
  FileText,
  Heart,
  Loader2,
  MapPin,
  Share2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Story, TFunction } from "./story-detail-types";
import type { StoryMetric } from "./story-detail-utils";

export const CONTENT_WIDTH = "mx-auto w-full max-w-3xl px-4 sm:px-6";
export const SHELL_WIDTH = "mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8";

export function StoryEyebrow({ story, showDraftBadge, t }: { story: Story; showDraftBadge?: boolean; t: TFunction }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-primary">
        {story.location?.name || t("content.discover.outdoorStory")}
      </span>
      {/* task #156（Steven 设计稿）：作者查看自己的 draft 时渲染草稿 badge */}
      {showDraftBadge && (
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
          {t("content.discover.draftBadge")}
        </span>
      )}
    </div>
  );
}

export function StoryByline({
  story,
  metrics,
  t,
}: {
  story: Story;
  metrics: StoryMetric[];
  t: TFunction;
}) {
  const authorName = story.author?.name || t("content.discover.anonymous");

  return (
    <div className="border-y border-border/70 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={story.author?.image} name={authorName} size="md" />
          <div className="min-w-0">
            <p title={authorName} className="truncate text-sm font-medium text-foreground">{authorName}</p>
            <p className="text-sm text-muted-foreground">{metrics[0].value}</p>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground sm:justify-end">
          {metrics.slice(1).map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="h-4 w-4" aria-hidden="true" />
              <dt className="sr-only">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function RelatedLocationLink({ story, t }: { story: Story; t: TFunction }) {
  if (!story.location) return null;

  return (
    <aside className="mt-12">
      <a
        href={`/locations/${story.location.slug}`}
        className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={t("content.discover.openLocation", { name: story.location.name })}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium uppercase text-muted-foreground">
            {t("content.discover.relatedLocation")}
          </span>
          <span title={story.location.name} className="block truncate font-semibold text-foreground transition-colors group-hover:text-primary">
            {story.location.name}
          </span>
        </span>
        <ArrowRight
          className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </a>
    </aside>
  );
}

export function StoryActions({
  liked,
  likeCount,
  isLiking,
  onLike,
  onShare,
  viewsText,
  t,
}: {
  liked: boolean;
  likeCount: number;
  isLiking: boolean;
  onLike: () => void;
  onShare: () => void;
  viewsText?: string;
  t: TFunction;
}) {
  return (
    <div className="mt-12 border-t border-border pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
        <button
          type="button"
          onClick={onLike}
          disabled={isLiking}
          aria-pressed={liked}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed",
            liked
              ? "bg-primary text-primary-foreground disabled:opacity-95"
              : "border border-border bg-card text-foreground hover:border-primary/40 hover:text-primary",
          )}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} aria-hidden="true" />
          {liked ? t("content.discover.liked") : t("content.discover.like")}
          <span className="text-current/75">({likeCount})</span>
        </button>

        <button
          type="button"
          onClick={onShare}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {t("content.discover.share")}
        </button>
      </div>
      {viewsText && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" aria-hidden="true" />
          {viewsText}
        </p>
      )}
    </div>
  );
}

export function StoryDeleteButton({
  onClick,
  t,
}: {
  onClick: () => void;
  t: TFunction;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-destructive transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="hidden sm:inline">{t("content.discover.deleteStory")}</span>
    </button>
  );
}

export function StoryDeleteDialog({
  deleteError,
  isDeleting,
  onCancel,
  onDelete,
  t,
}: {
  deleteError: string;
  isDeleting: boolean;
  onCancel: () => void;
  onDelete: () => void;
  t: TFunction;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-story-title"
        aria-describedby="delete-story-description"
        className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 id="delete-story-title" className="mb-2 text-lg font-bold text-foreground">
          {t("content.discover.deleteConfirmTitle")}
        </h3>
        <p id="delete-story-description" className="mb-5 text-sm leading-relaxed text-muted-foreground">
          {t("content.discover.deleteConfirmDesc")}
        </p>
        {deleteError && (
          <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {deleteError}
          </p>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="mb-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isDeleting ? t("content.discover.deletingStory") : t("content.discover.deleteStory")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="min-h-11 w-full rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}

export function StoryDetailError({ message, t }: { message: string; t: TFunction }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-24">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <FileText className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">{message}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t("content.discover.storyUnavailableDesc")}
        </p>
        <a
          href="/discover"
          className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("content.discover.backToDiscover")}
        </a>
      </div>
    </div>
  );
}
