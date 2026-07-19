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
