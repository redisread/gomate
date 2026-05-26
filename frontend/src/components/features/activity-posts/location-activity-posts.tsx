"use client";

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { ActivityPostCard, type ActivityPost } from "./activity-post-card";
import { fetchAPI } from "@/lib/api";
import { Mountain, Loader2 } from "lucide-react";

interface LocationActivityPostsProps {
  locationId: string;
  className?: string;
}

export function LocationActivityPosts({ locationId, className }: LocationActivityPostsProps) {
  const { t } = useI18n(["teams"]);
  const [posts, setPosts] = React.useState<ActivityPost[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      try {
        const res = await fetchAPI(`/locations/${locationId}/activity-posts?limit=6`);
        const data = await res.json();
        if (data.success) {
          setPosts(data.data || []);
        }
      } catch (err) {
        console.error("Failed to load location activity posts:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, [locationId]);

  if (isLoading) {
    return (
      <div className={cn("bg-card rounded-2xl border border-border p-6", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={cn("bg-card rounded-2xl border border-border", className)}>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            {t("teams.activityPosts.recentActivities")}
          </h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <Mountain className="h-8 w-8 text-stone-400" />
            </div>
            <p className="text-muted-foreground text-sm">
              {t("teams.activityPosts.locationEmpty")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-2xl border border-border", className)}>
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">
          {t("teams.activityPosts.recentActivities")}
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {posts.map((post) => (
            <ActivityPostCard
              key={post.id}
              post={post}
              showTeam={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
