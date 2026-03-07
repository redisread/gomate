/** 生成高德地图导航跳转 URL（优先唤起 App） */
export function getAmapNavigateUrl(
  coordinates: { lat: number; lng: number },
  name: string
): string {
  const { lat, lng } = coordinates;
  const params = new URLSearchParams({
    position: `${lng},${lat}`,
    name,
    src: "gomate",
    coordinate: "gaode",
    callnative: "1",
  });
  return `https://uri.amap.com/marker?${params.toString()}`;
}

/** 判断坐标是否有效（非零点） */
export function isValidCoordinates(coordinates?: { lat: number; lng: number }): boolean {
  return !!(coordinates && (coordinates.lat !== 0 || coordinates.lng !== 0));
}

/** 高德地图地理编码搜索结果 */
export interface AmapGeocodeResult {
  /**  formatted address */
  formatted_address: string;
  /** 省 */
  province: string;
  /** 市 */
  city: string;
  /** 区 */
  district: string;
  /** 街道 */
  township: string;
  /** 坐标 {lng, lat} */
  location: string;
  /** 地址成分 */
  addressComponent?: {
    province: string;
    city: string;
    district: string;
    township: string;
    street: string;
    number: string;
  };
}

/** 高德地图地理编码搜索响应 */
interface AmapGeocodeResponse {
  status: string;
  info: string;
  count: string;
  geocodes: AmapGeocodeResult[];
}

/**
 * 使用高德地图地理编码 API 搜索地址
 * @param keyword 搜索关键词
 * @param city 可选的城市限制
 * @returns 搜索结果列表
 */
export async function searchAddress(
  keyword: string,
  city?: string
): Promise<AmapGeocodeResult[]> {
  if (!keyword.trim()) {
    return [];
  }

  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key) {
    console.error("高德地图 API Key 未配置");
    return [];
  }

  const params = new URLSearchParams({
    key,
    address: keyword,
    output: "json",
  });

  if (city) {
    params.append("city", city);
  }

  try {
    const response = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?${params.toString()}`
    );
    const data: AmapGeocodeResponse = await response.json();

    if (data.status === "1" && data.geocodes) {
      return data.geocodes;
    }
    return [];
  } catch (error) {
    console.error("地址搜索失败:", error);
    return [];
  }
}

/**
 * 解析高德地图坐标字符串为对象
 * @param location 高德坐标字符串 "lng,lat"
 * @returns 坐标对象 {lat, lng}
 */
export function parseAmapLocation(location: string): { lat: number; lng: number } | null {
  const [lng, lat] = location.split(",").map(Number);
  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }
  return { lat, lng };
}
