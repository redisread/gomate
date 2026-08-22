import { describe, expect, it } from "vitest";

import {
  buildCreateStoryPayload,
  buildStoriesPath,
  buildUpdateStoryPayload,
  getStoryCoverImage,
  getStoryTitle,
  parseStoryUploadAsset,
  type Story,
} from "./story-contract";

const recap = {
  id: "story-1",
  authorId: "user-1",
  teamId: "team-1",
  locationId: "location-1",
  title: null,
  displayTitle: "周末徒步队",
  summary: null,
  content: "顺利完成行程。",
  images: ["https://gomate.cos.jiahongw.com/stories/story-1/cover.jpg"],
  status: "published",
  viewCount: 8,
  likeCount: 2,
  createdAt: "2026-08-16T08:00:00.000Z",
  updatedAt: "2026-08-16T08:00:00.000Z",
  author: { id: "user-1", name: "Victor", image: null },
  location: { id: "location-1", name: "梧桐山", slug: "wutong" },
  team: { id: "team-1", title: "周末徒步队" },
  tags: [{ id: "tag-1", name: "徒步", slug: "%E5%BE%92%E6%AD%A5" }],
  isLiked: false,
} satisfies Story;

describe("Story frontend contract", () => {
  it("uses displayTitle and the first images[] entry for recap presentation", () => {
    expect(getStoryTitle(recap)).toBe("周末徒步队");
    expect(getStoryCoverImage(recap)).toBe(
      "https://gomate.cos.jiahongw.com/stories/story-1/cover.jpg",
    );
  });

  it("builds opaque cursor pagination without the removed page parameter", () => {
    const path = buildStoriesPath({
      limit: 12,
      cursor: "opaque_cursor",
      tag: "徒步",
    });

    expect(path).toBe(
      "/stories?limit=12&cursor=opaque_cursor&tag=%E5%BE%92%E6%AD%A5",
    );
    expect(path).not.toContain("page=");
  });

  it("builds location and team recap feeds with cursor envelope filters", () => {
    expect(
      buildStoriesPath({
        limit: 4,
        cursor: "next/cursor",
        locationId: "location 1",
      }),
    ).toBe(
      "/stories?limit=4&cursor=next%2Fcursor&locationId=location+1",
    );
    expect(
      buildStoriesPath({ limit: 4, teamId: "team/1" }),
    ).toBe("/stories?limit=4&teamId=team%2F1");
  });

  it("creates stories with owned temp imageKeys instead of legacy image fields", () => {
    const payload = buildCreateStoryPayload({
      title: "山间日记",
      summary: "雨后徒步",
      content: "正文",
      locationId: "location-1",
      tags: ["徒步"],
      imageKey: "temp/stories/user-1/upload.webp",
    });

    expect(payload).toEqual({
      title: "山间日记",
      summary: "雨后徒步",
      content: "正文",
      locationId: "location-1",
      tags: ["徒步"],
      imageKeys: ["temp/stories/user-1/upload.webp"],
    });
    expect(payload).not.toHaveProperty("coverImage");
    expect(payload).not.toHaveProperty("images");
  });

  it("creates a team recap with teamId and owned imageKeys but no location alias", () => {
    const payload = buildCreateStoryPayload({
      teamId: "team-1",
      title: "",
      summary: "雨后回顾",
      content: "正文",
      locationId: "should-not-be-sent",
      tags: ["徒步"],
      imageKey: "temp/stories/user-1/recap.webp",
    });

    expect(payload).toEqual({
      teamId: "team-1",
      summary: "雨后回顾",
      content: "正文",
      tags: ["徒步"],
      imageKeys: ["temp/stories/user-1/recap.webp"],
    });
    expect(payload).not.toHaveProperty("locationId");
    expect(payload).not.toHaveProperty("images");
  });

  it("updates only retained final images and never submits a temp key", () => {
    const payload = buildUpdateStoryPayload({
      title: "更新标题",
      summary: "更新摘要",
      content: "更新正文",
      locationId: "location-1",
      status: "published",
      tags: ["徒步"],
      images: recap.images,
    });

    expect(payload.images).toEqual(recap.images);
    expect(payload).not.toHaveProperty("coverImage");
    expect(payload).not.toHaveProperty("imageKeys");
  });

  it("accepts upload previews only when the response contains both key and URL", () => {
    expect(
      parseStoryUploadAsset({
        success: true,
        key: "temp/stories/user-1/upload.webp",
        url: "http://localhost:5432/api/r2/temp/stories/user-1/upload.webp",
      }),
    ).toEqual({
      key: "temp/stories/user-1/upload.webp",
      url: "http://localhost:5432/api/r2/temp/stories/user-1/upload.webp",
    });
    expect(
      parseStoryUploadAsset({ success: true, url: "https://example.test/x" }),
    ).toBeNull();
  });
});
