import satori from "satori";

interface LocationPosterData {
  title: string;
  subtitle?: string | null;
  description: string;
  address?: string | null;
  coverImage?: string | null;
  tags: string[];
  qrCodeDataUrl?: string | null;
  fonts: Array<{
    name: string;
    data: ArrayBuffer;
    weight: number;
    style: string;
  }>;
}

/**
 * 地点分享海报模板
 * 基于 location-poster-content.tsx 设计
 * 尺寸: 375 x auto (约 600-700px)
 */
export async function renderLocationPoster(data: LocationPosterData): Promise<string> {
  const { title, subtitle, description, address, coverImage, tags, qrCodeDataUrl, fonts } = data;

  const fontFamily = fonts.length > 0 ? fonts[0].name : "system-ui";

  // 限制标签数量
  const displayTags = tags.slice(0, 4);

  // 构建标签元素
  const tagElements = displayTags.map((tag) => ({
    type: "div",
    props: {
      style: {
        display: "flex",
        paddingHorizontal: 10,
        paddingVertical: 2,
        backgroundColor: "#FFFBEB",
        border: "1px solid #FCD34D",
        borderRadius: 9999,
        marginRight: 6,
        marginBottom: 6,
      },
      children: {
        type: "span",
        props: {
          style: {
            display: "flex",
            fontSize: 10,
            lineHeight: "16px",
            color: "#92400E",
          },
          children: tag,
        },
      },
    },
  }));

  // 封面图元素
  const coverImageElement = coverImage
    ? {
        type: "div",
        props: {
          style: {
            display: "flex",
            marginHorizontal: 16,
            marginTop: 16,
            borderRadius: 12,
            overflow: "hidden",
          },
          children: {
            type: "img",
            props: {
              src: coverImage,
              style: {
                display: "flex",
                width: 343,
                height: 176,
                objectFit: "cover",
              },
            },
          },
        },
      }
    : null;

  const svg = await satori(
    // @ts-ignore - Satori accepts plain object format
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: 375,
          backgroundColor: "#faf8f5",
          fontFamily,
        },
        children: [
          // 封面图
          ...(coverImageElement ? [coverImageElement] : []),

          // 内容卡片
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                margin: 16,
                marginTop: coverImage ? 16 : 16,
                padding: 20,
                backgroundColor: "rgba(255, 255, 255, 0.85)",
                border: "1px solid #e8e0d7",
                borderRadius: 12,
              },
              children: [
                // 标题
                {
                  type: "h2",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: 16,
                      lineHeight: "24px",
                      fontWeight: 700,
                      color: "#1e1812",
                      margin: 0,
                      marginBottom: 6,
                    },
                    children: title,
                  },
                },

                // 副标题
                ...(subtitle
                  ? [
                      {
                        type: "p",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 12,
                            lineHeight: "18px",
                            color: "#8f7f6e",
                            margin: 0,
                            marginBottom: 12,
                          },
                          children: subtitle,
                        },
                      },
                    ]
                  : []),

                // 描述（简化版，截取前80字符）
                {
                  type: "p",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: 12,
                      lineHeight: "18px",
                      color: "#8f7f6e",
                      margin: 0,
                      marginBottom: 12,
                    },
                    children:
                      description.length > 80
                        ? description.slice(0, 80) + "..."
                        : description,
                  },
                },

                // 标签
                ...(tagElements.length > 0
                  ? [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexWrap: "wrap",
                            marginBottom: 12,
                          },
                          children: tagElements,
                        },
                      },
                    ]
                  : []),

                // 地址
                ...(address
                  ? [
                      {
                        type: "p",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 12,
                            lineHeight: "16px",
                            color: "#8f7f6e",
                            margin: 0,
                            marginBottom: 16,
                          },
                          children: `📍 ${address}`,
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
                      height: 1,
                      backgroundColor: "#e8e0d7",
                      marginVertical: 16,
                    },
                  },
                },

                // QR Code 区域
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                    },
                    children: [
                      // QR Code
                      ...(qrCodeDataUrl
                        ? [
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  width: 88,
                                  height: 88,
                                  padding: 8,
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #e8e0d7",
                                  borderRadius: 8,
                                  marginRight: 16,
                                },
                                children: {
                                  type: "img",
                                  props: {
                                    src: qrCodeDataUrl,
                                    style: {
                                      display: "flex",
                                      width: 72,
                                      height: 72,
                                    },
                                  },
                                },
                              },
                            },
                          ]
                        : []),

                      // 扫码提示文字
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
                                  lineHeight: "16px",
                                  color: "#1e1812",
                                  marginBottom: 4,
                                },
                                children: "扫码查看地点详情",
                              },
                            },
                            {
                              type: "span",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: 10,
                                  color: "#D97706",
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

          // 底部留白
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                height: 20,
              },
            },
          },
        ],
      },
    },
    {
      width: 375,
      height: coverImage ? 640 : 480,
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
