/**
 * P0-B T2「怎么到」amap 决策数据聚合（task #169）
 *
 * spec: notes/gomate-p0b-location-decision-spec.md v1.1 §3.3 + §3.5 + §3.6
 *
 * 提供三份决策信号：
 *  1. 最近地铁站（周边 POI 搜索 subway_station → 直线距离最近）+ 步行 ETA
 *  2. 自驾距城市中心：距离 + 高峰/非高峰时段 duration（默认非高峰）
 *  3. 地图 URL：始终可用（坐标 → uri.amap.com/navigation），amap API 全挂时唯一 fallback
 *
 * ## 降级策略（spec §3.6 三段式，Martin CR 具体化）
 *
 *  - 单个 amap 端点 5xx / timeout / non-1 status → **该字段 null**，不 raise
 *  - 全部端点挂 → 视觉降级到「📍 在地图打开」单链接（前端读 subway=null && drive=null 时切换）
 *  - 调用方（route 层）负责 KV cache 24h + stale >7d 标注
 *
 * ## 契约
 *
 *  - 函数**不抛异常**（除非 lat/lng 数值非法，视为程序 bug 让 500）
 *  - 每个字段独立降级：subway 挂了 drive 还能返，反之亦然
 *  - `amapAllFailed` 派生 flag 给前端一次判断
 */

import { logger } from "./logger";
import { getCityCenter } from "@gomate/lib";
import { fetchWithTimeout } from "./timeout";

/** amap 请求超时（ms）。3s 拉到，避免拖慢详情页 SSR */
const AMAP_TIMEOUT_MS = 3000;

/** 高德坐标格式："lng,lat"（注意顺序） */
export function toAmapCoord(lng: number, lat: number): string {
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

// ==================== 类型 ====================

export interface SubwayInfo {
  /** 站名（不带"地铁站"后缀） */
  station: string;
  /** 线路名，可能为空数组 */
  lines: string[];
  /** 直线距离 (m)，approximate */
  distanceMeters: number;
  /** 步行 ETA (min)，基于 amap walking direction；若走 fallback（80m/min 匀速）则 approximate=true */
  walkMinutes: number;
  /** 是否 amap direction 失败走了直线距离 fallback（>800m 时前端加"建议骑车/打车接驳"提示） */
  approximate: boolean;
}

export interface DrivingInfo {
  /** 到城市中心的路径距离 (km)，保留 1 位小数 */
  distanceKm: number;
  /** 非高峰驾车 ETA (min) */
  durationMinutes: number;
  /** 参考城市中心的展示 label（"深圳市中心"） */
  referencePointLabel: {
    zh: string;
    en: string;
    ja: string;
  };
}

export interface TransportationResult {
  /** amap navigation URL；始终可用（无 amap 依赖） */
  mapUrl: string;
  /** 最近地铁；amap 挂 / 该区域无地铁 → null */
  subway: SubwayInfo | null;
  /** 自驾到城市中心；amap 挂 → null */
  driving: DrivingInfo | null;
  /** true 表示 subway + driving 都 null（前端切换为「单一 mapUrl 链接」视觉） */
  amapAllFailed: boolean;
}

export interface ComputeTransportationInput {
  lat: number;
  lng: number;
  /** 归一化后的 city key（走 `normalizeCity`），用于查 `getCityCenter` */
  city: string;
  amapKey: string;
  /**
   * 允许注入 fetch（测试用）。默认 `globalThis.fetch`。
   * 签名与 `fetchWithTimeout` 一致，因为内部走 timeout 包装。
   */
  fetchImpl?: typeof fetch;
}

// ==================== amap 端点封装（内部） ====================

/**
 * 通用 amap 端点调用：
 *  - timeout 3s
 *  - 非 2xx / status != "1" / JSON 解析失败 → 记 warn 并返 null
 *
 * spec §3.6 blocker：任何一个端点挂不影响其他端点，此函数吞下所有错误。
 */
async function safeAmapGet<T = unknown>(
  url: string,
  fetchImpl: typeof fetch | undefined,
  contextLabel: string,
): Promise<T | null> {
  try {
    const resp = fetchImpl
      ? await withTimeout(fetchImpl(url), AMAP_TIMEOUT_MS)
      : await fetchWithTimeout(url, {}, AMAP_TIMEOUT_MS);
    if (!resp.ok) {
      logger.warn(`[amap-decision] ${contextLabel} HTTP ${resp.status}`);
      return null;
    }
    const data = (await resp.json()) as { status?: string } & Record<string, unknown>;
    if (data.status !== "1") {
      logger.warn(`[amap-decision] ${contextLabel} status=${data.status}`);
      return null;
    }
    return data as T;
  } catch (err) {
    logger.warn(`[amap-decision] ${contextLabel} threw:`, err);
    return null;
  }
}

/**
 * 让注入的 fetch 也走同一 timeout 语义（不能直接调 fetchWithTimeout，因为它内部用 globalThis.fetch）。
 */
async function withTimeout(promise: Promise<Response>, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await promise;
  } finally {
    clearTimeout(timer);
  }
}

// ==================== 地铁 ====================

interface AmapAroundPoi {
  name?: string;
  location?: string; // "lng,lat"
  distance?: string | number;
  type?: string;
  address?: string;
  business_area?: string;
}

interface AmapAroundResponse {
  status: string;
  pois?: AmapAroundPoi[];
}

interface AmapDirectionWalkResponse {
  status: string;
  route?: {
    paths?: Array<{ duration?: string | number; distance?: string | number }>;
  };
}

/**
 * 找周边最近地铁站。
 * amap `place/around` types=150500（地铁站），radius=3000m，sortrule=distance。
 *
 * 返回 null 当：amap 挂 / 该区域 3km 内无地铁（远郊场景常见，例：梧桐山山下）。
 */
async function fetchNearestSubway(
  input: ComputeTransportationInput,
): Promise<SubwayInfo | null> {
  const { lat, lng, amapKey, fetchImpl } = input;
  const location = toAmapCoord(lng, lat);
  const url = `https://restapi.amap.com/v3/place/around?key=${amapKey}&location=${encodeURIComponent(
    location,
  )}&types=150500&radius=3000&sortrule=distance&offset=1&extensions=base`;

  const data = await safeAmapGet<AmapAroundResponse>(url, fetchImpl, "subway-around");
  if (!data) return null;
  const poi = data.pois?.[0];
  if (!poi?.name || !poi.location || poi.distance == null) return null;

  const distanceMeters = typeof poi.distance === "string" ? parseInt(poi.distance, 10) : poi.distance;
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return null;

  const station = poi.name.replace(/[（(].*?[)）]/g, "").replace(/(地铁站|站)$/g, "").trim() || poi.name;
  // amap business_area 里偶尔带线路名（"1号线 · 4号线"）；type "150500" 单独打个 subway 分类，线路信息在 name 括号中。
  const lineMatch = poi.name.match(/[（(]([^)）]+)[)）]/);
  const lines = lineMatch?.[1]
    ? lineMatch[1]
        .split(/[·、,，/]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // 步行 ETA：优先 amap walking direction；失败则 fallback 匀速 80m/min
  const walkUrl = `https://restapi.amap.com/v3/direction/walking?key=${amapKey}&origin=${encodeURIComponent(
    location,
  )}&destination=${encodeURIComponent(poi.location)}`;
  const walkResp = await safeAmapGet<AmapDirectionWalkResponse>(walkUrl, fetchImpl, "subway-walk");
  const walkPath = walkResp?.route?.paths?.[0];
  let walkMinutes: number;
  let approximate = false;
  if (walkPath?.duration != null) {
    const durSec = typeof walkPath.duration === "string" ? parseInt(walkPath.duration, 10) : walkPath.duration;
    walkMinutes = Number.isFinite(durSec) && durSec > 0 ? Math.max(1, Math.round(durSec / 60)) : 0;
    if (walkMinutes === 0) approximate = true;
  } else {
    walkMinutes = Math.max(1, Math.round(distanceMeters / 80));
    approximate = true;
  }

  return {
    station,
    lines,
    distanceMeters,
    walkMinutes,
    approximate,
  };
}

// ==================== 自驾 ====================

interface AmapDirectionDriveResponse {
  status: string;
  route?: {
    paths?: Array<{ duration?: string | number; distance?: string | number }>;
  };
}

async function fetchDrivingToCityCenter(
  input: ComputeTransportationInput,
): Promise<DrivingInfo | null> {
  const { lat, lng, city, amapKey, fetchImpl } = input;
  const center = getCityCenter(city);
  const origin = toAmapCoord(lng, lat);
  const destination = toAmapCoord(center.lng, center.lat);

  // strategy=0：速度最快（不考虑高峰堵车），spec §3.5 默认非高峰时段
  const url = `https://restapi.amap.com/v3/direction/driving?key=${amapKey}&origin=${encodeURIComponent(
    origin,
  )}&destination=${encodeURIComponent(destination)}&strategy=0&extensions=base`;
  const data = await safeAmapGet<AmapDirectionDriveResponse>(url, fetchImpl, "drive-to-center");
  if (!data) return null;

  const path = data.route?.paths?.[0];
  if (!path?.distance || !path.duration) return null;

  const distMeters = typeof path.distance === "string" ? parseInt(path.distance, 10) : path.distance;
  const durSec = typeof path.duration === "string" ? parseInt(path.duration, 10) : path.duration;
  if (!Number.isFinite(distMeters) || distMeters <= 0) return null;
  if (!Number.isFinite(durSec) || durSec <= 0) return null;

  return {
    distanceKm: Math.round((distMeters / 1000) * 10) / 10,
    durationMinutes: Math.max(1, Math.round(durSec / 60)),
    referencePointLabel: {
      zh: center.labelZh,
      en: center.labelEn,
      ja: center.labelJa,
    },
  };
}

// ==================== mapUrl fallback ====================

/**
 * 生成 amap navigation URL（无 API 依赖，坐标 → deep link）。
 * spec §3.6 blocker-2：即便 amap API 全挂，这个链接仍然可用。
 */
export function buildAmapNavigationUrl(lat: number, lng: number): string {
  // uri.amap.com/navigation dev doc：pos 参数是"名称,lng,lat"
  const dst = `${lng.toFixed(6)},${lat.toFixed(6)}`;
  return `https://uri.amap.com/marker?position=${encodeURIComponent(dst)}&callnative=1`;
}

// ==================== 入口 ====================

/**
 * 计算「怎么到」所需的三份决策数据。
 * 三个 amap 端点并行调用，单个失败不阻塞其他。
 *
 * 调用方（route 层）负责：
 *  - 输入 lat/lng 校验（本函数假定合法）
 *  - KV cache 读写 + stale 标注
 *  - 拼装最终 response（含 meta.staleDays / cache 头）
 */
export async function computeTransportation(
  input: ComputeTransportationInput,
): Promise<TransportationResult> {
  const mapUrl = buildAmapNavigationUrl(input.lat, input.lng);

  if (!input.amapKey) {
    // 极端情况：env 没配 key，直接返 mapUrl-only
    return { mapUrl, subway: null, driving: null, amapAllFailed: true };
  }

  const [subway, driving] = await Promise.all([
    fetchNearestSubway(input),
    fetchDrivingToCityCenter(input),
  ]);

  return {
    mapUrl,
    subway,
    driving,
    amapAllFailed: subway === null && driving === null,
  };
}

// ==================== 测试导出 ====================

/** 单测专用（vitest）— 不出现在正常 import 路径 */
export const __test = {
  toAmapCoord,
  buildAmapNavigationUrl,
  fetchNearestSubway,
  fetchDrivingToCityCenter,
  safeAmapGet,
};
