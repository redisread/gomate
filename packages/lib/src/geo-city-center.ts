/**
 * 城市中心坐标（P0-B §3.5「自驾距离」参考点）
 *
 * 用途：locations 只存自己的 lat/lng，spec §3.3 视觉「距深圳市中心约 X km」需要一个基准点。
 * 存储层不加城市中心字段（会随城市扩张失控）；从代码里的静态 map 取。
 *
 * 决策（Martin CR 提前口径）：
 *  - MVP 只覆盖 shenzhen（gomate 主战场），未知城市 fallback 深圳中心
 *  - 城市 key 归一走 `normalizeCity`（同 geo-fallback.ts）
 *  - 城市中心用官方地标：福田区市民中心
 *
 * 未来扩展：广州、上海、北京等接入时在这里加一行；P1 可迁到 D1 表。
 */

export interface CityCenter {
  /** 归一化 city key（与 geo-fallback.ts 保持一致：小写 + 只保留字母数字） */
  key: string;
  /** 中文展示名 */
  labelZh: string;
  /** 英文展示名 */
  labelEn: string;
  /** 日文展示名 */
  labelJa: string;
  lat: number;
  lng: number;
}

/**
 * 城市中心坐标表。新增城市在这里追加。
 * key 必须走 `normalizeCity`（小写 + 只保留字母数字）保持稳定。
 */
const CITY_CENTERS: Record<string, CityCenter> = {
  shenzhen: {
    key: "shenzhen",
    labelZh: "深圳市中心",
    labelEn: "Shenzhen City Center",
    labelJa: "深圳市中心",
    lat: 22.5478,
    lng: 114.0596, // 福田区市民中心
  },
};

const FALLBACK_CENTER = CITY_CENTERS.shenzhen!;

/**
 * 取城市中心。未知 city → fallback shenzhen（gomate 主战场）。
 * 保证返回值非 null，调用方可无脑用。
 */
export function getCityCenter(city: string | null | undefined): CityCenter {
  if (!city) return FALLBACK_CENTER;
  return CITY_CENTERS[city] ?? FALLBACK_CENTER;
}
