import satori from "satori";

interface TeamPosterData {
  title: string;
  date: string;
  locationName?: string | null;
  coverImage?: string | null;
  currentMembers: number;
  maxMembers: number;
  leaderName?: string | null;
  leaderAvatar?: string | null;
  spotsToForm?: number | null;
  qrCodeDataUrl?: string | null;
  fonts: Array<{
    name: string;
    data: ArrayBuffer;
    weight: number;
    style: string;
  }>;
}

const POSTER_WIDTH = 375;
const POSTER_HEIGHT = 468;
const CARD_WIDTH = 343;
const COVER_HEIGHT = 118;

function clampText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

// 日历图标
function CalendarIcon() {
  return {
    type: "svg",
    props: {
      width: 12,
      height: 12,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#b45309",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { display: "flex" },
      children: [
        { type: "rect", props: { x: 3, y: 4, width: 18, height: 18, rx: 2, ry: 2 } },
        { type: "line", props: { x1: 16, y1: 2, x2: 16, y2: 6 } },
        { type: "line", props: { x1: 8, y1: 2, x2: 8, y2: 6 } },
        { type: "line", props: { x1: 3, y1: 10, x2: 21, y2: 10 } },
      ],
    },
  };
}

// 位置图标
function LocationIcon() {
  return {
    type: "svg",
    props: {
      width: 12,
      height: 12,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#b45309",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { display: "flex" },
      children: [
        { type: "path", props: { d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" } },
        { type: "circle", props: { cx: 12, cy: 10, r: 3 } },
      ],
    },
  };
}

// 用户图标
function UsersIcon() {
  return {
    type: "svg",
    props: {
      width: 12,
      height: 12,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#57534e",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { display: "flex" },
      children: [
        { type: "path", props: { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" } },
        { type: "circle", props: { cx: 9, cy: 7, r: 4 } },
        { type: "path", props: { d: "M23 21v-2a4 4 0 0 0-3-3.87" } },
        { type: "path", props: { d: "M16 3.13a4 4 0 0 1 0 7.75" } },
      ],
    },
  };
}

function pill(label: string, color = "#92400e", bg = "#fffbeb") {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5px 10px",
        borderRadius: 999,
        backgroundColor: bg,
        border: "1px solid rgba(217, 119, 6, 0.18)",
      },
      children: {
        type: "span",
        props: {
          style: {
            display: "flex",
            fontSize: 11,
            fontWeight: 700,
            color,
          },
          children: label,
        },
      },
    },
  };
}

function infoCard(label: string, value: string, icon?: unknown) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        flex: 1,
        minWidth: 0,
        padding: "10px 12px",
        borderRadius: 12,
        backgroundColor: "#ffffff",
        border: "1px solid #e7e5e4",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            },
            children: [
              icon || null,
              {
                type: "span",
                props: {
                  style: {
                    display: "flex",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#78716c",
                  },
                  children: label,
                },
              },
            ],
          },
        },
        {
          type: "span",
          props: {
            style: {
              display: "flex",
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.3,
              color: "#44403c",
              maxHeight: 34,
              overflow: "hidden",
            },
            children: clampText(value, 18),
          },
        },
      ],
    },
  };
}

/**
 * 队伍分享海报模板（4:5 分享版）
 *
 * 设计原则：
 * - 不使用 emoji，避免 Satori/字体缺失渲染成方框。
 * - 不使用复杂 boxShadow，避免 Cloudflare Workers CPU 1102 风险。
 * - 让无封面队伍也有完整视觉层次，而不是中间大片留白。
 */
export async function renderTeamPoster(data: TeamPosterData): Promise<string> {
  const {
    title,
    date,
    locationName,
    coverImage,
    currentMembers,
    maxMembers,
    leaderName,
    leaderAvatar,
    spotsToForm,
    qrCodeDataUrl,
    fonts,
  } = data;

  const fontFamily = fonts.length > 0 ? fonts[0].name : "system-ui";
  const hasCover = !!coverImage;
  const safeMaxMembers = Math.max(maxMembers || currentMembers || 1, 1);
  const progressPercent = Math.min(Math.max(currentMembers / safeMaxMembers, 0), 1);
  const progressWidth = Math.round(progressPercent * 190);
  const statusText = spotsToForm && spotsToForm > 0 ? `还差 ${spotsToForm} 人成行` : "队伍已成行";
  const locationText = locationName || "目的地待确认";
  const leaderInitial = leaderName?.trim()?.charAt(0)?.toUpperCase() || "G";

  const header = hasCover
    ? {
        type: "div",
        props: {
          style: {
            display: "flex",
            width: POSTER_WIDTH,
            height: COVER_HEIGHT,
            position: "relative",
            overflow: "hidden",
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          },
          children: [
            {
              type: "img",
              props: {
                src: coverImage,
                style: {
                  display: "flex",
                  width: POSTER_WIDTH,
                  height: COVER_HEIGHT,
                  objectFit: "cover",
                },
              },
            },
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(28, 25, 23, 0.05) 0%, rgba(28, 25, 23, 0.46) 100%)",
                },
              },
            },
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  position: "absolute",
                  top: 14,
                  left: 16,
                },
                children: pill(statusText, "#ffffff", "rgba(217, 119, 6, 0.88)"),
              },
            },
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  position: "absolute",
                  top: 14,
                  right: 16,
                  padding: "5px 9px",
                  borderRadius: 999,
                  backgroundColor: "rgba(255, 255, 255, 0.20)",
                  border: "1px solid rgba(255, 255, 255, 0.30)",
                },
                children: {
                  type: "span",
                  props: {
                    style: {
                      display: "flex",
                      color: "#ffffff",
                      fontSize: 11,
                      fontWeight: 700,
                    },
                    children: "GoMate",
                  },
                },
              },
            },
          ],
        },
      }
    : {
        type: "div",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
            width: POSTER_WIDTH,
            height: 92,
            padding: "16px 20px 0 20px",
            background: "linear-gradient(135deg, #fef3c7 0%, #fed7aa 56%, #fff7ed 100%)",
          },
          children: [
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
                children: [
                  pill(statusText),
                  {
                    type: "span",
                    props: {
                      style: {
                        display: "flex",
                        color: "#92400e",
                        fontSize: 12,
                        fontWeight: 800,
                      },
                      children: "GoMate",
                    },
                  },
                ],
              },
            },
            {
              type: "span",
              props: {
                style: {
                  display: "flex",
                  marginTop: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#92400e",
                },
                children: "找到同行的人，出发就不远",
              },
            },
          ],
        },
      };

  const svg = await satori(
    // @ts-expect-error - Satori accepts plain object format
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: POSTER_WIDTH,
          height: POSTER_HEIGHT,
          backgroundColor: "#fffaf0",
          fontFamily,
          overflow: "hidden",
          position: "relative",
        },
        children: [
          header,
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                width: CARD_WIDTH,
                margin: "10px 16px 0 16px",
                padding: "13px 14px 12px 14px",
                borderRadius: 18,
                backgroundColor: "#ffffff",
                border: "1px solid rgba(214, 211, 209, 0.84)",
              },
              children: [
                {
                  type: "h1",
                  props: {
                    style: {
                      display: "flex",
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 800,
                      lineHeight: 1.25,
                      color: "#1c1917",
                      maxHeight: 52,
                      overflow: "hidden",
                      letterSpacing: "-0.2px",
                      textShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    },
                    children: clampText(title, 32),
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 10,
                    },
                    children: [
                      infoCard("出发时间", date, CalendarIcon()),
                      infoCard("集合地点", locationText, LocationIcon()),
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      marginTop: 10,
                      padding: "10px",
                      borderRadius: 14,
                      backgroundColor: "#fafaf9",
                      border: "1px solid #e7e5e4",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "baseline",
                            justifyContent: "space-between",
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                },
                                children: [
                                  UsersIcon(),
                                  {
                                    type: "span",
                                    props: {
                                      style: {
                                        display: "flex",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: "#57534e",
                                      },
                                      children: "同行伙伴",
                                    },
                                  },
                                ],
                              },
                            },
                            {
                              type: "span",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: 18,
                                  fontWeight: 800,
                                  color: "#0f766e",
                                },
                                children: `${currentMembers}/${safeMaxMembers} 人`,
                              },
                            },
                          ],
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            width: 190,
                            height: 8,
                            backgroundColor: "#e7e5e4",
                            borderRadius: 999,
                            overflow: "hidden",
                          },
                          children: {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                width: progressWidth,
                                height: 8,
                                borderRadius: 999,
                                background: "linear-gradient(90deg, #10b981 0%, #14b8a6 100%)",
                              },
                            },
                          },
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 11,
                            color: "#78716c",
                          },
                          children:
                            spotsToForm && spotsToForm > 0
                              ? "再来几位伙伴，这趟就能出发"
                              : "队伍已达到出发人数，欢迎继续加入",
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                width: CARD_WIDTH,
                margin: "10px 16px 0 16px",
                padding: "10px 14px",
                borderRadius: 18,
                backgroundColor: "#ffffff",
                border: "1px solid rgba(214, 211, 209, 0.84)",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 9,
                      width: 174,
                    },
                    children: [
                      leaderAvatar
                        ? {
                            type: "img",
                            props: {
                              src: leaderAvatar,
                              style: {
                                display: "flex",
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                objectFit: "cover",
                                border: "2px solid #fbbf24",
                              },
                            },
                          }
                        : {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 14,
                                fontWeight: 800,
                                color: "#ffffff",
                                border: "2px solid #fbbf24",
                              },
                              children: leaderInitial,
                            },
                          },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                            minWidth: 0,
                          },
                          children: [
                            {
                              type: "span",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#b45309",
                                },
                                children: "发起人",
                              },
                            },
                            {
                              type: "span",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#292524",
                                  maxHeight: 18,
                                  overflow: "hidden",
                                },
                                children: clampText(leaderName || "GoMate 用户", 14),
                              },
                            },
                            {
                              type: "span",
                              props: {
                                style: {
                                  display: "flex",
                                  marginTop: 2,
                                  fontSize: 10,
                                  color: "#78716c",
                                },
                                children: "邀请你一起出发",
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 10,
                            fontWeight: 800,
                            color: "#92400e",
                          },
                          children: "扫码加入",
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            padding: 4,
                            backgroundColor: "#ffffff",
                            borderRadius: 12,
                            border: "1px solid #d6d3d1",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                          },
                          children: qrCodeDataUrl
                            ? {
                                type: "img",
                                props: {
                                  src: qrCodeDataUrl,
                                  style: {
                                    display: "flex",
                                    width: 64,
                                    height: 64,
                                  },
                                },
                              }
                            : {
                                type: "div",
                                props: {
                                  style: {
                                    display: "flex",
                                    width: 64,
                                    height: 64,
                                    backgroundColor: "#f5f5f4",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 11,
                                    color: "#a8a29e",
                                  },
                                  children: "QR",
                                },
                              },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#b45309",
                    },
                    children: "GoMate",
                  },
                },
                {
                  type: "span",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: 11,
                      color: "#78716c",
                    },
                    children: "找到同行的人，出发就不远",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
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
