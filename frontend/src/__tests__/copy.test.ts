import { describe, it, expect } from "vitest";
import { copy } from "../lib/copy";

/**
 * copy.ts 枚举完整性测试
 * 确保每个数据库枚举值都有对应的中文文案，防止新增枚举值时遗漏
 */

describe("copy.enums - 枚举文案完整性", () => {

  describe("difficulty（难度）枚举映射", () => {
    // 与 api/src/db/schema.ts 中 Difficulty 类型对齐
    const DB_DIFFICULTY_VALUES = ["easy", "moderate", "hard", "expert"] as const;

    it("所有难度枚举值都有对应文案", () => {
      for (const val of DB_DIFFICULTY_VALUES) {
        expect(copy.enums.difficulty[val], `缺少 difficulty.${val} 的文案`).toBeTruthy();
        expect(typeof copy.enums.difficulty[val]).toBe("string");
        expect(copy.enums.difficulty[val].length).toBeGreaterThan(0);
      }
    });

    it("难度文案为有意义的中文", () => {
      expect(copy.enums.difficulty.easy).toBe("简单");
      expect(copy.enums.difficulty.moderate).toBe("中等");
      expect(copy.enums.difficulty.hard).toBe("困难");
      expect(copy.enums.difficulty.expert).toBe("专家");
    });
  });

  describe("teamStatus（队伍状态）枚举映射", () => {
    // 与 api/src/db/schema.ts 中 TeamStatus 类型对齐
    const DB_TEAM_STATUS_VALUES = ["recruiting", "full", "formed", "cancelled", "completed"] as const;

    it("所有队伍状态枚举值都有对应文案", () => {
      for (const val of DB_TEAM_STATUS_VALUES) {
        expect(copy.enums.teamStatus[val], `缺少 teamStatus.${val} 的文案`).toBeTruthy();
        expect(typeof copy.enums.teamStatus[val]).toBe("string");
      }
    });

    it("队伍状态文案为有意义的中文", () => {
      expect(copy.enums.teamStatus.recruiting).toBe("招募中");
      expect(copy.enums.teamStatus.full).toBe("已满员");
      expect(copy.enums.teamStatus.formed).toBe("已组建");
      expect(copy.enums.teamStatus.cancelled).toBe("已取消");
      expect(copy.enums.teamStatus.completed).toBe("已完成");
    });
  });

  describe("memberStatus（成员状态）枚举映射", () => {
    // 与 api/src/db/schema.ts 中 TeamMemberStatus 类型对齐
    const DB_MEMBER_STATUS_VALUES = ["pending", "approved", "rejected", "leave_pending"] as const;

    it("所有成员状态枚举值都有对应文案", () => {
      for (const val of DB_MEMBER_STATUS_VALUES) {
        expect(copy.enums.memberStatus[val], `缺少 memberStatus.${val} 的文案`).toBeTruthy();
      }
    });

    it("成员状态文案为有意义的中文", () => {
      expect(copy.enums.memberStatus.pending).toBe("待审核");
      expect(copy.enums.memberStatus.approved).toBe("已通过");
      expect(copy.enums.memberStatus.rejected).toBe("已拒绝");
      expect(copy.enums.memberStatus.leave_pending).toBe("退出申请中");
    });
  });

  describe("level（用户等级）枚举映射", () => {
    // 与 api/src/db/schema.ts 中 UserLevel 类型对齐
    const DB_LEVEL_VALUES = ["beginner", "intermediate", "advanced", "expert"] as const;

    it("所有用户等级枚举值都有对应文案", () => {
      for (const val of DB_LEVEL_VALUES) {
        expect(copy.enums.level[val], `缺少 level.${val} 的文案`).toBeTruthy();
      }
    });

    it("等级文案为有意义的中文", () => {
      expect(copy.enums.level.beginner).toBe("新芽");
      expect(copy.enums.level.intermediate).toBe("破风者");
      expect(copy.enums.level.advanced).toBe("巅峰行者");
      expect(copy.enums.level.expert).toBe("传奇徒步家");
    });
  });

  describe("gender（性别）枚举映射", () => {
    const DB_GENDER_VALUES = ["male", "female", "other"] as const;

    it("所有性别枚举值都有对应文案", () => {
      for (const val of DB_GENDER_VALUES) {
        expect(copy.enums.gender[val], `缺少 gender.${val} 的文案`).toBeTruthy();
      }
    });

    it("性别文案为有意义的中文", () => {
      expect(copy.enums.gender.male).toBe("男");
      expect(copy.enums.gender.female).toBe("女");
      expect(copy.enums.gender.other).toBe("其他");
    });
  });
});

describe("copy - 关键文案存在性验证", () => {
  it("common 通用文案包含必要字段", () => {
    expect(copy.common.loading).toBeTruthy();
    expect(copy.common.back).toBeTruthy();
    expect(copy.common.cancel).toBeTruthy();
    expect(copy.common.save).toBeTruthy();
    expect(copy.common.noData).toBeTruthy();
  });

  it("nav 导航文案包含必要字段", () => {
    expect(copy.nav.home).toBeTruthy();
    expect(copy.nav.locations).toBeTruthy();
    expect(copy.nav.teams).toBeTruthy();
    expect(copy.nav.login).toBeTruthy();
    expect(copy.nav.logout).toBeTruthy();
  });

  it("auth 认证文案包含必要字段", () => {
    expect(copy.auth).toBeDefined();
    // 检查登录相关文案存在
    const authKeys = Object.keys(copy.auth);
    expect(authKeys.length).toBeGreaterThan(0);
  });

  it("errors 错误文案包含必要字段", () => {
    expect(copy.errors).toBeDefined();
    const errorKeys = Object.keys(copy.errors);
    expect(errorKeys.length).toBeGreaterThan(0);
  });

  it("teams 队伍文案包含必要字段", () => {
    expect(copy.teams).toBeDefined();
    const teamsKeys = Object.keys(copy.teams);
    expect(teamsKeys.length).toBeGreaterThan(0);
  });

  it("所有文案值都是非空字符串（无空占位符）", () => {
    // 递归检查所有叶节点文案不为空字符串
    function checkNonEmpty(obj: unknown, path = ""): void {
      if (typeof obj === "string") {
        expect(obj, `文案 ${path} 不应为空字符串`).not.toBe("");
      } else if (typeof obj === "object" && obj !== null) {
        for (const [key, val] of Object.entries(obj)) {
          checkNonEmpty(val, `${path}.${key}`);
        }
      }
    }
    checkNonEmpty(copy);
  });
});
