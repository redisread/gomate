/** 生成高德静态地图图片 URL */
export function getAmapStaticImageUrl(
  coordinates: { lat: number; lng: number },
  options?: { zoom?: number; width?: number; height?: number }
): string {
  const { lat, lng } = coordinates;
  const zoom = options?.zoom ?? 14;
  const width = options?.width ?? 400;
  const height = options?.height ?? 200;
  const params = new URLSearchParams({
    location: `${lng},${lat}`,
    zoom: String(zoom),
    size: `${width}*${height}`,
    markers: `mid,0xE84031,A:${lng},${lat}`,
    scale: "2",
    key: "web",
  });
  return `https://restapi.amap.com/v3/staticmap?${params.toString()}`;
}

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
