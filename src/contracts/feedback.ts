import { z } from "zod";

export const FeedbackInputSchema = z
  .object({
    requestId: z
      .uuid()
      .describe(
        "客户端生成的请求 UUID；同一内容重试复用，修改内容或重新提交时生成新值。供应商幂等窗口为 24 小时。",
      ),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(320)
      .email()
      .describe("用于回复的邮箱，去除首尾空白并转换为小写。"),
    content: z
      .string()
      .trim()
      .min(1)
      .max(5000)
      .describe("反馈正文，去除首尾空白后为 1–5000 字符。"),
  })
  .strict();
export type FeedbackInput = z.infer<typeof FeedbackInputSchema>;
