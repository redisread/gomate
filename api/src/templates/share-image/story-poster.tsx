import satori from "satori";
import { POSTER_TOKENS } from "./poster-tokens";

interface StoryPosterData {
  title: string;
  summary: string;
  coverImage?: string | null;
  authorName?: string;
  authorAvatar?: string | null;
  locationName?: string;
  qrCodeDataUrl?: string | null;
  fonts: Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>;
}

const T = POSTER_TOKENS;
const C = {
  ...T,
  primaryDark: "#B45309",
  border: "#E7E5E4",
};

export async function renderStoryPoster(data: StoryPosterData): Promise<string> {
  const { title, summary, coverImage, authorName, authorAvatar, locationName, qrCodeDataUrl, fonts } = data;
  const fontFamily = fonts.length > 0 ? fonts[0].name : "system-ui";
  const cleanSummary = summary.length > 100 ? summary.slice(0, 97) + "..." : summary;

  const coverImageElement = coverImage ? {
    type: "div",
    props: {
      style: {
        display: "flex",
        position: "relative",
        marginHorizontal: 16,
        marginTop: 16,
        width: 343,
        height: 180,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#E7E5E4",
      },
      children: [
        // 1. 封面图
        {
          type: "img",
          props: {
            src: coverImage,
            style: {
              display: "flex",
              position: "absolute",
              top: 0,
              left: 0,
              width: 343,
              height: 180,
              objectFit: "cover",
            },
          },
        },
        // 2. sky 顶部冷色蒙版
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
        // 3. sun-glow 底部暖光蒙版
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 120,
              background: "linear-gradient(180deg, rgba(28,25,23,0) 0%, rgba(42,59,92,0.30) 45%, rgba(232,144,48,0.55) 100%)",
            },
          },
        },
      ],
    },
  } : null;

  const svg = await satori(
    // @ts-expect-error - Satori accepts plain object format
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: 375,
          backgroundColor: C.bg,
          fontFamily,
          overflow: "hidden",
        },
        children: [
          // 顶部 4px 琥珀品牌条纹
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                width: 375,
                height: 4,
                background: `linear-gradient(90deg, ${C.primary} 0%, ${C.primaryDark} 100%)`,
              },
            },
          },
          ...(coverImageElement ? [coverImageElement] : []),
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                margin: 16,
                padding: 20,
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
              },
              children: [
                {
                  type: "h1",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: 18,
                      lineHeight: "28px",
                      fontWeight: 700,
                      color: C.title,
                      marginBottom: 8,
                    },
                    children: title,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "row",
                      gap: 6,
                      marginBottom: 12,
                    },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 24,
                            lineHeight: "24px",
                            color: C.sunGlow,
                            fontFamily,
                          },
                          children: "“",
                        },
                      },
                      {
                        type: "p",
                        props: {
                          style: {
                            display: "flex",
                            flex: 1,
                            fontSize: 13,
                            lineHeight: "20px",
                            color: C.body,
                            fontStyle: "italic",
                          },
                          children: cleanSummary,
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: 24,
                            lineHeight: "24px",
                            color: C.sunGlow,
                            fontFamily,
                            alignSelf: "flex-end",
                          },
                          children: "”",
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
                      alignItems: "center",
                      gap: 8,
                      marginBottom: locationName ? 8 : 0,
                    },
                    children: [
                      authorAvatar
                        ? { type: "img", props: { src: authorAvatar, style: { width: 24, height: 24, borderRadius: 12, objectFit: "cover" } } }
                        : {
                            type: "div",
                            props: {
                              style: {
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: C.primary,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              },
                              children: {
                                type: "span",
                                props: { style: { fontSize: 10, color: "white" }, children: authorName?.[0] || "?" },
                              },
                            },
                          },
                      { type: "span", props: { style: { fontSize: 12, color: C.title, fontWeight: 500 }, children: authorName || "匿名" } },
                    ],
                  },
                },
                locationName
                  ? {
                      type: "div",
                      props: {
                        style: { display: "flex", gap: 4, marginBottom: 8 },
                        children: [
                          { type: "span", props: { style: { fontSize: 11, color: C.primary } }, children: "📍" },
                          { type: "span", props: { style: { fontSize: 11, color: C.body }, children: locationName } },
                        ],
                      },
                    }
                  : null,
                qrCodeDataUrl
                  ? { type: "img", props: { src: qrCodeDataUrl, style: { width: 64, height: 64, marginTop: 8, alignSelf: "center" } } }
                  : null,
              ].filter(Boolean),
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "center",
                padding: 8,
                fontSize: 10,
                color: C.muted,
              },
              children: "GoMate - 发现趣处，组队同行",
            },
          },
        ].filter(Boolean),
      },
    },
    { width: 375, fonts }
  );

  return svg;
}
