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
 * 队伍分享海报模板（最简版本 - 用于测试）
 */
export async function renderTeamPosterSimple(data: TeamPosterData): Promise<string> {
  const { title, date, currentMembers, maxMembers, coverImage, leaderAvatar, qrCodeDataUrl, fonts } = data;

  const fontFamily = fonts.length > 0 ? fonts[0].name : "system-ui";
  const hasQR = !!qrCodeDataUrl;
  const hasCover = !!coverImage;
  const hasLeader = !!leaderAvatar;

  const svg = await satori(
    // @ts-expect-error - Satori accepts plain object format
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: 375,
          height: 600,
          backgroundColor: "#ffffff",
          fontFamily,
          padding: 24,
        },
        children: [
          // 封面图
          ...(hasCover
            ? [
                {
                  type: "img",
                  props: {
                    src: coverImage,
                    style: {
                      display: "flex",
                      width: 327,
                      height: 176,
                      objectFit: "cover",
                      marginBottom: 16,
                    },
                  },
                },
              ]
            : []),
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: 24,
                fontWeight: 700,
                color: "#1e1812",
                marginBottom: 16,
              },
              children: title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: 16,
                color: "#8f7f6e",
                marginBottom: 16,
              },
              children: date,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: 14,
                color: "#57534e",
                marginBottom: hasQR || hasLeader ? 16 : 0,
              },
              children: `成员: ${currentMembers}/${maxMembers}`,
            },
          },
          // 队长头像
          ...(hasLeader
            ? [
                {
                  type: "img",
                  props: {
                    src: leaderAvatar,
                    style: {
                      display: "flex",
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      marginBottom: 16,
                    },
                  },
                },
              ]
            : []),
          // 二维码
          ...(hasQR
            ? [
                {
                  type: "img",
                  props: {
                    src: qrCodeDataUrl,
                    style: {
                      display: "flex",
                      width: 80,
                      height: 80,
                    },
                  },
                },
              ]
            : []),
        ],
      },
    },
    {
      width: 375,
      height: 600,
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
