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

/**
 * 队伍分享海报模板
 * 基于 team-poster-content.tsx 设计
 * 尺寸: 375 x auto (约 800px)
 */
export async function renderTeamPoster(data: TeamPosterData): Promise<string> {
  const { title, date, locationName, coverImage, currentMembers, maxMembers, leaderName, leaderAvatar, spotsToForm, qrCodeDataUrl, fonts } = data;

  const fontFamily = fonts.length > 0 ? fonts[0].name : "system-ui";
  const hasCover = !!coverImage;
  const hasLocation = !!locationName;
  const hasLeader = !!leaderName;

  // 计算动态高度
  const baseHeight = 400;
  const coverHeight = hasCover ? 220 : 0;
  const locationHeight = hasLocation ? 60 : 0;
  const leaderHeight = hasLeader ? 64 : 0;
  const calculatedHeight = baseHeight + coverHeight + locationHeight + leaderHeight;

  // 进度百分比
  const progressPercent = Math.min((currentMembers / maxMembers) * 100, 100);
  const progressWidth = Math.round((progressPercent / 100) * 64);

  // 状态标签文字
  const statusText = spotsToForm && spotsToForm > 0
    ? `还差 ${spotsToForm} 人成行`
    : "已成行";

  const svg = await satori(
    // @ts-expect-error - Satori accepts plain object format
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: 375,
          backgroundColor: "#ffffff",
          fontFamily,
        },
        children: [
          // 封面图区域
          ...(hasCover
            ? [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      width: 375,
                      height: 220,
                      position: "relative",
                      overflow: "hidden",
                    },
                    children: [
                      // 封面图
                      {
                        type: "img",
                        props: {
                          src: coverImage,
                          style: {
                            display: "flex",
                            width: 375,
                            height: 220,
                            objectFit: "cover",
                          },
                        },
                      },
                      // 渐变遮罩
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
                            background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)",
                          },
                        },
                      },
                      // 状态标签
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            position: "absolute",
                            top: 16,
                            left: 16,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            backgroundColor: "rgba(217, 119, 6, 0.85)",
                            borderRadius: 9999,
                          },
                          children: {
                            type: "span",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#ffffff",
                              },
                              children: statusText,
                            },
                          },
                        },
                      },
                      // GoMate Logo
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            position: "absolute",
                            top: 16,
                            right: 16,
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  width: 28,
                                  height: 28,
                                  backgroundColor: "rgba(255,255,255,0.2)",
                                  borderRadius: 8,
                                  alignItems: "center",
                                  justifyContent: "center",
                                },
                                children: {
                                  type: "span",
                                  props: {
                                    style: {
                                      display: "flex",
                                      fontSize: 14,
                                      color: "#ffffff",
                                    },
                                    children: "⛰️",
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
                                  fontWeight: 600,
                                  color: "#ffffff",
                                },
                                children: "GoMate",
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ]
            : []),

          // 内容区域
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                padding: 24,
                paddingTop: hasCover ? 24 : 32,
              },
              children: [
                // 装饰背景（渐变）
                ...(hasCover
                  ? []
                  : [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 128,
                            background: "linear-gradient(180deg, #FEF3C7 0%, #ffffff 100%)",
                          },
                        },
                      },
                    ]),

                // 标题
                {
                  type: "h1",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#1c1917",
                      lineHeight: 1.4,
                      margin: 0,
                      marginBottom: 16,
                    },
                    children: title,
                  },
                },

                // 日期卡片
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      backgroundColor: "rgba(254, 243, 199, 0.8)",
                      borderRadius: 12,
                      marginBottom: 12,
                    },
                    children: [
                      // 日历图标
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            width: 36,
                            height: 36,
                            backgroundColor: "rgba(217, 119, 6, 0.15)",
                            borderRadius: 8,
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                          },
                          children: "📅",
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                          },
                          children: [
                            {
                              type: "span",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: 11,
                                  color: "#78716c",
                                },
                                children: "活动日期",
                              },
                            },
                            {
                              type: "span",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "#292524",
                                },
                                children: date,
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },

                // 地点卡片
                ...(hasLocation
                  ? [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            padding: 12,
                            backgroundColor: "rgba(245, 245, 244, 0.8)",
                            borderRadius: 12,
                            marginBottom: 12,
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  width: 36,
                                  height: 36,
                                  backgroundColor: "rgba(120, 113, 108, 0.1)",
                                  borderRadius: 8,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 16,
                                },
                                children: "📍",
                              },
                            },
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  flexDirection: "column",
                                },
                                children: [
                                  {
                                    type: "span",
                                    props: {
                                      style: {
                                        display: "flex",
                                        fontSize: 11,
                                        color: "#78716c",
                                      },
                                      children: "活动地点",
                                    },
                                  },
                                  {
                                    type: "span",
                                    props: {
                                      style: {
                                        display: "flex",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: "#292524",
                                      },
                                      children: locationName,
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ]
                  : []),

                // 人数卡片
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      backgroundColor: "rgba(209, 250, 229, 0.8)",
                      borderRadius: 12,
                      marginBottom: hasLeader ? 12 : 20,
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            width: 36,
                            height: 36,
                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                            borderRadius: 8,
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                          },
                          children: "👥",
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                          },
                          children: [
                            {
                              type: "span",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: 11,
                                  color: "#78716c",
                                },
                                children: "队伍人数",
                              },
                            },
                            {
                              type: "span",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "#292524",
                                },
                                children: `${currentMembers}/${maxMembers}人`,
                              },
                            },
                          ],
                        },
                      },
                      // 进度条
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            width: 64,
                            height: 8,
                            backgroundColor: "#e7e5e4",
                            borderRadius: 4,
                            overflow: "hidden",
                          },
                          children: {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                width: progressWidth,
                                height: 8,
                                backgroundColor: "#10b981",
                                borderRadius: 4,
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },

                // 队长信息
                ...(hasLeader
                  ? [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid #f5f5f4",
                            marginBottom: 20,
                          },
                          children: [
                            // 队长头像
                            leaderAvatar
                              ? {
                                  type: "img",
                                  props: {
                                    src: leaderAvatar,
                                    style: {
                                      display: "flex",
                                      width: 40,
                                      height: 40,
                                      borderRadius: 20,
                                      objectFit: "cover",
                                    },
                                  },
                                }
                              : {
                                  type: "div",
                                  props: {
                                    style: {
                                      display: "flex",
                                      width: 40,
                                      height: 40,
                                      borderRadius: 20,
                                      background: "linear-gradient(135deg, #D97706 0%, #FCD34D 100%)",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 14,
                                      fontWeight: 700,
                                      color: "#ffffff",
                                    },
                                    children: leaderName!.charAt(0).toUpperCase(),
                                  },
                                },
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  flexDirection: "column",
                                },
                                children: [
                                  {
                                    type: "span",
                                    props: {
                                      style: {
                                        display: "flex",
                                        fontSize: 11,
                                        color: "#78716c",
                                      },
                                      children: "队长",
                                    },
                                  },
                                  {
                                    type: "span",
                                    props: {
                                      style: {
                                        display: "flex",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: "#292524",
                                      },
                                      children: leaderName,
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ]
                  : []),

                // 分割线
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 20,
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flex: 1,
                            height: 1,
                            backgroundColor: "#e7e5e4",
                          },
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexDirection: "row",
                            gap: 4,
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  width: 6,
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: "#fbbf24",
                                },
                              },
                            },
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  width: 6,
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: "#f59e0b",
                                },
                              },
                            },
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  width: 6,
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: "#d97706",
                                },
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
                            flex: 1,
                            height: 1,
                            backgroundColor: "#e7e5e4",
                          },
                        },
                      },
                    ],
                  },
                },

                // QR Code 区域
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            padding: 16,
                            backgroundColor: "#ffffff",
                            borderRadius: 16,
                            border: "1px solid #f5f5f4",
                            boxShadow: "0 10px 40px -10px rgba(217, 119, 6, 0.2)",
                          },
                          children: qrCodeDataUrl
                            ? {
                                type: "img",
                                props: {
                                  src: qrCodeDataUrl,
                                  style: {
                                    display: "flex",
                                    width: 144,
                                    height: 144,
                                  },
                                },
                              }
                            : {
                                type: "div",
                                props: {
                                  style: {
                                    display: "flex",
                                    width: 144,
                                    height: 144,
                                    backgroundColor: "#f5f5f4",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 12,
                                    color: "#a8a29e",
                                  },
                                  children: "QR",
                                },
                              },
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            marginTop: 16,
                          },
                          children: [
                            {
                              type: "span",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: "#b45309",
                                  marginBottom: 4,
                                },
                                children: "扫码加入队伍",
                              },
                            },
                            {
                              type: "span",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: 11,
                                  color: "#a8a29e",
                                },
                                children: "gomate.live",
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },

          // 底部装饰
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                height: 64,
                position: "relative",
                overflow: "hidden",
                marginTop: "auto",
              },
              children: [
                {
                  type: "svg",
                  props: {
                    width: 375,
                    height: 60,
                    viewBox: "0 0 375 60",
                    preserveAspectRatio: "none",
                    style: {
                      display: "flex",
                      position: "absolute",
                      bottom: 0,
                    },
                    children: [
                      {
                        type: "path",
                        props: {
                          d: "M0,60 L0,40 Q93.75,20 187.5,40 Q281.25,60 375,40 L375,60 Z",
                          fill: "#FEF3C7",
                          opacity: 0.5,
                        },
                      },
                      {
                        type: "path",
                        props: {
                          d: "M0,60 L0,50 Q93.75,30 187.5,50 Q281.25,70 375,50 L375,60 Z",
                          fill: "#FDE68A",
                          opacity: 0.3,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 375,
      height: calculatedHeight,
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
