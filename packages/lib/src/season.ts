/**
 * 季节判定（server 端计算，跨端一致）
 *
 * P0-C spec §4.1 A 规则：判断"当前月份 ∈ locations.bestSeason"
 * P0-B spec §4.5：详情页显示"现在去正好 / 当前非最佳季节"
 *
 * 决策（Martin CR PR #393 v1.1）：季节由 API 内部算，不接受前端传入
 *  - 跨端一致（服务端 UTC → 北京时间 offset 计算，避免 client 时区飘）
 *  - 不信任前端（否则可被前端伪造刷推荐）
 *
 * 简化：目前所有城市走同一份月份→季节映射（北半球）。
 * city 参数 reserved 给 P1 南半球场景（悉尼、里约等），当前直接忽略。
 */

export type Season = "spring" | "summer" | "autumn" | "winter";

/**
 * 中文季节 label → Season key 归一化 map
 *
 * gomate prod / seed 数据里 locations.bestSeason 是中文 label（"春季" / "夏季" / "秋季" / "冬季"），
 * 但 spec §4.1 A 规则以 Season key（"spring" 等）参与匹配。
 *
 * 该 map 用于：
 *  - API 侧 seasonMatches：把 bestSeason JSON 里的中文 label 归一化后再与 Season key 比对
 *  - 前端 use-location-form.ts SEASON_ZH_TO_KEY 复用（避免两处硬编码飘）
 *
 * spec addendum（Martin CR PR #395 blocker-1）：
 *  - T1 阶段 API/前端共用这份 zh↔en map；prod 数据存储层暂不动
 *  - P1 长期方案：locations.bestSeason 迁移到英文 key（存储层归一），届时可 drop 本 helper
 */
const SEASON_ZH_TO_KEY: Record<string, Season> = {
  春季: "spring",
  夏季: "summer",
  秋季: "autumn",
  冬季: "winter",
};

/**
 * 归一化任意 season label 到 Season key。
 * 返回 null 表示无法识别（保持严格：不猜、不 fallback，让调用方决定）。
 */
export function normalizeSeasonLabel(label: string): Season | null {
  if (!label) return null;
  const trimmed = label.trim();
  // 已是英文 Season key 直接返回
  if (
    trimmed === "spring" ||
    trimmed === "summer" ||
    trimmed === "autumn" ||
    trimmed === "winter"
  ) {
    return trimmed;
  }
  // 中文 label 走 map
  return SEASON_ZH_TO_KEY[trimmed] ?? null;
}

/**
 * 根据日期（默认当前）+ 城市（reserved）判断当前季节。
 *
 * 中国大陆采用气象学季节划分：
 *  - 春季：3、4、5 月
 *  - 夏季：6、7、8 月
 *  - 秋季：9、10、11 月
 *  - 冬季：12、1、2 月
 *
 * @param date 参考日期，默认 `new Date()`（服务端调用时是 UTC，函数内转北京时间取月份）
 * @param _city reserved for P1 南半球，当前忽略
 */
export function getCurrentSeason(date: Date = new Date(), _city?: string): Season {
  // 转北京时间取月份（避免 UTC 12月 → 北京 1月 边界误判）
  const utcMs = date.getTime();
  const beijingMs = utcMs + 8 * 60 * 60 * 1000;
  const month = new Date(beijingMs).getUTCMonth() + 1; // 1-12

  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}
