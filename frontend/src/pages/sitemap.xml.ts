/**
 * Sitemap 动态生成 - SSR 模式
 *
 * 从 API 获取所有动态路由（地点、队伍等），生成多语言 sitemap XML
 */
import type { APIRoute } from "astro";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "../i18n";
import { serverApiGet } from "../lib/server-api";

const SITE_URL = "https://gomate.live";

// 静态路由（所有语言共享）
const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: 1.0 },
  { path: "/locations", changefreq: "weekly", priority: 0.8 },
  { path: "/teams", changefreq: "daily", priority: 0.8 },
  { path: "/login", changefreq: "monthly", priority: 0.5 },
  { path: "/register", changefreq: "monthly", priority: 0.5 },
  { path: "/forgot-password", changefreq: "monthly", priority: 0.3 },
  { path: "/reset-password", changefreq: "monthly", priority: 0.3 },
  { path: "/profile", changefreq: "monthly", priority: 0.4 },
  { path: "/profile/edit", changefreq: "monthly", priority: 0.4 },
  { path: "/my-teams", changefreq: "daily", priority: 0.6 },
  { path: "/teams/create", changefreq: "monthly", priority: 0.5 },
  { path: "/favorites", changefreq: "weekly", priority: 0.5 },
  { path: "/contact", changefreq: "monthly", priority: 0.4 },
  { path: "/feedback", changefreq: "monthly", priority: 0.4 },
  { path: "/about", changefreq: "monthly", priority: 0.4 },
  { path: "/help", changefreq: "monthly", priority: 0.4 },
  { path: "/privacy", changefreq: "monthly", priority: 0.3 },
  { path: "/terms", changefreq: "monthly", priority: 0.3 },
  { path: "/blog", changefreq: "weekly", priority: 0.6 },
];

function getLocaleUrl(loc: string, path: string): string {
  if (loc === DEFAULT_LOCALE) {
    return `${SITE_URL}${path === "/" ? "/" : path}`;
  }
  return `${SITE_URL}/${loc}${path === "/" ? "" : path}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async ({ request, locals }) => {
  const now = new Date().toISOString();
  const entries: string[] = [];

  // 1. 静态路由 - 每个语言版本都生成
  for (const route of STATIC_ROUTES) {
    for (const loc of SUPPORTED_LOCALES) {
      const locUrl = getLocaleUrl(loc, route.path);
      entries.push(
        `<url>` +
          `<loc>${escapeXml(locUrl)}</loc>` +
          `<lastmod>${now}</lastmod>` +
          `<changefreq>${route.changefreq}</changefreq>` +
          `<priority>${route.priority}</priority>` +
          `</url>`
      );
    }
  }

  // 2. 动态路由 - 从 API 获取地点列表
  try {
    const locationList: { id: string }[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({ limit: "100" });
      if (cursor) query.set("cursor", cursor);
      const data = await serverApiGet<{
        success: boolean;
        locations: { id: string }[];
        nextCursor: string | null;
      }>(request, locals, `/locations?${query}`);
      if (!data?.success) break;
      locationList.push(...(data.locations ?? []));
      const nextCursor = data.nextCursor ?? null;
      if (!nextCursor || seenCursors.has(nextCursor)) break;
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    } while (cursor);

    for (const loc of locationList) {
      const id = typeof loc === "object" ? loc.id : loc;
      const path = `/locations/${id}`;
      for (const lang of SUPPORTED_LOCALES) {
        const locUrl = getLocaleUrl(lang, path);
        entries.push(
          `<url>` +
            `<loc>${escapeXml(locUrl)}</loc>` +
            `<lastmod>${now}</lastmod>` +
            `<changefreq>weekly</changefreq>` +
            `<priority>0.7</priority>` +
            `</url>`
        );
      }
    }
  } catch {
    // API 不可用时跳过动态路由（本地开发场景）
  }

  // 3. 动态路由 - 从 API 获取队伍列表
  try {
    const teamList: { id: string }[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({ limit: "100" });
      if (cursor) query.set("cursor", cursor);
      const data = await serverApiGet<{
        success: boolean;
        teams: { id: string }[];
        nextCursor: string | null;
      }>(request, locals, `/teams?${query}`);
      if (!data?.success) break;
      teamList.push(...(data.teams ?? []));
      const nextCursor = data.nextCursor ?? null;
      if (!nextCursor || seenCursors.has(nextCursor)) break;
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    } while (cursor);

    for (const team of teamList) {
      const id = typeof team === "object" ? team.id : team;
      const path = `/teams/${id}`;
      for (const lang of SUPPORTED_LOCALES) {
        const locUrl = getLocaleUrl(lang, path);
        entries.push(
          `<url>` +
            `<loc>${escapeXml(locUrl)}</loc>` +
            `<lastmod>${now}</lastmod>` +
            `<changefreq>daily</changefreq>` +
            `<priority>0.7</priority>` +
            `</url>`
        );
      }
    }
  } catch {
    // API 不可用时跳过动态路由
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    entries.join("") +
    `</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
