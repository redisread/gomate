/**
 * 匿名 / 未登录用户的城市 fallback（P0-B §4.5 + P0-D §6.4 共享）
 *
 * 决策（Martin CR PR #393 v1.1）：所有推荐 / 决策场景共用这一份，避免各处硬编码 "shenzhen"。
 *
 * 优先级（本函数只处理后两级；登录用户的 users.city 由调用方在这之前处理）：
 *  1. session 中的 users.city（由调用方 pre-resolve 传入 sessionCity 参数）
 *  2. Cloudflare CF-IPCity header（Cloudflare Workers 免费透传）
 *  3. fallback "shenzhen"（gomate 主战场，MVP 阶段合理默认）
 *
 * 注意：CF-IPCity 由 Cloudflare 从 IP GeoIP 解析，可能是中文（"Shenzhen"）或空。
 * 匹配策略：小写化 + 去空格 + 只保留字母数字。未识别的一律 fallback "shenzhen"。
 */

export interface CurrentCityResult {
  city: string;
  /** true 表示走了 fallback（未从 session / CF header 拿到，落到默认深圳） */
  isFallback: boolean;
}

const FALLBACK_CITY = "shenzhen";

/**
 * 归一化城市字符串（小写 + 只保留字母数字，用于比较）。
 * 例："Shenzhen" / "SHEN ZHEN" → "shenzhen"
 */
function normalizeCity(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned || null;
}

/**
 * 从 Request 解析当前用户城市。
 *
 * @param request Cloudflare Workers 传入的 Request（用于读 CF-IPCity）
 * @param sessionCity 调用方从 users.city 预取的值（登录用户走此路径），可选
 */
export function getCurrentCity(
  request: Request,
  sessionCity?: string | null,
): CurrentCityResult {
  // 1. session city（登录用户，最高优先级）
  const fromSession = normalizeCity(sessionCity);
  if (fromSession) {
    return { city: fromSession, isFallback: false };
  }

  // 2. Cloudflare CF-IPCity header
  const cfCity = normalizeCity(request.headers.get("cf-ipcity"));
  if (cfCity) {
    return { city: cfCity, isFallback: false };
  }

  // 3. fallback
  return { city: FALLBACK_CITY, isFallback: true };
}
