/**
 * 中国省份地图投影常量
 * 投影：等距矩形 (equirectangular)，lon 73-136 / lat 17-54 → 800×620 viewBox
 * 与 public/maps/china-provinces.svg 的生成脚本一致。
 * 数据源：阿里 DataV areas_v3 100000_full（公开）。
 */
export const CHINA_MAP_BOUNDS = {
  lonMin: 73, lonMax: 136, latMin: 17, latMax: 54,
  width: 800, height: 620,
} as const;

export interface MapPointPosition {
  x: number;
  y: number;
}

export interface MapTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export const MAP_PROVINCE_PARAM = "mapProvince";
export const PROVINCE_ZOOM_SCALE = 3;

export function projectChina(lat: number, lng: number): { x: number; y: number } {
  const b = CHINA_MAP_BOUNDS;
  return {
    x: ((lng - b.lonMin) / (b.lonMax - b.lonMin)) * b.width,
    y: ((b.latMax - lat) / (b.latMax - b.latMin)) * b.height,
  };
}

/** 返回地图 group 的变换，让选中的省份移动到画布中心。 */
export function getMapTransform(province: string | null): MapTransform {
  if (!province || !PROVINCE_CENTERS[province]) {
    return { scale: 1, translateX: 0, translateY: 0 };
  }

  const center = PROVINCE_CENTERS[province];
  return {
    scale: PROVINCE_ZOOM_SCALE,
    translateX: CHINA_MAP_BOUNDS.width / 2 - center.x * PROVINCE_ZOOM_SCALE,
    translateY: CHINA_MAP_BOUNDS.height / 2 - center.y * PROVINCE_ZOOM_SCALE,
  };
}

export function transformMapPoint(point: MapPointPosition, transform: MapTransform): MapPointPosition {
  return {
    x: point.x * transform.scale + transform.translateX,
    y: point.y * transform.scale + transform.translateY,
  };
}

/** Keep marker geometry stable while the map content is zoomed. */
export function getMapMarkerRadius(radius: number, mapScale: number): number {
  return radius / mapScale;
}

export function parseMapProvince(search: string): string | null {
  const province = new URLSearchParams(search).get(MAP_PROVINCE_PARAM);
  return province && PROVINCE_CENTERS[province] ? province : null;
}

/** 省名 → 投影后的省中心坐标（tooltip 定位用） */
export const PROVINCE_CENTERS: Record<string, { x: number; y: number }> = {
  "北京市": { x: 551.2, y: 236.2 },
  "天津市": { x: 561.1, y: 249.2 },
  "河北省": { x: 527.0, y: 267.3 },
  "山西省": { x: 502.2, y: 270.5 },
  "内蒙古自治区": { x: 491.1, y: 220.9 },
  "辽宁省": { x: 640.4, y: 204.5 },
  "吉林省": { x: 664.4, y: 169.5 },
  "黑龙江省": { x: 681.2, y: 138.1 },
  "上海市": { x: 615.5, y: 381.5 },
  "江苏省": { x: 581.2, y: 368.0 },
  "浙江省": { x: 598.8, y: 397.3 },
  "安徽省": { x: 562.3, y: 371.0 },
  "福建省": { x: 588.0, y: 467.9 },
  "江西省": { x: 544.7, y: 424.3 },
  "山东省": { x: 558.7, y: 290.3 },
  "河南省": { x: 516.4, y: 322.4 },
  "湖北省": { x: 524.4, y: 392.4 },
  "湖南省": { x: 507.7, y: 432.4 },
  "广东省": { x: 511.5, y: 517.4 },
  "广西壮族自治区": { x: 448.5, y: 522.4 },
  "海南省": { x: 474.0, y: 569.2 },
  "重庆市": { x: 425.5, y: 410.0 },
  "四川省": { x: 394.5, y: 391.1 },
  "贵州省": { x: 428.1, y: 459.5 },
  "云南省": { x: 377.3, y: 485.3 },
  "西藏自治区": { x: 230.3, y: 407.9 },
  "陕西省": { x: 456.5, y: 330.7 },
  "甘肃省": { x: 391.4, y: 300.6 },
  "青海省": { x: 365.4, y: 291.2 },
  "宁夏回族自治区": { x: 422.6, y: 260.3 },
  "新疆维吾尔自治区": { x: 185.6, y: 171.0 },
  "台湾省": { x: 616.0, y: 485.2 },
  "香港特别行政区": { x: 522.8, y: 530.9 },
  "澳门特别行政区": { x: 514.9, y: 532.9 },
};
