"use client";

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityPostCard, type ActivityPost } from "./activity-post-card";
import { ActivityPostForm } from "./activity-post-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fetchAPI } from "@/lib/api";
import { Mountain, Plus, Loader2 } from "lucide-react";

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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);

  const canPost = teamStatus === "completed" && isMember;

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
      <Card className={cn("bg-card", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-card", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">
          {t("activityPosts.title")}
        </CardTitle>
        {canPost && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("activityPosts.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("activityPosts.add")}</DialogTitle>
              </DialogHeader>
              <ActivityPostForm
                teamId={teamId}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowForm(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <Mountain className="h-8 w-8 text-stone-400" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">
              {t("activityPosts.emptyTitle")}
            </p>
            <p className="text-muted-foreground text-xs">
              {canPost ? t("activityPosts.emptyDescription") : t("activityPosts.emptyNotMember")}
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
      </CardContent>
    </Card>
  );
}
