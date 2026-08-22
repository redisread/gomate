import type { Story, Tag } from "@/contracts";

export type { Story };
export type StoryTag = Tag;

export interface StoryListResponse {
  success: boolean;
  data: {
    items: Story[];
    nextCursor: string | null;
  };
}

export interface StoryTagsResponse {
  success: boolean;
  data: { items: StoryTag[] };
}

export interface StoryDetailResponse {
  success: boolean;
  data: Story;
}

export interface StoryUploadAsset {
  key: string;
  url: string;
}

interface CreateStoryFields {
  teamId?: string;
  title: string;
  summary: string;
  content: string;
  locationId: string;
  tags: string[];
  imageKey?: string;
}

export interface UpdateStoryFields {
  teamId?: string;
  title: string;
  summary: string;
  content: string;
  locationId: string;
  status: "draft" | "published";
  tags: string[];
  images: string[];
}

export function getStoryTitle(
  story: Pick<Story, "displayTitle" | "title" | "content">,
): string {
  return story.displayTitle || story.title || story.content.slice(0, 60);
}

export function getStoryCoverImage(
  story: Pick<Story, "images">,
): string | undefined {
  return story.images[0];
}

export function buildStoriesPath({
  limit,
  cursor,
  tag,
  locationId,
  teamId,
}: {
  limit: number;
  cursor?: string | null;
  tag?: string | null;
  locationId?: string | null;
  teamId?: string | null;
}): string {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  if (tag) query.set("tag", tag);
  if (locationId) query.set("locationId", locationId);
  if (teamId) query.set("teamId", teamId);
  return `/stories?${query.toString()}`;
}

export function buildCreateStoryPayload(fields: CreateStoryFields) {
  const title = fields.title.trim();
  return {
    ...(fields.teamId ? { teamId: fields.teamId } : {}),
    ...(title ? { title } : {}),
    summary: fields.summary.trim() || null,
    content: fields.content,
    ...(fields.teamId ? {} : { locationId: fields.locationId || undefined }),
    tags: fields.tags,
    imageKeys: fields.imageKey ? [fields.imageKey] : undefined,
  };
}

export function buildUpdateStoryPayload(fields: UpdateStoryFields) {
  return {
    title: fields.title.trim() || null,
    summary: fields.summary.trim() || null,
    content: fields.content,
    images: fields.images,
    status: fields.status,
    tags: fields.tags,
    ...(fields.teamId ? {} : { locationId: fields.locationId || null }),
  };
}

export function parseStoryUploadAsset(value: unknown): StoryUploadAsset | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.success !== true ||
    typeof candidate.key !== "string" ||
    !candidate.key.startsWith("temp/stories/") ||
    typeof candidate.url !== "string"
  ) {
    return null;
  }

  try {
    const url = new URL(candidate.url, "http://localhost");
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return { key: candidate.key, url: candidate.url };
}
