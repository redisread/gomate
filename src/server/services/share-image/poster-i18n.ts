/**
 * 海报内文案 i18n 查表
 *
 * 当前注入到 Satori 模板的文案。
 * 设计上独立于前端 i18n 体系（前端走 public/locales/{locale}/{ns}.json，
 * 后端在 Worker 运行时无 fs 读取能力），所以这里维护一份内联的小词典。
 *
 * 后期如需要动态切换，可改为在 generateLocationImage 增加 locale 参数
 * 并从外部 JSON 文件（如 R2）加载词典。
 */

export type PosterLocale = "zh-CN" | "en" | "ja";

export interface PosterStrings {
  scanToView: string;
  siteSlogan: string;
  bestSeasonLabel: string;
  brandName: string;
  teamStatusNeed: (count: number) => string;
  teamStatusReady: string;
  teamMemberCount: (current: number, max: number) => string;
  teamDepartureLabel: string;
  teamLocationLabel: string;
  teamLocationPending: string;
  teamMembersLabel: string;
  teamNeedMoreHint: string;
  teamReadyHint: string;
  teamLeaderLabel: string;
  teamLeaderFallback: string;
  teamLeaderInvite: string;
  teamScanJoin: string;
}

// 海报固定显示的爬升/距离/耗时等单位标签
const POSTER_I18N: Record<PosterLocale, PosterStrings> = {
  "zh-CN": {
    scanToView: "扫码查看地点详情",
    siteSlogan: "找到同行的人，出发就不远",
    bestSeasonLabel: "最佳季节",
    brandName: "gomate.live",
    teamStatusNeed: (count) => `还差 ${count} 人成行`,
    teamStatusReady: "队伍已成行",
    teamMemberCount: (current, max) => `${current}/${max} 人`,
    teamDepartureLabel: "出发时间",
    teamLocationLabel: "集合地点",
    teamLocationPending: "目的地待确认",
    teamMembersLabel: "同行伙伴",
    teamNeedMoreHint: "再来几位伙伴，这趟就能出发",
    teamReadyHint: "队伍已达到出发人数，欢迎继续加入",
    teamLeaderLabel: "发起人",
    teamLeaderFallback: "GoMate 用户",
    teamLeaderInvite: "邀请你一起出发",
    teamScanJoin: "扫码加入",
  },
  en: {
    scanToView: "Scan to view location",
    siteSlogan: "Find your trail crew — the journey's never far",
    bestSeasonLabel: "Best Season",
    brandName: "gomate.live",
    teamStatusNeed: (count) => `${count} more people to go`,
    teamStatusReady: "Ready to go",
    teamMemberCount: (current, max) => `${current}/${max} members`,
    teamDepartureLabel: "Departure",
    teamLocationLabel: "Meeting point",
    teamLocationPending: "Destination to be confirmed",
    teamMembersLabel: "Group members",
    teamNeedMoreHint: "A few more people and this trip is ready",
    teamReadyHint: "The group is ready to go — everyone is welcome",
    teamLeaderLabel: "Organizer",
    teamLeaderFallback: "GoMate user",
    teamLeaderInvite: "Inviting you to join the trip",
    teamScanJoin: "Scan to join",
  },
  ja: {
    scanToView: "スキャンしてスポット詳細を表示",
    siteSlogan: "仲間を見つければ、出発はもうすぐ",
    bestSeasonLabel: "ベストシーズン",
    brandName: "gomate.live",
    teamStatusNeed: (count) => `あと${count}人で出発`,
    teamStatusReady: "出発準備完了",
    teamMemberCount: (current, max) => `${current}/${max}人`,
    teamDepartureLabel: "出発時間",
    teamLocationLabel: "集合場所",
    teamLocationPending: "目的地未定",
    teamMembersLabel: "参加メンバー",
    teamNeedMoreHint: "あと少し仲間が集まれば出発できます",
    teamReadyHint: "出発人数に達しました。引き続き参加できます",
    teamLeaderLabel: "主催者",
    teamLeaderFallback: "GoMateユーザー",
    teamLeaderInvite: "一緒に出発しませんか",
    teamScanJoin: "スキャンして参加",
  },
};

export const SUPPORTED_POSTER_LOCALES: PosterLocale[] = ["zh-CN", "en", "ja"];

/**
 * 从 query/header 中提取 locale，默认 zh-CN
 * - 优先 query: ?locale=en
 * - 其次 Accept-Language 头
 */
export function resolvePosterLocale(acceptLanguageHeader: string | null | undefined, queryLocale?: string | null): PosterLocale {
  const candidates = [
    queryLocale,
    ...(acceptLanguageHeader?.split(",").map((part) => part.split(";")[0].trim().toLowerCase()) ?? []),
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (c.startsWith("en")) return "en";
    if (c.startsWith("ja") || c.startsWith("jp")) return "ja";
    if (c.startsWith("zh")) return "zh-CN";
  }
  return "zh-CN";
}

/** 获取指定 locale 的海报文案词典，错回退到 zh-CN */
export function lookupPosterStrings(locale: PosterLocale | string): typeof POSTER_I18N[PosterLocale] {
  return POSTER_I18N[locale as PosterLocale] ?? POSTER_I18N["zh-CN"];
}
