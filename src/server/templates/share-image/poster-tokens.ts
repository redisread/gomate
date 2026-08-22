// 这些 token 仅用于 Satori 海报模板，禁止导入到 gomate app 前端 CSS
export const POSTER_TOKENS = {
  // 保留的 gomate DS v2.0 token
  bg: "#FAF7F2",
  surface: "#FFFFFF",
  primary: "#D97706",
  title: "#1C1917",
  body: "#57534E",
  muted: "#A8A29E",

  // 海报专用：黄昏户外的环境冷色与暖焦点
  sky: "#2A3B5C",
  skyDeep: "#1A2540",
  sunGlow: "#E89030",
} as const;
