import satori from "satori";

interface TestTemplateData {
  title: string;
  subtitle: string;
  date: string;
  location: string;
  description: string;
  leaderName: string;
  membersInfo: string;
  fonts: Array<{
    name: string;
    data: ArrayBuffer;
    weight: number;
    style: string;
  }>;
}

/**
 * Phase 1 测试模板
 * Satori 兼容的纯对象格式（避免 JSX 类型问题）
 */
export async function renderTestTemplate(data: TestTemplateData): Promise<string> {
  const { title, subtitle, date, location, description, leaderName, membersInfo, fonts } = data;

  const svg = await satori(
    // @ts-ignore - Satori accepts plain object format
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: 375,
          height: 1000,
          backgroundColor: "#fef3c7",
          padding: 24,
          fontFamily: fonts.length > 0 ? fonts[0].name : "system-ui",
        },
        children: [
          // 标题
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                marginBottom: 20,
              },
              children: {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#92400e",
                    marginBottom: 8,
                  },
                  children: title,
                },
              },
            },
          },

          // 副标题
          {
            type: "div",
            props: {
              style: { display: "flex", marginBottom: 20 },
              children: {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 16, color: "#b45309" },
                  children: subtitle,
                },
              },
            },
          },

          // 日期
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                marginBottom: 12,
                padding: 12,
                backgroundColor: "rgba(255,255,255,0.6)",
                borderRadius: 8,
              },
              children: {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 14, color: "#57534e" },
                  children: `Date: ${date}`,
                },
              },
            },
          },

          // 地点
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                marginBottom: 20,
                padding: 12,
                backgroundColor: "rgba(255,255,255,0.6)",
                borderRadius: 8,
              },
              children: {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 14, color: "#57534e" },
                  children: `Location: ${location}`,
                },
              },
            },
          },

          // 描述
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                marginBottom: 20,
                padding: 16,
                backgroundColor: "rgba(255,255,255,0.4)",
                borderRadius: 12,
              },
              children: {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 14, color: "#44403c" },
                  children: description,
                },
              },
            },
          },

          // 队长
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                marginBottom: 12,
                padding: 12,
                backgroundColor: "rgba(217, 119, 6, 0.1)",
                borderRadius: 8,
              },
              children: {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 14, color: "#92400e" },
                  children: `Leader: ${leaderName}`,
                },
              },
            },
          },

          // 成员
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                marginBottom: 20,
                padding: 12,
                backgroundColor: "rgba(217, 119, 6, 0.1)",
                borderRadius: 8,
              },
              children: {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 14, color: "#92400e" },
                  children: `Members: ${membersInfo}`,
                },
              },
            },
          },

          // 底部信息
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: "auto",
                padding: 20,
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      width: 160,
                      height: 160,
                      backgroundColor: "#e7e5e4",
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    },
                    children: {
                      type: "div",
                      props: {
                        style: { display: "flex", fontSize: 12, color: "#78716c" },
                        children: "QR Code",
                      },
                    },
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { display: "flex", fontSize: 12, color: "#a8a29e", marginBottom: 16 },
                    children: "Scan to join",
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { display: "flex", fontSize: 14, fontWeight: 700, color: "#92400e" },
                    children: "GoMate",
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
      height: 1000,
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
