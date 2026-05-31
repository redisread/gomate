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
 * 队伍分享海报模板（4:5 比例优化版）
 * 尺寸: 375 x 468（4:5 比例，适合微信/小红书分享）
 * 优化点：
 * 1. 固定高度 468px，避免过长
 * 2. 封面图压缩至 160px
 * 3. 地点信息简化
 * 4. 二维码增大至 160x160，周围留白
 * 5. 队长信息与二维码并排
 */
export async function renderTeamPoster(data: TeamPosterData): Promise<string> {
  const { title, date, locationName, coverImage, currentMembers, maxMembers, leaderName, leaderAvatar, spotsToForm, qrCodeDataUrl, fonts } = data;

  const fontFamily = fonts.length > 0 ? fonts[0].name : "system-ui";
  const hasCover = !!coverImage;
  const hasLocation = !!locationName;
  const hasLeader = !!leaderName;

  // 固定高度 468px（4:5 比例）
  const POSTER_HEIGHT = 468;
  const POSTER_WIDTH = 375;
  const COVER_HEIGHT = 160;

  // 进度百分比
  const progressPercent = Math.min((currentMembers / maxMembers) * 100, 100);
  const progressWidth = Math.round((progressPercent / 100) * 48);

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
          width: POSTER_WIDTH,
          height: POSTER_HEIGHT,
          backgroundColor: "#ffffff",
          fontFamily,
          overflow: "hidden",
        },
        children: [
          // 封面图区域（压缩至 160px）
          ...(hasCover
            ? [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      width: POSTER_WIDTH,
                      height: COVER_HEIGHT,
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
                            width: POSTER_WIDTH,
                            height: COVER_HEIGHT,
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
                            background: "linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 40%)",
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
                            top: 12,
                            left: 12,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            backgroundColor: "rgba(217, 119, 6, 0.9)",
                            borderRadius: 9999,
                          },
                          children: {
                            type: "span",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 10,
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
                            gap: 4,
                            position: "absolute",
                            top: 12,
                            right: 12,
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  width: 24,
                                  height: 24,
                                  backgroundColor: "rgba(255,255,255,0.25)",
                                  borderRadius: 6,
                                  alignItems: "center",
                                  justifyContent: "center",
                                },
                                children: {
                                  type: "span",
                                  props: {
                                    style: {
                                      display: "flex",
                                      fontSize: 12,
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
                                  fontSize: 10,
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

          // 内容区域（紧凑布局）
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                padding: 20,
                paddingTop: hasCover ? 16 : 24,
                flex: 1,
              },
              children: [
                // 无封面时的背景装饰
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
                            height: 100,
                            background: "linear-gradient(180deg, #FEF3C7 0%, #ffffff 100%)",
                          },
                        },
                      },
                    ]),

                // 标题（限制 2 行）
                {
                  type: "h1",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#1c1917",
                      lineHeight: 1.35,
                      margin: 0,
                      marginBottom: 12,
                      maxHeight: 48,
                      overflow: "hidden",
                    },
                    children: title,
                  },
                },

                // 日期 + 地点（单行合并）
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      backgroundColor: "rgba(254, 243, 199, 0.8)",
                      borderRadius: 10,
                      marginBottom: 10,
                    },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 14,
                          },
                          children: "📅",
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#292524",
                          },
                          children: date,
                        },
                      },
                      ...(hasLocation
                        ? [
                            {
                              type: "span",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: 12,
                                  color: "#78716c",
                                  marginLeft: 4,
                                },
                                children: `· ${locationName}`,
                              },
                            },
                          ]
                        : []),
                    ],
                  },
                },

                // 人数进度条（紧凑版）
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 16,
                    },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 13,
                            color: "#78716c",
                          },
                          children: "👥",
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#292524",
                          },
                          children: `${currentMembers}/${maxMembers}人`,
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flex: 1,
                            height: 6,
                            backgroundColor: "#e7e5e4",
                            borderRadius: 3,
                            overflow: "hidden",
                            marginLeft: 4,
                          },
                          children: {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                width: progressWidth,
                                height: 6,
                                backgroundColor: "#10b981",
                                borderRadius: 3,
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },

                // 底部区域：队长 + 二维码 并排
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "auto",
                      paddingTop: 12,
                      borderTop: "1px solid #f5f5f4",
                    },
                    children: [
                      // 左侧：队长信息
                      ...(hasLeader
                        ? [
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 10,
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
                                            width: 36,
                                            height: 36,
                                            borderRadius: 18,
                                            objectFit: "cover",
                                          },
                                        },
                                      }
                                    : {
                                        type: "div",
                                        props: {
                                          style: {
                                            display: "flex",
                                            width: 36,
                                            height: 36,
                                            borderRadius: 18,
                                            background: "linear-gradient(135deg, #D97706 0%, #FCD34D 100%)",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 12,
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
                                              fontSize: 10,
                                              color: "#a8a29e",
                                            },
                                            children: "队长",
                                          },
                                        },
                                        {
                                          type: "span",
                                          props: {
                                            style: {
                                              display: "flex",
                                              fontSize: 12,
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
                        : [
                            // 无队长时的占位
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
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "#b45309",
                                      },
                                      children: "扫码加入队伍",
                                    },
                                  },
                                  {
                                    type: "span",
                                    props: {
                                      style: {
                                        display: "flex",
                                        fontSize: 10,
                                        color: "#a8a29e",
                                      },
                                      children: "gomate.live",
                                    },
                                  },
                                ],
                              },
                            },
                          ]),

                      // 右侧：二维码（160x160，带白边）
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            padding: 8,
                            backgroundColor: "#ffffff",
                            borderRadius: 12,
                            border: "1px solid #e7e5e4",
                          },
                          children: qrCodeDataUrl
                            ? {
                                type: "img",
                                props: {
                                  src: qrCodeDataUrl,
                                  style: {
                                    display: "flex",
                                    width: 80,
                                    height: 80,
                                  },
                                },
                              }
                            : {
                                type: "div",
                                props: {
                                  style: {
                                    display: "flex",
                                    width: 80,
                                    height: 80,
                                    backgroundColor: "#f5f5f4",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 10,
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
