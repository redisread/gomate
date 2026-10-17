import { TeamSchema } from "./index";
import { z } from "zod";

export const TeamResponseSchema = z.object({
  success: z.literal(true),
  team: TeamSchema,
});
export const TeamListResponseSchema = z.object({
  success: z.literal(true),
  teams: z.array(TeamSchema),
  total: z
    .number()
    .describe("符合当前筛选条件的队伍总数，不受当前页游标限制。"),
  nextCursor: z
    .string()
    .nullable()
    .describe("下一页游标；为 null 表示已到末页，客户端无需解析。"),
});
export const TeamSuccessSchema = z.object({ success: z.literal(true) });
export const MyTeamStatusSchema = z.object({
  success: z.literal(true),
  status: z
    .enum(["leader", "member"])
    .nullable()
    .describe("leader 队长、member 有效成员；无上述关系或匿名时为 null。"),
});
export type TeamResponse = z.infer<typeof TeamResponseSchema>;
export type TeamListResponse = z.infer<typeof TeamListResponseSchema>;
export type TeamSuccess = z.infer<typeof TeamSuccessSchema>;
export type MyTeamStatus = z.infer<typeof MyTeamStatusSchema>;
