import { z } from "zod";

/**
 * Team「行动本」checklist 类型与通知事件 payload。
 *
 * - checklist 单 JSON 字段而非子表（<2KB，D1 batch 简单）
 * - assignment 用稳定 id（uuid）而非 index，防并发漂移
 * - assigneeIds[] 支持多人认领同一任务；server 端去重
 * - 队长 PUT 覆盖式，队员 POST/DELETE claim 独立路径
 */

/** 集合信息 */
export const ActionbookMeetingPointSchema = z.object({
  name: z.string(),
  /** 集合时间（可选，与队伍开始时间不同才填） */
  time: z.string().optional(),
  note: z.string().optional(),
});
export type ActionbookMeetingPoint = z.infer<
  typeof ActionbookMeetingPointSchema
>;

/** 交通方案 */
export const ActionbookTransportModeSchema = z.enum([
  "self_drive",
  "public",
  "charter",
  "other",
]);
export type ActionbookTransportMode = z.infer<
  typeof ActionbookTransportModeSchema
>;

export const ActionbookTransportSchema = z.object({
  mode: ActionbookTransportModeSchema,
  /** 自由文本：车辆数、拼车联系人或公交路线等 */
  detail: z.string().optional(),
});
export type ActionbookTransport = z.infer<typeof ActionbookTransportSchema>;

/** 装备清单（分级） */
export const ActionbookGearSchema = z.object({
  essential: z.array(z.string()),
  optional: z.array(z.string()),
  note: z.string().optional(),
});
export type ActionbookGear = z.infer<typeof ActionbookGearSchema>;

/**
 * 分工任务。
 * - id 稳定，认领接口按 id 定位（不用 index，防并发漂移）
 * - assigneeIds 支持多人认领；server 负责去重、只允许操作自己
 */
export const ActionbookAssignmentSchema = z.object({
  id: z.string(),
  task: z.string(),
  assigneeIds: z.array(z.string()),
});
export type ActionbookAssignment = z.infer<typeof ActionbookAssignmentSchema>;

/** Team「行动本」checklist 完整结构 */
export const TeamChecklistSchema = z.object({
  meetingPoint: ActionbookMeetingPointSchema.optional(),
  transport: ActionbookTransportSchema.optional(),
  gear: ActionbookGearSchema.optional(),
  assignments: z.array(ActionbookAssignmentSchema).optional(),
  /** 其他约定（自由文本，支持基础 Markdown） */
  notes: z.string().optional(),
});
export type TeamChecklist = z.infer<typeof TeamChecklistSchema>;

// ============================================================================
// 通知钩子事件（T5 合并进 T1，本 spec 只留 payload 类型 + emit 点，不接推送渠道）
// ============================================================================

/** 队长更新 checklist */
export interface ChecklistUpdatedEvent {
  type: "checklist.updated";
  teamId: string;
  actorUserId: string;
  timestamp: number;
}

/** 队员认领/取消认领（合并成一个事件，用 action 区分——减一半推送分支） */
export interface AssignmentClaimChangedEvent {
  type: "assignment.claim_changed";
  action: "claim" | "unclaim";
  teamId: string;
  assignmentId: string;
  actorUserId: string;
  timestamp: number;
}

/**
 * 队伍开始前 24h 触发点（P1 定时任务）。
 * 当前 MVP 不接 cron；此类型仅定义 payload，emit 触发点未接入调度器。
 */
export interface TeamStartingSoonEvent {
  type: "team.starting_soon";
  teamId: string;
  startTime: number;
  timestamp: number;
}

/**
 * 队伍结束后 6h 触发点（P1 定时任务，短复盘引导）。
 * 当前 MVP 不接 cron；此类型仅定义 payload，emit 触发点未接入调度器。
 */
export interface TeamCompletedEvent {
  type: "team.completed";
  teamId: string;
  timestamp: number;
}

export type TeamActionbookEvent =
  | ChecklistUpdatedEvent
  | AssignmentClaimChangedEvent
  | TeamStartingSoonEvent
  | TeamCompletedEvent;
