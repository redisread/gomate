import { z } from "../../lib/openapi";

export const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .max(254, "邮箱地址不能超过 254 个字符")
      .email("请输入有效的邮箱地址")
      .transform((value) => value.toLocaleLowerCase("en-US"))
      .describe("邮箱地址，去除首尾空白并归一化为小写。"),
  })
  .strict();

export const signUpEmailSchema = z
  .object({
    email: z
      .string()
      .trim()
      .max(254)
      .email()
      .transform((value) => value.toLocaleLowerCase("en-US"))
      .describe("邮箱地址，去除首尾空白并归一化为小写。"),
    password: z.string().min(8).max(128).describe("登录密码，8–128 字符。"),
    name: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .describe("显示姓名，去除首尾空白后为 1–100 字符。"),
    callbackURL: z
      .string()
      .max(2_048)
      .optional()
      .describe("可选本站回跳地址，须通过服务端允许的返回地址校验。"),
  })
  .strict();

export const signInEmailSchema = z
  .object({
    email: z
      .string()
      .trim()
      .max(254)
      .email()
      .transform((value) => value.toLocaleLowerCase("en-US"))
      .describe("邮箱地址，去除首尾空白并归一化为小写。"),
    password: z.string().min(1).max(128).describe("登录密码，1–128 字符。"),
    callbackURL: z
      .string()
      .max(2_048)
      .optional()
      .describe("可选本站回跳地址，须通过服务端允许的返回地址校验。"),
    rememberMe: z.boolean().optional().describe("是否由认证服务保持登录状态。"),
  })
  .strict();

export const verificationEmailSchema = z
  .object({
    email: z
      .string()
      .trim()
      .max(254)
      .email()
      .transform((value) => value.toLocaleLowerCase("en-US"))
      .describe("邮箱地址，去除首尾空白并归一化为小写。"),
    callbackURL: z
      .string()
      .max(2_048)
      .optional()
      .describe("可选本站回跳地址，须通过服务端允许的返回地址校验。"),
  })
  .strict();

export const emailConfirmationSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(1)
      .max(4_096)
      .describe(
        "邮件链接 fragment 中的令牌，仅通过 JSON body 提交，不放入 URL 查询参数。",
      ),
  })
  .strict();

export const passwordResetSchema = z
  .object({
    newPassword: z.string().min(8).max(128).describe("新密码，8–128 字符。"),
    token: z
      .string()
      .trim()
      .min(1)
      .max(4_096)
      .describe(
        "邮件链接 fragment 中的令牌，仅通过 JSON body 提交，不放入 URL 查询参数。",
      ),
  })
  .strict();

export const googleSignInSchema = z
  .object({
    provider: z.literal("google").describe("仅支持 google。"),
    callbackURL: z
      .string()
      .max(2_048)
      .optional()
      .describe("可选本站回跳页面地址，不允许外部站点。"),
  })
  .strict();
