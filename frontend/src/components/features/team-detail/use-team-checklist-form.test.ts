import { describe, it, expect } from "vitest";
import {
  isValidChecklistDraftShape,
  checklistToForm,
  formToChecklistPayload,
  EMPTY_FORM,
} from "./use-team-checklist-form";

// task #166 P0-A T3: unit tests for the pure helpers of the checklist edit hook.
// Hook effects (localStorage, fetch, save) are covered by integration tests.

describe("isValidChecklistDraftShape", () => {
  it("空对象合法（spread 无副作用）", () => {
    expect(isValidChecklistDraftShape({})).toBe(true);
  });

  it("字符串字段类型正确合法", () => {
    expect(
      isValidChecklistDraftShape({
        meetingPointName: "x",
        transportMode: "self_drive",
        notes: "n",
      }),
    ).toBe(true);
  });

  it("transportMode 允许空串（未选择）", () => {
    expect(isValidChecklistDraftShape({ transportMode: "" })).toBe(true);
  });

  it("transportMode 非枚举值非法", () => {
    expect(isValidChecklistDraftShape({ transportMode: "car" })).toBe(false);
  });

  it("字符串字段类型错 → 非法", () => {
    expect(isValidChecklistDraftShape({ meetingPointName: 123 })).toBe(false);
    expect(isValidChecklistDraftShape({ notes: {} })).toBe(false);
  });

  it("gear 数组必须是 string[]", () => {
    expect(isValidChecklistDraftShape({ gearEssential: ["A", "B"] })).toBe(true);
    expect(isValidChecklistDraftShape({ gearEssential: "A,B" })).toBe(false);
    expect(isValidChecklistDraftShape({ gearOptional: [1, 2] })).toBe(false);
    expect(isValidChecklistDraftShape({ gearOptional: null })).toBe(false);
  });

  it("assignments 必须是 {id,task} 数组", () => {
    expect(
      isValidChecklistDraftShape({
        assignments: [{ id: "u1", task: "带急救包" }],
      }),
    ).toBe(true);
    // 缺 task
    expect(isValidChecklistDraftShape({ assignments: [{ id: "u1" }] })).toBe(false);
    // 混入未知字段
    expect(
      isValidChecklistDraftShape({
        assignments: [{ id: "u1", task: "t", extra: "x" }],
      }),
    ).toBe(false);
    // 非对象元素
    expect(isValidChecklistDraftShape({ assignments: ["t"] })).toBe(false);
  });

  it("顶层未知字段 → 非法（防 spread 污染 form state）", () => {
    expect(isValidChecklistDraftShape({ hacker: "x" })).toBe(false);
  });

  it("非对象 / 数组 / null → 非法", () => {
    expect(isValidChecklistDraftShape(null)).toBe(false);
    expect(isValidChecklistDraftShape([1, 2])).toBe(false);
    expect(isValidChecklistDraftShape("draft")).toBe(false);
    expect(isValidChecklistDraftShape(42)).toBe(false);
  });
});

describe("checklistToForm", () => {
  it("null/undefined 返回空表单", () => {
    expect(checklistToForm(null)).toEqual(EMPTY_FORM);
    expect(checklistToForm(undefined)).toEqual(EMPTY_FORM);
  });

  it("完整 checklist 全字段映射", () => {
    const f = checklistToForm({
      meetingPoint: { name: "口岸 A", time: "07:30", note: "不见不散" },
      transport: { mode: "self_drive", detail: "3 车" },
      gear: { essential: ["登山鞋", "水"], optional: ["登山杖"], note: "队伍备医药包" },
      assignments: [
        { id: "a1", task: "带急救包", assigneeIds: ["u1"] },
        { id: "a2", task: "开车", assigneeIds: [] },
      ],
      notes: "有小孩",
    });
    expect(f.meetingPointName).toBe("口岸 A");
    expect(f.meetingPointTime).toBe("07:30");
    expect(f.transportMode).toBe("self_drive");
    expect(f.gearEssential).toEqual(["登山鞋", "水"]);
    expect(f.gearOptional).toEqual(["登山杖"]);
    expect(f.assignments).toEqual([
      { id: "a1", task: "带急救包", assigneeIds: ["u1"] },
      { id: "a2", task: "开车", assigneeIds: [] },
    ]);
    expect(f.notes).toBe("有小孩");
  });

  it("gear.essential 缺省时使用空数组，不 undefined", () => {
    const f = checklistToForm({ gear: { essential: ["A"], optional: [] } });
    expect(f.gearEssential).toEqual(["A"]);
    expect(f.gearOptional).toEqual([]);
  });
});

describe("formToChecklistPayload", () => {
  it("空表单产出空 payload（overwrite-semantic 会视作全清空）", () => {
    expect(formToChecklistPayload(EMPTY_FORM)).toEqual({});
  });

  it("meetingPoint.name 空 → 整段不产出", () => {
    const payload = formToChecklistPayload({
      ...EMPTY_FORM,
      meetingPointTime: "07:30",
    });
    expect(payload.meetingPoint).toBeUndefined();
  });

  it("transportMode 未选 → transport 不产出（即便 detail 有值也丢）", () => {
    const payload = formToChecklistPayload({
      ...EMPTY_FORM,
      transportDetail: "3 车",
    });
    expect(payload.transport).toBeUndefined();
  });

  it("gear 三个都空 → 不产出；有一个就产出", () => {
    expect(formToChecklistPayload({ ...EMPTY_FORM }).gear).toBeUndefined();
    const p2 = formToChecklistPayload({ ...EMPTY_FORM, gearEssential: ["水"] });
    expect(p2.gear).toEqual({ essential: ["水"], optional: [] });
  });

  it("assignments 空 task 会被过滤", () => {
    const payload = formToChecklistPayload({
      ...EMPTY_FORM,
      assignments: [
        { id: "a1", task: "带急救包", assigneeIds: [] },
        { id: "a2", task: "  ", assigneeIds: [] },
        { id: "a3", task: "开车", assigneeIds: [] },
      ],
    });
    expect(payload.assignments).toEqual([
      { id: "a1", task: "带急救包", assigneeIds: [] },
      { id: "a3", task: "开车", assigneeIds: [] },
    ]);
  });

  // task #166 CR B1：队长编辑其他字段并保存时，已有 assigneeIds 必须原样送回
  it("已有 assigneeIds 透传到 payload（CR B1 数据丢失修复）", () => {
    const payload = formToChecklistPayload({
      ...EMPTY_FORM,
      meetingPointName: "A", // 只改集合点
      assignments: [
        { id: "a1", task: "带急救包", assigneeIds: ["u-alice", "u-bob"] },
        { id: "a2", task: "开车", assigneeIds: ["u-carol"] },
      ],
    });
    expect(payload.assignments).toEqual([
      { id: "a1", task: "带急救包", assigneeIds: ["u-alice", "u-bob"] },
      { id: "a2", task: "开车", assigneeIds: ["u-carol"] },
    ]);
  });

  it("assigneeIds 自动去重", () => {
    const payload = formToChecklistPayload({
      ...EMPTY_FORM,
      assignments: [
        { id: "a1", task: "带急救包", assigneeIds: ["u-alice", "u-alice", "u-bob"] },
      ],
    });
    expect(payload.assignments?.[0].assigneeIds).toEqual(["u-alice", "u-bob"]);
  });

  it("notes trim 后为空 → notes 不产出", () => {
    expect(formToChecklistPayload({ ...EMPTY_FORM, notes: "   " }).notes).toBeUndefined();
  });

  it("完整数据 round-trip 保序", () => {
    const form = {
      ...EMPTY_FORM,
      meetingPointName: "A",
      meetingPointNote: "note",
      transportMode: "public" as const,
      transportDetail: "detail",
      gearEssential: ["水"],
      gearOptional: ["杖"],
      gearNote: "备注",
      assignments: [{ id: "x", task: "T", assigneeIds: ["u-1"] }],
      notes: "N",
    };
    const payload = formToChecklistPayload(form);
    expect(payload).toEqual({
      meetingPoint: { name: "A", note: "note" },
      transport: { mode: "public", detail: "detail" },
      gear: { essential: ["水"], optional: ["杖"], note: "备注" },
      assignments: [{ id: "x", task: "T", assigneeIds: ["u-1"] }],
      notes: "N",
    });
  });
});
