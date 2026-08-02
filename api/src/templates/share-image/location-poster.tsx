import satori from "satori";
import type { PosterLocale } from "../../services/share-image/poster-i18n";
import { localizeDifficulty } from "../../services/share-image/poster-i18n";
import { POSTER_TOKENS } from "./poster-tokens";

interface RouteMetrics {
  difficulty?: string | null;
  durationMin?: number | null;
  durationMax?: number | null;
  distance?: number | null;
  elevation?: number | null;
}

interface LocationPosterData {
  title: string;
  subtitle?: string | null;
  description: string;
  address?: string | null;
  coverImage?: string | null;
  tags: string[];
  qrCodeDataUrl?: string | null;
  cityName?: string | null;
  bestSeason?: string[];
  type?: string | null;
  routeMetrics?: RouteMetrics | null;
  /** 海报文案语言，默认 zh-CN */
  locale?: PosterLocale;
  /** 注入的 i18n 文案（避免在模板里做双语分支） */
  i18n?: {
    scanToView?: string;
    siteSlogan?: string;
    bestSeasonLabel?: string;
    distanceLabel?: string;
    durationLabel?: string;
    elevationLabel?: string;
    difficultyLabel?: string;
    brandName?: string;
  };
  fonts: Array<{
    name: string;
    data: ArrayBuffer;
    weight: number;
    style: string;
  }>;
}

// ─── 调色板 ──────────────────────────────────────────────────────────────────
const T = POSTER_TOKENS;
const C = {
  ...T,
  primaryDark: "#B45309",
  border: "#E7E5E4",
  amber50: "#FFFBEB",
  amber100: "#FEF3C7",
};

// 尺寸常量
const W = 375;
const COVER_H = 210; // 16:9 → 375/211
const HERO_STRIP = 4;
const DESC_MAX_LEN = 60; // 描述截断长度（含 3 个省略号字符）

// 季节短标签（用于封面胶囊）
const SEASON_SHORT: Record<string, string> = {
  spring: "春",
  春季: "春",
  summer: "夏",
  夏季: "夏",
  autumn: "秋",
  秋季: "秋",
  winter: "冬",
  冬季: "冬",
  全年: "全年",
};

function formatDuration(min: number, max: number): string {
  if (min <= 0) return "";
  const toHours = (m: number) => {
    if (m < 60) return `${m}min`;
    const h = m / 60;
    return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
  };
  if (min === max || max <= 0) return toHours(min);
  return `${toHours(min)}-${toHours(max)}`;
}

function formatDistance(km: number): string {
  if (km <= 0) return "";
  return Number.isInteger(km) ? `${km}km` : `${km.toFixed(1)}km`;
}

function formatElevation(m: number): string {
  if (!m || m <= 0) return "";
  return `↑${m}m`;
}

/**
 * 地点分享海报 — Hero 封面 + 信息卡 + 路线指标 + Tags + QR
 *
 * 设计思路：
 * 1) 顶部封面 16:9，叠加热区渐变 + 品牌条纹 + 标题，右下贴季节胶囊
 * 2) 信息卡：路线指标三栏（距离/耗时/爬升）+ 副标题 + 描述 + 标签 + 地址
 * 3) 底栏：二维码 + Slogan + 品牌域名
 *
 * 黄昏户外视觉：
 * - 封面采用 3 个绝对定位 div 堆叠（cover-img → sky 冷色蒙版 → sun-glow 暖光蒙版）
 * - 标题保留白色并增加 sun-glow 微光晕
 * - QR 区域使用极淡 sun-glow 底色，像被晨光打亮
 *
 * 高度固定 696px（展示信息密度足够、且不超过一般朋友圈一屏）
 */
export async function renderLocationPoster(data: LocationPosterData): Promise<string> {
  const {
    title,
    subtitle,
    description,
    address,
    coverImage,
    tags,
    qrCodeDataUrl,
    cityName,
    bestSeason,
    type,
    routeMetrics,
    locale = "zh-CN",
    fonts,
  } = data;

  const fontFamily = fonts.length > 0 ? fonts[0].name : "system-ui";
  const i18n = data.i18n ?? {};

  const scanText = i18n.scanToView ?? "扫码查看地点详情";
  const sloganText = i18n.siteSlogan ?? "GoMate · 找到同行的人，出发就不远";
  const distanceLabel = i18n.distanceLabel ?? "距离";
  const durationLabel = i18n.durationLabel ?? "耗时";
  const elevationLabel = i18n.elevationLabel ?? "爬升";
  const difficultyLabel = i18n.difficultyLabel ?? "难度";
  const brandName = i18n.brandName ?? "gomate.live";

  const displayTags = tags.filter(Boolean).slice(0, 4).map((tag) => clampText(tag, 12));
  const cleanDesc = description.length > DESC_MAX_LEN
    ? `${description.slice(0, DESC_MAX_LEN - 3)}...`
    : description;

  // 路线三栏
  const distanceText = routeMetrics?.distance != null ? formatDistance(routeMetrics.distance) : "";
  const durationText = routeMetrics?.durationMin != null
    ? formatDuration(routeMetrics.durationMin, routeMetrics.durationMax ?? routeMetrics.durationMin)
    : "";
  const elevationText = routeMetrics?.elevation ? formatElevation(routeMetrics.elevation) : "";
  const hasRouteMetric = !!(distanceText || durationText || elevationText || routeMetrics?.difficulty);

  // 季节胶囊
  const seasons = (bestSeason ?? []).filter(Boolean).slice(0, 3);
  const seasonText = seasons.map((s) => SEASON_SHORT[s] ?? clampText(s, 6)).join(" · ");
  const displaySubtitle = subtitle ? clampText(subtitle, 28) : null;
  const displayAddress = address ? clampText(address, 38) : null;

  // 城市/类型行
  const metaLine = [cityName, type].filter(Boolean).join(" · ");

  const svg = await satori(
    // @ts-expect-error - Satori accepts plain object format
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: W,
          height: 696,
          backgroundColor: C.bg,
          fontFamily,
          position: "relative",
        },
        children: [
          // ─── Cover ─────────────────────────────────────────────────────
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                position: "relative",
                width: W,
                height: COVER_H,
                overflow: "hidden",
                backgroundColor: "#E7E5E4",
              },
              children: [
                // 1. 封面图
                coverImage
                  ? {
                      type: "img",
                      props: {
                        src: coverImage,
                        style: {
                          display: "flex",
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: W,
                          height: COVER_H,
                          objectFit: "cover",
                        },
                      },
                    }
                  : {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: W,
                          height: COVER_H,
                          background: "linear-gradient(135deg, #FEF3C7 0%, #FED7AA 100%)",
                          alignItems: "center",
                          justifyContent: "center",
                        },
                        children: {
                          type: "span",
                          props: {
                            style: { display: "flex", fontSize: 32, color: C.primary },
                            children: "🏔",
                          },
                        },
                      },
                    },
                // 2. 中层：sky 顶部冷色蒙版
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "linear-gradient(180deg, rgba(42,59,92,0.45) 0%, transparent 60%)",
                    },
                  },
                },
                // 3. 上层：sun-glow 底部暖光蒙版
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: 240,
                      background: "linear-gradient(180deg, rgba(28,25,23,0) 0%, rgba(42,59,92,0.30) 45%, rgba(232,144,48,0.55) 100%)",
                    },
                  },
                },
                // 左上品牌条纹标识
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: HERO_STRIP,
                      background: `linear-gradient(90deg, ${C.primary} 0%, ${C.primaryDark} 100%)`,
                    },
                  },
                },
                // 左下标题
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      position: "absolute",
                      bottom: 12,
                      left: 16,
                      right: 16,
                      flexDirection: "column",
                    },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 22,
                            lineHeight: "28px",
                            fontWeight: 800,
                            color: "#FFFFFF",
                            textShadow: "0 0 16px rgba(232,144,48,0.5)",
                            maxHeight: 56,
                            overflow: "hidden",
                          },
                          children: title,
                        },
                      },
                      metaLine
                        ? {
                            type: "span",
                            props: {
                              style: {
                                display: "flex",
                                marginTop: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: "rgba(255,255,255,0.85)",
                              },
                              children: metaLine,
                            },
                          }
                        : null,
                    ].filter(Boolean),
                  },
                },
                // 右下季节胶囊
                seasonText
                  ? {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          position: "absolute",
                          bottom: 14,
                          right: 12,
                          padding: "4px 9px",
                          borderRadius: 99,
                          backgroundColor: "rgba(255,255,255,0.95)",
                          // 注：Satori 不支持 backdropFilter，用半透明 + 边框替代毛玻璃
                        },
                        children: {
                          type: "span",
                          props: {
                            style: {
                              display: "flex",
                              fontSize: 10,
                              fontWeight: 700,
                              color: C.primaryDark,
                            },
                            children: seasonText,
                          },
                        },
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },

          // ─── 信息卡 ────────────────────────────────────────────────────
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                margin: "14px 14px 12px",
                padding: "14px 16px",
                backgroundColor: C.surface,
                borderRadius: 14,
                border: `1px solid ${C.border}`,
              },
              children: [
                // 路线指标三栏
                ...(hasRouteMetric
                  ? [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            gap: 8,
                            marginBottom: 12,
                            paddingBottom: 12,
                            borderBottom: `1px solid ${C.border}`,
                          },
                          children: [
                            ...(distanceText
                              ? [
                                  metricPill(distanceLabel, distanceText),
                                ]
                              : []),
                            ...(durationText
                              ? [
                                  metricPill(durationLabel, durationText),
                                ]
                              : []),
                            ...(elevationText
                              ? [
                                  metricPill(elevationLabel, elevationText),
                                ]
                              : []),
                            ...(routeMetrics?.difficulty
                              ? [
                                  metricPill(
                                    difficultyLabel,
                                    difficultyChip(locale, routeMetrics.difficulty),
                                  ),
                                ]
                              : []),
                          ].filter(Boolean),
                        },
                      },
                    ]
                  : []),

                // 副标题
                ...(displaySubtitle
                  ? [
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 13,
                            lineHeight: "18px",
                            fontWeight: 700,
                            color: C.title,
                            marginBottom: 6,
                          },
                          children: displaySubtitle,
                        },
                      },
                    ]
                  : []),

                // 描述
                {
                  type: "span",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: 12,
                      lineHeight: "17px",
                      color: C.body,
                      marginBottom: 10,
                    },
                    children: cleanDesc,
                  },
                },

                // 标签
                ...(displayTags.length > 0
                  ? [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            marginBottom: displayAddress ? 8 : 0,
                          },
                          children: displayTags.map((tag) => tagPill(tag)),
                        },
                      },
                    ]
                  : []),

                // 地址
                ...(displayAddress
                  ? [
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 11,
                            color: C.muted,
                            alignItems: "center",
                            gap: 4,
                          },
                          children: `📍 ${displayAddress}`,
                        },
                      },
                    ]
                  : []),
              ].filter(Boolean),
            },
          },

          // ─── 底栏（二维码 + Slogan）───────────────────────────────────
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                margin: "0 14px",
                padding: "12px 14px",
                backgroundColor: "rgba(232,144,48,0.04)",
                borderRadius: 14,
                border: `1px solid ${C.border}`,
                flex: 1,
              },
              children: [
                // 文案
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      flex: 1,
                      minWidth: 0,
                      paddingRight: 12,
                    },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 12,
                            fontWeight: 700,
                            color: C.title,
                          },
                          children: scanText,
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 10,
                            color: C.body,
                            lineHeight: "14px",
                          },
                          children: sloganText,
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 10,
                            fontWeight: 700,
                            color: C.primary,
                          },
                          children: brandName,
                        },
                      },
                    ],
                  },
                },
                // 二维码
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      padding: 6,
                      backgroundColor: "#FFFFFF",
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      flexShrink: 0,
                    },
                    children: qrCodeDataUrl
                      ? {
                          type: "img",
                          props: {
                            src: qrCodeDataUrl,
                            style: {
                              display: "flex",
                              width: 72,
                              height: 72,
                            },
                          },
                        }
                      : {
                          type: "div",
                          props: {
                            style: {
                              display: "flex",
                              width: 72,
                              height: 72,
                              backgroundColor: "#F5F5F4",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              color: C.muted,
                            },
                            children: "QR",
                          },
                        },
                  },
                },
              ],
            },
          },

          // 底部留白
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                height: 14,
              },
            },
          },
        ],
      },
    },
    {
      width: W,
      height: 696,
      fonts: fonts.map((f) => ({
        name: f.name,
        data: f.data,
        weight: f.weight as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
        style: f.style as "normal" | "italic",
      })),
    }
  );

  return svg;
}

// ─── 小组件 ─────────────────────────────────────────────────────────────────
function tagPill(label: string) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        padding: "3px 8px",
        backgroundColor: C.amber50,
        border: `1px solid ${C.amber100}`,
        borderRadius: 99,
      },
      children: {
        type: "span",
        props: {
          style: {
            display: "flex",
            fontSize: 10,
            fontWeight: 600,
            lineHeight: "14px",
            color: "#92400E",
          },
          children: `#${label}`,
        },
      },
    },
  };
}

function metricPill(label: string, value: string) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 3,
        flex: 1,
        minWidth: 0,
        padding: "6px 8px",
        backgroundColor: "#FAFAF9",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
      },
      children: [
        {
          type: "span",
          props: {
            style: {
              display: "flex",
              fontSize: 9,
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
            },
            children: label,
          },
        },
        {
          type: "span",
          props: {
            style: {
              display: "flex",
              fontSize: 13,
              fontWeight: 700,
              lineHeight: "16px",
              color: C.title,
              maxHeight: 16,
              overflow: "hidden",
              whiteSpace: "nowrap",
            },
            children: value,
          },
        },
      ],
    },
  };
}

function difficultyChip(locale: PosterLocale | undefined, d: string | null | undefined): string {
  if (!d) return "";
  return localizeDifficulty(locale ?? "zh-CN", d);
}

function clampText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}
