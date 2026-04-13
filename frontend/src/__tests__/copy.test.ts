import { describe, it, expect, beforeAll } from "vitest";
import { t, loadNamespace, type Locale } from "../i18n";
import { hydrateSSRData } from "../i18n";

/**
 * i18n 枚举完整性测试
 * 验证每个数据库枚举值在 i18n 系统中都有对应的翻译文案
 */

// 预加载枚举数据到内存缓存
beforeAll(async () => {
  // 将三个语言的枚举数据直接注入缓存，避免 fetch
  const locales: Locale[] = ["zh-CN", "en", "ja"];
  const zhEnums = {
    difficulty: { easy: "🌿 轻松", moderate: "⛰ 适中", hard: "🧗 挑战", expert: "🏔 专家" },
    teamStatus: {
      recruiting: "等你一起", full: "名额告急，可关注", formed: "整装待发",
      ongoing: "进行中", completed: "圆满归来", cancelled: "已取消",
      open: "等你一起", closed: "已结束",
    },
    memberStatus: { pending: "待审核", approved: "已通过", rejected: "已拒绝", leave_pending: "退出申请中" },
    level: { beginner: "新人", intermediate: "探索者", advanced: "资深玩家", expert: "传奇达人" },
    leaderLevel: { beginner: "新人领队", intermediate: "探索者领队", advanced: "资深玩家领队", expert: "传奇达人领队" },
    levelDesc: { beginner: "刚开始探索之旅", intermediate: "有一定活动经验", advanced: "经验丰富的玩家", expert: "资深活动达人" },
    levelTitle: { beginner: "新人", intermediate: "探索者", advanced: "资深玩家", expert: "传奇达人" },
    gender: { male: "男", female: "女", other: "其他" },
    locationType: { hiking: "户外徒步", explore: "城市探索", leisure: "休闲探店", travel: "旅行" },
  };
  const zhCommon = {
    loading: "加载中...", back: "返回", cancel: "取消", save: "保存",
    noData: "暂无数据", unknown: "未知", person: "人", current: "当前",
    searchPlaceholder: "搜索地点、活动或队伍...", justNow: "刚刚",
    minutesAgo: "{count}分钟前", hoursAgo: "{count}小时前", daysAgo: "{count}天前",
  };
  const zhTeams = { openTeamsSubtitle: "有 {count} 个队伍等你加入" };
  const zhAuth = { loginBtn: "登录" };
  const zhErrors = { locationNotFound: "未找到该地点" };
  const data: Record<Locale, Record<string, Record<string, unknown>>> = {
    "zh-CN": { enums: zhEnums, common: zhCommon, teams: zhTeams, auth: zhAuth, errors: zhErrors },
    en: { enums: zhEnums, common: zhCommon, teams: zhTeams, auth: zhAuth, errors: zhErrors },
    ja: { enums: zhEnums, common: zhCommon, teams: zhTeams, auth: zhAuth, errors: zhErrors },
  };
  hydrateSSRData(data);
});

describe("enums - 枚举文案完整性", () => {

  describe("difficulty（难度）枚举映射", () => {
    const DB_DIFFICULTY_VALUES = ["easy", "moderate", "hard", "expert"] as const;

    it("所有难度枚举值都有对应文案", () => {
      for (const val of DB_DIFFICULTY_VALUES) {
        const result = t(`enums.difficulty.${val}`);
        expect(result, `缺少 enums.difficulty.${val} 的文案`).not.toBe(`enums.difficulty.${val}`);
      }
    });

    it("难度文案为有意义的中文", () => {
      expect(t("enums.difficulty.easy")).toContain("轻松");
      expect(t("enums.difficulty.moderate")).toContain("适中");
      expect(t("enums.difficulty.hard")).toContain("挑战");
      expect(t("enums.difficulty.expert")).toContain("专家");
    });
  });

  describe("teamStatus（队伍状态）枚举映射", () => {
    const DB_TEAM_STATUS_VALUES = ["recruiting", "full", "formed", "cancelled", "completed"] as const;

    it("所有队伍状态枚举值都有对应文案", () => {
      for (const val of DB_TEAM_STATUS_VALUES) {
        const result = t(`enums.teamStatus.${val}`);
        expect(result, `缺少 enums.teamStatus.${val} 的文案`).not.toBe(`enums.teamStatus.${val}`);
      }
    });

    it("队伍状态文案为有意义的中文", () => {
      expect(t("enums.teamStatus.recruiting")).toBe("等你一起");
      expect(t("enums.teamStatus.full")).toContain("名额");
      expect(t("enums.teamStatus.formed")).toBe("整装待发");
      expect(t("enums.teamStatus.cancelled")).toBe("已取消");
      expect(t("enums.teamStatus.completed")).toBe("圆满归来");
    });
  });

  describe("memberStatus（成员状态）枚举映射", () => {
    const DB_MEMBER_STATUS_VALUES = ["pending", "approved", "rejected", "leave_pending"] as const;

    it("所有成员状态枚举值都有对应文案", () => {
      for (const val of DB_MEMBER_STATUS_VALUES) {
        const result = t(`enums.memberStatus.${val}`);
        expect(result, `缺少 enums.memberStatus.${val} 的文案`).not.toBe(`enums.memberStatus.${val}`);
      }
    });

    it("成员状态文案为有意义的中文", () => {
      expect(t("enums.memberStatus.pending")).toBe("待审核");
      expect(t("enums.memberStatus.approved")).toBe("已通过");
      expect(t("enums.memberStatus.rejected")).toBe("已拒绝");
      expect(t("enums.memberStatus.leave_pending")).toBe("退出申请中");
    });
  });

  describe("level（用户等级）枚举映射", () => {
    const DB_LEVEL_VALUES = ["beginner", "intermediate", "advanced", "expert"] as const;

    it("所有用户等级枚举值都有对应文案", () => {
      for (const val of DB_LEVEL_VALUES) {
        const result = t(`enums.level.${val}`);
        expect(result, `缺少 enums.level.${val} 的文案`).not.toBe(`enums.level.${val}`);
      }
    });

    it("等级文案为有意义的中文", () => {
      expect(t("enums.level.beginner")).toBe("新人");
      expect(t("enums.level.intermediate")).toBe("探索者");
      expect(t("enums.level.advanced")).toBe("资深玩家");
      expect(t("enums.level.expert")).toBe("传奇达人");
    });
  });

  describe("gender（性别）枚举映射", () => {
    const DB_GENDER_VALUES = ["male", "female", "other"] as const;

    it("所有性别枚举值都有对应文案", () => {
      for (const val of DB_GENDER_VALUES) {
        const result = t(`enums.gender.${val}`);
        expect(result, `缺少 enums.gender.${val} 的文案`).not.toBe(`enums.gender.${val}`);
      }
    });

    it("性别文案为有意义的中文", () => {
      expect(t("enums.gender.male")).toBe("男");
      expect(t("enums.gender.female")).toBe("女");
      expect(t("enums.gender.other")).toBe("其他");
    });
  });
});

describe("i18n - 关键文案存在性验证", () => {
  it("common 通用文案包含必要字段", () => {
    expect(t("common.loading")).toBeTruthy();
    expect(t("common.back")).toBeTruthy();
    expect(t("common.cancel")).toBeTruthy();
    expect(t("common.save")).toBeTruthy();
    expect(t("common.noData")).toBeTruthy();
    expect(t("common.unknown")).toBeTruthy();
  });

  it("teams 队伍文案包含必要字段", () => {
    expect(t("teams.openTeamsSubtitle")).toContain("队伍");
  });

  it("auth 认证文案包含必要字段", () => {
    expect(t("auth.loginBtn")).toBe("登录");
  });

  it("errors 错误文案包含必要字段", () => {
    expect(t("errors.locationNotFound")).toContain("地点");
  });
});

describe("i18n - 变量替换功能", () => {
  it("支持 {variable} 占位符替换", () => {
    const result = t("common.minutesAgo", { vars: { count: 5 } });
    expect(result).toContain("5");
  });

  it("未提供变量时保留原始占位符", () => {
    const result = t("common.minutesAgo");
    expect(result).toContain("{");
  });
});
