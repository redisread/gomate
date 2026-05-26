"use client";

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { ActivityPostCard, type ActivityPost } from "./activity-post-card";
import { ActivityPostForm } from "./activity-post-form";
import { fetchAPI } from "@/lib/api";
import { Mountain, Plus, Loader2, X } from "lucide-react";

interface TeamActivityPostsProps {
  teamId: string;
  teamStatus: string;
  isMember: boolean;
  className?: string;
}

export function TeamActivityPosts({ teamId, teamStatus, isMember, className }: TeamActivityPostsProps) {
  const { t } = useI18n(["teams"]);
  const [posts, setPosts] = React.useState<ActivityPost[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);

  const canPost = teamStatus === "completed" && isMember;

  // 队伍未完成时隐藏活动回顾区块
  if (teamStatus !== "completed") return null;

  const loadPosts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI(`/teams/${teamId}/activity-posts?limit=50`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load activity posts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  React.useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleDelete = async (postId: string) => {
    try {
      const res = await fetchAPI(`/activity-posts/${postId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    loadPosts();
  };

  if (isLoading) {
    return (
      <div className={cn("bg-card rounded-2xl border border-border p-6", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-2xl border border-border", className)}>
      {/* Header */}
      <div className="flex flex-row items-center justify-between p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">
          {t("teams.activityPosts.title")}
        </h3>
        {canPost && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("teams.activityPosts.add")}
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h4 className="text-lg font-semibold">{t("teams.activityPosts.add")}</h4>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <ActivityPostForm
                teamId={teamId}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <Mountain className="h-8 w-8 text-stone-400" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">
              {t("teams.activityPosts.emptyTitle")}
            </p>
            <p className="text-muted-foreground text-xs">
              {canPost ? t("teams.activityPosts.emptyDescription") : t("teams.activityPosts.emptyNotMember")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <ActivityPostCard
                key={post.id}
                post={post}
                showDelete={true}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
