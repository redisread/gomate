"use client";

import * as React from "react";
import { fetchCurrentUser } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

interface StoryEditData {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  status: string;
  author: { id: string } | null;
}

interface UseStoryFormReturn {
  story: StoryEditData | null;
  currentUser: SessionUser | null;
  isLoading: boolean;
  error: string | null;
  canEdit: boolean;
}

export function useStoryForm(storyId: string): UseStoryFormReturn {
  const [story, setStory] = React.useState<StoryEditData | null>(null);
  const [currentUser, setCurrentUser] = React.useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);

        const [user, storyRes] = await Promise.all([
          fetchCurrentUser().catch(() => null),
          fetch(`/api/stories/${storyId}`).then((r) => r.json()),
        ]);

        if (cancelled) return;

        setCurrentUser(user);

        if (!storyRes.success || !storyRes.data) {
          setError("故事不存在");
          return;
        }

        const data = storyRes.data;
        setStory(data);

        // 权限检查：非作者且非 admin 则重定向
        const authorId = data.author?.id;
        const isAuthor = user && authorId === user.id;
        const isAdmin = user?.role === "admin";

        if (!isAuthor && !isAdmin) {
          window.location.href = `/discover/${storyId}`;
          return;
        }
      } catch (err) {
        if (!cancelled) {
          setError("加载故事失败");
          console.error("Load story error:", err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [storyId]);

  const canEdit = Boolean(
    story && currentUser && (story.author?.id === currentUser.id || currentUser.role === "admin"),
  );

  return { story, currentUser, isLoading, error, canEdit };
}
