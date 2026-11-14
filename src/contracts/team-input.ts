import { z } from "zod";
import { ACTIVITY_TYPES } from "./enums";
import { offsetDateTimeSchema } from "./input-formats";

const teamDescriptionSchema = z
  .string()
  .trim()
  .max(2_000)
  .nullable()
  .optional()
  .describe("队伍补充说明，可传 null 清空。");

const meetingPointSchema = z
  .string()
  .trim()
  .max(1000)
  .nullable()
  .optional()
  .describe(
    "集合地点说明，最多 1000 字符；null 表示清空，普通访客不可见。",
  );

const activityTypeSchema = z.enum(ACTIVITY_TYPES);
const requirementSchema = z.string().trim().min(1).max(200);
const tagIdsSchema = z
  .array(z.string().trim().min(1).max(100))
  .max(20)
  .transform((values) => [...new Set(values)]);

export const teamInputFields = {
  locationId: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe("活动地点的全局 ID。"),
  activityType: activityTypeSchema.describe(
    "活动类型的稳定枚举值，与地点推荐类型无强制绑定。",
  ),
  title: z.string().trim().min(1).max(100),
  description: teamDescriptionSchema,
  meetingPoint: meetingPointSchema,
  startAt: offsetDateTimeSchema.describe(
    "活动开始时间，必须带时区；创建或修改时须在未来。",
  ),
  endAt: offsetDateTimeSchema.describe(
    "活动结束时间，必须带时区且不早于开始时间。",
  ),
  maxParticipants: z
    .number()
    .int()
    .min(1)
    .max(49)
    .describe(
      "包含队长在内的总人数上限，范围 1–49；修改时不能低于当前有效人数。",
    ),
  requirements: z
    .array(requirementSchema)
    .max(20)
    .describe("参与要求列表，最多 20 条，每条最多 200 字符。"),
  recruitmentStatus: z
    .enum(["open", "closed"])
    .describe(
      "招募开关：open 开放、closed 关闭；实际可报名还取决于时间、取消状态和容量。",
    ),
  tagIds: tagIdsSchema
    .describe("完整标签 ID 列表，最多 20 个；更新时为替换语义，空数组清空。"),
};

export const teamCreateInputSchema = z.object({
  ...teamInputFields,
  requestId: z.uuid().describe("同一次创建操作持久化的 UUID；重试必须复用。"),
  requirements: teamInputFields.requirements.default([]),
  recruitmentStatus: teamInputFields.recruitmentStatus.default("open"),
  tagIds: teamInputFields.tagIds.default([]),
});

/** Inject a clock so the time-dependent boundary can be checked deterministically. */
export function createTeamSchemaWithClock(now: () => number) {
  return teamCreateInputSchema.superRefine((value, ctx) => {
    const startAt = Date.parse(value.startAt);
    const endAt = Date.parse(value.endAt);
    if (startAt <= now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startAt"],
        message: "startAt 必须在未来",
      });
    }
    if (endAt < startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "endAt 不能早于 startAt",
      });
    }
  });
}

export const createTeamSchema = createTeamSchemaWithClock(() => Date.now());
export const updateTeamSchema = z.object(teamInputFields).partial().extend({ expectedVersion: z.number().int().min(1).describe("读取队伍时的版本；陈旧版本返回 409。") }).strict();

export type CreateTeamInput = z.infer<typeof teamCreateInputSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
