// 高德地图城市常量
export const AMAP_CITIES = {
  SHENZHEN: { adcode: "440300", name: "深圳", province: "广东省" },
  GUANGZHOU: { adcode: "440100", name: "广州", province: "广东省" },
  BEIJING: { adcode: "110000", name: "北京", province: "北京市" },
  SHANGHAI: { adcode: "310000", name: "上海", province: "上海市" },
  HANGZHOU: { adcode: "330100", name: "杭州", province: "浙江省" },
  CHENGDU: { adcode: "510100", name: "成都", province: "四川省" },
  WUHAN: { adcode: "420100", name: "武汉", province: "湖北省" },
} as const;

// 默认城市
export const DEFAULT_CITY = AMAP_CITIES.SHENZHEN;

// 内置城市列表（用于下拉选择）
export const SUPPORTED_CITIES = [
  AMAP_CITIES.SHENZHEN,
  // 后续扩展其他城市
];

// 城市类型
export type CityInfo = typeof AMAP_CITIES[keyof typeof AMAP_CITIES];