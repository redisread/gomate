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
