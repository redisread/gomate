"use client";

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { formatTimeAgo } from "@/lib/date-utils";
import { ImageGrid } from "./image-grid";
import { Trash2 } from "lucide-react";

export interface ActivityPost {
  id: string;
  content: string;
  images: string[];
  status: "visible" | "hidden" | "deleted";
  createdAt: number;
  updatedAt: number;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  team?: {
    id: string;
    title: string;
  } | null;
}

interface ActivityPostCardProps {
  post: ActivityPost;
  showTeam?: boolean;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
  className?: string;
}

export function ActivityPostCard({
  post,
  showTeam = false,
  showDelete = false,
  onDelete,
  className,
}: ActivityPostCardProps) {
  const { t } = useI18n(["teams", "common"]);

  const handleDelete = () => {
    if (onDelete && confirm(t("activityPosts.confirmDelete"))) {
      onDelete(post.id);
    }
  };

  return (
    <article
      className={cn(
        "bg-card rounded-2xl border border-border p-4 sm:p-5",
        "hover:shadow-md transition-shadow duration-200",
        className
      )}
    >
      {/* Header: Author + Date */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Avatar
            src={post.author?.avatar}
            name={post.author?.name || "?"}
            size="md"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {post.author?.name || t("common.unknown")}
            </span>
            <span className="text-xs text-muted-foreground">
              {post.createdAt
                ? formatTimeAgo(post.createdAt)
                : t("common.unknown")}
            </span>
          </div>
        </div>

        {showDelete && onDelete && (
          <button
            onClick={handleDelete}
            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            aria-label={t("activityPosts.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Images */}
      {post.images.length > 0 && (
        <div className="mb-3">
          <ImageGrid images={post.images} maxImages={3} />
        </div>
      )}

      {/* Footer: Team info */}
      {showTeam && post.team && (
        <div className="pt-3 border-t border-border">
          <a
            href={`/teams/${post.team.id}`}
            className="text-xs text-muted-foreground hover:text-amber-600 transition-colors"
          >
            {t("activityPosts.fromTeam")}: {post.team.title}
          </a>
        </div>
      )}
    </article>
  );
}
