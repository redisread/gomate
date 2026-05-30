import * as resvgWasm from "@resvg/resvg-wasm";
import resvgWasmModule from "./resvg.wasm";
import type { Env } from "../../lib/auth";
import { loadFonts } from "./load-fonts";
import { renderTestTemplate } from "../../templates/share-image/test-poster";
import { renderLocationPoster } from "../../templates/share-image/location-poster";
import { renderTeamPoster } from "../../templates/share-image/team-poster";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";

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
 */
export async function generateLocationImage(
  env: Env,
  locationId: string
): Promise<{ png: Uint8Array; cacheKey: string }> {
  const db = createDb(env.DB);

  // 1. 查询地点数据
  const location = await db.query.locations.findFirst({
    where: eq(schema.locations.id, locationId),
  });

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
        eq(schema.entityToTags.entityId, locationId),
        eq(schema.entityToTags.entityType, "location")
      )
    );

  const tags = tagRelations.map((r) => r.tagName);

  // 3. 生成内容哈希（用于缓存）
  const contentData = {
    title: location.name,
    subtitle: location.subtitle,
    description: location.description,
    address: location.address,
    coverImage: location.coverImage,
    tags,
  };
  const contentHash = (await generateMD5(JSON.stringify(contentData))).slice(0, 12);

  const cacheKey = `share/location/${locationId}-${contentHash}.png`;

  // 4. 检查 R2 缓存
  if (env.R2) {
    try {
      const cached = await env.R2.get(cacheKey);
      if (cached) {
        const png = new Uint8Array(await cached.arrayBuffer());
        return { png, cacheKey };
      }
    } catch (e) {
      console.error("[ShareImage] Cache check failed:", e);
    }
  }

  // 5. 初始化 WASM
  await initResvgWasm();

  // 6. 加载字体
  const fonts = await loadFonts(env);

  // 7. 加载封面图并转为 base64
  let coverImageBase64: string | null = null;
  if (location.coverImage) {
    try {
      coverImageBase64 = await loadImageAsBase64(location.coverImage, env);
    } catch (e) {
      console.error("[ShareImage] Failed to load cover image:", e);
    }
  }

  // 8. 生成二维码
  const locationUrl = `https://gomate.live/locations/${location.slug}`;
  const qrCodeDataUrl = await generateQRCode(locationUrl);

  // 9. 渲染 SVG
  const svg = await renderLocationPoster({
    title: location.name,
    subtitle: location.subtitle,
    description: location.description,
    address: location.address,
    coverImage: coverImageBase64,
    tags,
    qrCodeDataUrl,
    fonts,
  });

  // 10. SVG 转 PNG
  const png = await renderSvgToPng(svg);

  // 11. 保存到 R2 缓存
  if (env.R2) {
    try {
      await env.R2.put(cacheKey, png, {
        httpMetadata: {
          contentType: "image/png",
          cacheControl: "public, max-age=86400",
        },
      });
    } catch (e) {
      console.error("[ShareImage] Cache save failed:", e);
    }
  }

  return { png, cacheKey };
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

    if (cached.length > 0 && cached[0].expiresAt > Date.now()) {
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
          base64Result = `data:${contentType};base64,${btoa(String.fromCharCode(...new Uint8Array(buffer)))}`;
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
          base64Result = `data:${contentType};base64,${btoa(String.fromCharCode(...new Uint8Array(buffer)))}`;
        }
      } catch (e) {
        clearTimeout(timeout);
        console.error("[ShareImage] Load image timeout/error:", imageUrl, e);
      }
    }

    // 3. 写入 D1 缓存（24小时过期）
    if (base64Result) {
      const now = Date.now();
      const expiresAt = now + 24 * 60 * 60 * 1000; // 24小时

      try {
        await db
          .insert(schema.imageCaches)
          .values({
            id: await generateMD5(imageUrl),
            imageUrl,
            base64Data: base64Result,
            contentType,
            size,
            expiresAt,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: schema.imageCaches.imageUrl,
            set: {
              base64Data: base64Result,
              contentType,
              size,
              expiresAt,
              updatedAt: now,
            },
          });
      } catch (e) {
        console.error("[ShareImage] Cache write failed:", e);
      }
    }

    return base64Result;
  } catch (e) {
    console.error("[ShareImage] Load image error:", e);
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
  const spotsToForm = Math.max(0, team.durationMin - currentMembers); // durationMin 存储成行人数

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
      console.error("[ShareImage] Cache check failed:", e);
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
      console.error("[ShareImage] Cache save failed:", e);
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
 * 生成二维码
 * 使用纯 JS 实现（Cloudflare Workers 兼容）
 */
async function generateQRCode(_text: string): Promise<string> {
  // 简化版：返回一个占位符 SVG 二维码
  // 实际生产可以使用 qrcode 库的纯 JS 版本
  // 这里使用一个 SVG 占位符表示二维码
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
      <rect x="8" y="2" width="1" height="1" fill="#1e1812"/>
      <rect x="14" y="4" width="1" height="1" fill="#1e1812"/>
      <rect x="2" y="10" width="1" height="1" fill="#1e1812"/>
      <rect x="20" y="14" width="1" height="1" fill="#1e1812"/>
      <rect x="16" y="16" width="3" height="3" fill="#1e1812"/>
      <rect x="20" y="18" width="2" height="2" fill="#1e1812"/>
      <rect x="12" y="20" width="2" height="2" fill="#1e1812"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(qrSvg)}`;
}
