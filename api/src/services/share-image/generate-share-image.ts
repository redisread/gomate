import * as resvgWasm from "@resvg/resvg-wasm";
import resvgWasmModule from "./resvg.wasm";
import QRCode from "qrcode";
import type { Env } from "../../lib/auth";
import { logger } from "../../lib/logger";
import { loadFonts } from "./load-fonts";
import { renderTestTemplate } from "../../templates/share-image/test-poster";
import { renderLocationPoster } from "../../templates/share-image/location-poster";
import { renderTeamPoster } from "../../templates/share-image/team-poster";
import { renderStoryPoster } from "../../templates/share-image/story-poster";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { lookupPosterStrings, type PosterLocale } from "./poster-i18n";
import { safeJsonParse } from "../../routes/locations/utils";

// WASM 模块缓存
let wasmInitialized = false;

/**
 * 生成 MD5 哈希（使用 Web Crypto API）
 */
async function generateMD5(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("MD5", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * ArrayBuffer 转 base64（分块编码防栈溢出）
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}


/**
 * 初始化 resvg-wasm
 * 直接导入 WASM 模块（ES module worker 方式）
 */
async function initResvgWasm() {
  if (wasmInitialized) {
    return;
  }

  // 直接使用导入的 WASM 模块
  await resvgWasm.initWasm(resvgWasmModule);

  wasmInitialized = true;
}

/**
 * Phase 1: 生成预览图片（固定数据测试）
 */
export async function generatePreviewImage(env: Env): Promise<Uint8Array> {
  // 1. 初始化 WASM
  await initResvgWasm();

  // 2. 加载字体
  const fonts = await loadFonts(env);

  // 3. 渲染 SVG（使用固定测试数据）
  const svg = await renderTestTemplate({
    title: "GoMate 测试海报",
    subtitle: " Phase 1 基础能力验证",
    date: "2026-05-29",
    location: "测试地点",
    description: "这是一个测试海报，用于验证 Satori + resvg-wasm 的图片生成能力。",
    leaderName: "测试队长",
    membersInfo: "3/5",
    fonts,
  });

  // 4. SVG 转 PNG
  const png = await renderSvgToPng(svg);

  return png;
}

/**
 * SVG 转 PNG
 */
export async function renderSvgToPng(svg: string): Promise<Uint8Array> {
  const { Resvg } = resvgWasm;
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 750,
    },
    font: {
      defaultFontFamily: "system-ui",
    },
  });

  const pngData = resvg.render();
  return pngData.asPng();
}

/**
 * Phase 2: 生成地点分享图片
 * 查询地点数据，生成分享海报
 *
 * 查询优化：一次性拉取 routes，避免 N+1
 * 图片加载：主 cover → images[0] 兜底，预加载使用短超时避免阻塞
 */
export async function generateLocationImage(
  env: Env,
  locationId: string,
  locale: PosterLocale = "zh-CN"
): Promise<{ png: Uint8Array; cacheKey: string; coverLoaded: boolean }> {
  const db = createDb(env.DB);

  // 1. 查询地点数据，兼容 id 和 slug
  let location = await db.query.locations.findFirst({
    where: eq(schema.locations.id, locationId),
    with: { routes: true },
  });

  if (!location) {
    location = await db.query.locations.findFirst({
      where: eq(schema.locations.slug, locationId),
      with: { routes: true },
    });
  }

  if (!location) {
    throw new Error(`Location not found: ${locationId}`);
  }

  // 2. 查询地点标签
  const tagRelations = await db
    .select({ tagName: schema.tags.name })
    .from(schema.entityToTags)
    .innerJoin(schema.tags, eq(schema.tags.id, schema.entityToTags.tagId))
    .where(
      and(
        eq(schema.entityToTags.entityId, location.id),
        eq(schema.entityToTags.entityType, "location")
      )
    );

  const tags = tagRelations.map((r) => r.tagName);

  // 3. 生成内容哈希（用于缓存）- 加入封面图 URL 作为版本号
  const contentData = {
    title: location.name,
    subtitle: location.subtitle,
    description: location.description,
    address: location.address,
    coverImage: location.coverImage,
    cityName: location.cityName,
    bestSeason: location.bestSeason,
    tags,
  };
  const contentHash = (await generateMD5(JSON.stringify(contentData))).slice(0, 12);

  const cacheKey = `share/location/${location.id}-${contentHash}.png`;

  // 4. 检查 R2 缓存
  if (env.R2) {
    try {
      const cached = await env.R2.get(cacheKey);
      if (cached) {
        const png = new Uint8Array(await cached.arrayBuffer());
        return { png, cacheKey, coverLoaded: true };
      }
    } catch (e) {
      logger.error("[ShareImage] Cache check failed:", e);
    }
  }

  // 5. 初始化 WASM
  await initResvgWasm();

  // 6. 加载字体
  const fonts = await loadFonts(env);

  // 7. 加载封面图（含 fallback），优先走缓存命中
  // 超时用 8s，低于 Worker 的 10s CPU 限制
  let coverImageBase64: string | null = null;
  let coverLoaded = false;
  if (location.coverImage) {
    try {
      coverImageBase64 = await loadImageAsBase64(location.coverImage, env, 8000);
      if (coverImageBase64) coverLoaded = true;
      else logger.warn("[ShareImage] Cover image returned null:", location.coverImage);
    } catch (e) {
      logger.error("[ShareImage] Failed to load cover image:", e);
    }
  }

  // 兜底：coverImage 失败时尝试 images[0]
  if (!coverImageBase64 && location.images) {
    const images = safeJsonParse<string[]>(location.images, []);
    if (images.length > 0) {
      logger.info("[ShareImage] Trying fallback image:", images[0]);
      try {
        coverImageBase64 = await loadImageAsBase64(images[0], env, 8000);
        if (coverImageBase64) coverLoaded = true;
      } catch (e) {
        logger.error("[ShareImage] Failed to load fallback image:", e);
      }
    }
  }

  // 8. 生成二维码
  const slugOrId = location.slug || location.id;
  const locationUrl = `https://gomate.live/locations/${slugOrId}`;
  const qrCodeDataUrl = await generateQRCode(locationUrl);

  // 9. 解析路线数据（取第一条）
  const primaryRoute = location.routes?.[0] ?? null;
  const routeMetrics = primaryRoute
    ? {
        difficulty: primaryRoute.difficulty,
        durationMin: primaryRoute.durationMin,
        durationMax: primaryRoute.durationMax,
        distance: primaryRoute.distance,
        elevation: primaryRoute.elevation,
      }
    : null;

  // 10. 解析最佳季节（容错：非数组值 → 空数组）
  const bestSeason = safeJsonParse<string[]>(location.bestSeason, []);

  // 11. 渲染 SVG（注入 i18n 文案，避免模板内做双语分支）
  const i18n = lookupPosterStrings(locale);
  const svg = await renderLocationPoster({
    title: location.name,
    subtitle: location.subtitle,
    description: location.description,
    address: location.address,
    coverImage: coverImageBase64,
    tags,
    cityName: location.cityName ?? null,
    bestSeason,
    type: location.type ?? null,
    routeMetrics,
    qrCodeDataUrl,
    locale,
    fonts,
    i18n: {
      scanToView: i18n.scanToView,
      siteSlogan: i18n.siteSlogan,
      bestSeasonLabel: i18n.bestSeasonLabel,
      distanceLabel: i18n.distanceLabel,
      durationLabel: i18n.durationLabel,
      elevationLabel: i18n.elevationLabel,
      difficultyLabel: i18n.difficultyLabel,
      brandName: i18n.brandName,
    },
  });

  // 12. SVG 转 PNG
  const png = await renderSvgToPng(svg);

  // 13. 保存到 R2 缓存
  if (env.R2) {
    try {
      await env.R2.put(cacheKey, png, {
        httpMetadata: {
          contentType: "image/png",
          cacheControl: "public, max-age=86400",
        },
      });
    } catch (e) {
      logger.error("[ShareImage] Cache save failed:", e);
    }
  }

  return { png, cacheKey, coverLoaded };
}

/**
 * 加载图片并转为 base64 Data URL（带缓存）
 * 优先从 D1 缓存读取，未命中则从 R2/CDN 加载并缓存到 D1
 */
async function loadImageAsBase64(
  imageUrl: string,
  env: Env,
  timeoutMs = 5000
): Promise<string | null> {
  try {
    // 1. 检查 D1 缓存（24小时有效）
    const db = createDb(env.DB);
    const cached = await db
      .select({ base64Data: schema.imageCaches.base64Data, expiresAt: schema.imageCaches.expiresAt })
      .from(schema.imageCaches)
      .where(eq(schema.imageCaches.imageUrl, imageUrl))
      .limit(1);

    if (cached.length > 0 && cached[0].expiresAt.getTime() > Date.now()) {
      return cached[0].base64Data;
    }

    // 2. 缓存未命中，从源加载
    let base64Result: string | null = null;
    let contentType = "image/jpeg";
    let size = 0;

    // 处理 R2 路径
    if (imageUrl.startsWith("assets/") || imageUrl.startsWith("images/")) {
      if (env.R2) {
        const object = await env.R2.get(imageUrl);
        if (object) {
          const buffer = await object.arrayBuffer();
          size = buffer.byteLength;
          contentType = object.httpMetadata?.contentType || "image/jpeg";
          base64Result = `data:${contentType};base64,${bufferToBase64(buffer)}`;
        }
      }
    }

    // 处理 CDN URL（带超时）
    if (!base64Result && imageUrl.startsWith("http")) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(imageUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          size = buffer.byteLength;
          contentType = response.headers.get("content-type") || "image/jpeg";
          base64Result = `data:${contentType};base64,${bufferToBase64(buffer)}`;
        }
      } catch (e) {
        clearTimeout(timeout);
        logger.error("[ShareImage] Load image timeout/error:", { imageUrl, error: String(e) });
      }
    }

    // 3. 写入 D1 缓存（24小时过期）
    if (base64Result) {
      try {
        const now = Date.now();
        const expiresAt = new Date(now + 24 * 60 * 60 * 1000); // 24小时后

        await db
          .insert(schema.imageCaches)
          .values({
            id: await generateMD5(imageUrl),
            imageUrl,
            base64Data: base64Result,
            contentType,
            size,
            expiresAt,
            createdAt: new Date(now),
            updatedAt: new Date(now),
          })
          .onConflictDoUpdate({
            target: schema.imageCaches.imageUrl,
            set: {
              base64Data: base64Result,
              contentType,
              size,
              expiresAt,
              updatedAt: new Date(now),
            },
          });
      } catch (e) {
        logger.error("[ShareImage] Cache write failed:", e);
      }
    }

    return base64Result;
  } catch (e) {
    logger.error("[ShareImage] Load image error:", e);
    return null;
  }
}

/**
 * Phase 3: 生成队伍分享图片
 * 查询队伍数据，生成分享海报
 */
export async function generateTeamImage(
  env: Env,
  teamId: string
): Promise<{ png: Uint8Array; cacheKey: string }> {
  const db = createDb(env.DB);

  // 1. 查询队伍数据
  const team = await db.query.teams.findFirst({
    where: eq(schema.teams.id, teamId),
    with: {
      location: true,
      leader: true,
    },
  });

  if (!team) {
    throw new Error(`Team not found: ${teamId}`);
  }

  // 2. 查询队伍成员数量
  const memberCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.status, "approved")
      )
    )
    .then((rows) => rows[0]?.count ?? 0);

  const currentMembers = memberCount + 1; // +1 包含队长
  const maxMembers = team.maxMembers;
  // 计算还差多少人满员（方案2：使用 maxMembers - currentMembers）
  const spotsToForm = Math.max(0, maxMembers - currentMembers);

  // 3. 生成内容哈希（用于缓存）
  const contentData = {
    title: team.title,
    startTime: team.startTime,
    locationName: team.location?.name,
    currentMembers,
    maxMembers,
    status: team.status,
    updatedAt: team.updatedAt,
  };
  const contentHash = (await generateMD5(JSON.stringify(contentData))).slice(0, 12);

  const cacheKey = `share/team/${teamId}-${contentHash}.png`;

  // 4. 检查 R2 缓存
  if (env.R2) {
    try {
      const cached = await env.R2.get(cacheKey);
      if (cached) {
        const png = new Uint8Array(await cached.arrayBuffer());
        return { png, cacheKey };
      }
    } catch (e) {
      logger.error("[ShareImage] Cache check failed:", e);
    }
  }

  // 5. 初始化 WASM
  await initResvgWasm();

  // 6. 加载字体
  const fonts = await loadFonts(env);

  // 7. 并行加载图片（封面图 + 队长头像）
  const [coverImageBase64, leaderAvatarBase64] = await Promise.all([
    // 加载地点封面图
    team.location?.coverImage
      ? loadImageAsBase64(team.location.coverImage, env, 3000)
      : Promise.resolve(null),
    // 加载队长头像
    team.leader?.image
      ? loadImageAsBase64(team.leader.image, env, 3000)
      : Promise.resolve(null),
  ]);

  // 8. 格式化日期
  const date = formatTeamDate(team.startTime);

  // 9. 生成二维码
  const teamUrl = `https://gomate.live/teams/${teamId}`;
  const qrCodeDataUrl = await generateQRCode(teamUrl);

  // 10. 渲染 SVG（使用完整模板）
  const svg = await renderTeamPoster({
    title: team.title,
    date,
    locationName: team.location?.name,
    coverImage: coverImageBase64,
    currentMembers,
    maxMembers,
    leaderName: team.leader?.name,
    leaderAvatar: leaderAvatarBase64,
    spotsToForm: spotsToForm > 0 ? spotsToForm : null,
    qrCodeDataUrl,
    fonts,
  });

  // 11. SVG 转 PNG
  const png = await renderSvgToPng(svg);

  // 12. 保存到 R2 缓存
  if (env.R2) {
    try {
      await env.R2.put(cacheKey, png, {
        httpMetadata: {
          contentType: "image/png",
          cacheControl: "public, max-age=86400",
        },
      });
    } catch (e) {
      logger.error("[ShareImage] Cache save failed:", e);
    }
  }

  return { png, cacheKey };
}

/**
 * 格式化队伍日期
 * 格式: 05月30日 周六
 */
function formatTeamDate(timestamp: number | Date): string {
  const date = new Date(timestamp);
  const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  const month = months[date.getMonth()];
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];

  return `${month}${day}日 ${weekday}`;
}

/**
 * Phase 5: 生成故事分享图片
 * 查询故事数据，生成分享海报
 * @returns 图片数据，或 null（故事不存在/未发布）
 */
export async function generateStoryImage(
  env: Env,
  storyId: string
): Promise<{ png: Uint8Array; cacheKey: string } | null> {
  const db = createDb(env.DB);

  // 1. 查询故事数据
  const story = await db.query.stories.findFirst({
    where: eq(schema.stories.id, storyId),
    with: { author: true, location: true },
  });

  // 故事不存在或未发布 → 返回 null，由 route 层处理 404
  if (!story || story.status !== "published") {
    return null;
  }

  // 2. 生成内容哈希（用 createdAt 替代 updatedAt，更稳定）
  const contentData = {
    title: story.title, summary: story.summary, coverImage: story.coverImage,
    authorId: story.authorId, locationId: story.locationId,
    createdAt: story.createdAt,  // 故事创建时间，比 updatedAt 稳定
  };
  const contentHash = (await generateMD5(JSON.stringify(contentData))).slice(0, 12);
  const cacheKey = `share/story/${storyId}-${contentHash}.png`;

  // 3. 检查 R2 缓存
  if (env.R2) {
    try {
      const cached = await env.R2.get(cacheKey);
      if (cached) {
        const png = new Uint8Array(await cached.arrayBuffer());
        return { png, cacheKey };
      }
    } catch (e) { logger.error("[ShareImage] Cache check failed:", e); }
  }

  // 4. 初始化 WASM + 加载字体
  await initResvgWasm();
  const fonts = await loadFonts(env);

  // 5. 并行加载图片
  const [coverImageBase64, authorAvatarBase64] = await Promise.all([
    story.coverImage ? loadImageAsBase64(story.coverImage, env, 3000) : Promise.resolve(null),
    story.author?.image ? loadImageAsBase64(story.author.image, env, 3000) : Promise.resolve(null),
  ]);

  // 6. 生成二维码
  const storyUrl = `https://gomate.live/discover/${storyId}`;
  const qrCodeDataUrl = await generateQRCode(storyUrl);

  // 7. 渲染 SVG
  const svg = await renderStoryPoster({
    title: story.title,
    summary: story.summary,
    coverImage: coverImageBase64 ?? undefined,
    authorName: (story.author?.name || story.author?.nickname) ?? undefined,
    authorAvatar: authorAvatarBase64 ?? undefined,
    locationName: story.location?.name ?? undefined,
    qrCodeDataUrl,
    fonts,
  });

  // 8. SVG 转 PNG
  const png = await renderSvgToPng(svg);

  // 9. 保存到 R2
  if (env.R2) {
    try {
      await env.R2.put(cacheKey, png, {
        httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=86400" },
      });
    } catch (e) { logger.error("[ShareImage] Cache save failed:", e); }
  }

  return { png, cacheKey };
}

/**
 * 生成二维码
 * 使用 qrcode 库生成真实二维码（Cloudflare Workers 兼容）
 */
export async function generateQRCode(text: string): Promise<string> {
  try {
    // 使用纯 SVG 输出，避免 Cloudflare Workers 环境中 PNG DataURL 生成失败后落入不可扫描占位图。
    const svg = await QRCode.toString(text, {
      type: "svg",
      margin: 4,
      errorCorrectionLevel: "H",
      color: {
        dark: "#1e1812",
        light: "#ffffff",
      },
    });
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  } catch (e) {
    logger.error("[QRCode] Failed to generate QR code:", e);
    // 降级：返回占位符 SVG
    const qrSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25">
        <rect width="25" height="25" fill="white"/>
        <rect x="2" y="2" width="7" height="7" fill="#1e1812"/>
        <rect x="3" y="3" width="5" height="5" fill="white"/>
        <rect x="4" y="4" width="3" height="3" fill="#1e1812"/>
        <rect x="16" y="2" width="7" height="7" fill="#1e1812"/>
        <rect x="17" y="3" width="5" height="5" fill="white"/>
        <rect x="18" y="4" width="3" height="3" fill="#1e1812"/>
        <rect x="2" y="16" width="7" height="7" fill="#1e1812"/>
        <rect x="3" y="17" width="5" height="5" fill="white"/>
        <rect x="4" y="18" width="3" height="3" fill="#1e1812"/>
        <rect x="10" y="10" width="5" height="5" fill="#1e1812"/>
        <rect x="11" y="11" width="3" height="3" fill="white"/>
        <rect x="12" y="12" width="1" height="1" fill="#1e1812"/>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(qrSvg)}`;
  }
}
